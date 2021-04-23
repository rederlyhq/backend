import * as express from 'express';
import courseController, { ListCoursesFilters, TopicTypeFilters } from './course-controller';
import { authenticationMiddleware, paidMiddleware, userIdMeMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import NotFoundError from '../../exceptions/not-found-error';
import multer = require('multer');
import * as proxy from 'express-http-proxy';
import * as qs from 'qs';
import * as _ from 'lodash';
import configurations from '../../configurations';
import WrappedError from '../../exceptions/wrapped-error';
import { RederlyExpressRequest, EmptyExpressParams, EmptyExpressQuery, asyncHandler } from '../../extensions/rederly-express-request';
import { Constants } from '../../constants';
import Role from '../permissions/roles';
import { PostQuestionMeta, stripSequelizeFromManualEnrollmentResult } from './course-types';
import rendererHelper, { RENDERER_ENDPOINT, GetProblemParameters, RendererResponse } from '../../utilities/renderer-helper';
import bodyParser = require('body-parser');
import IllegalArgumentException from '../../exceptions/illegal-argument-exception';
import ForbiddenError from '../../exceptions/forbidden-error';
import RederlyError from '../../exceptions/rederly-error';
import { getAveragesFromStatistics, StatisticsData, GradingData } from './statistics-helper';
import { rederlyTempFileWrapper } from '../../middleware/rederly-temp-file-wrapper';
import { CourseTopicContentInterface } from '../../database/models/course-topic-content';
import { canUserViewCourse } from '../../middleware/permissions/course-permissions';
import { validationMiddleware } from '../../middleware/validation-middleware';
import { DeepAddIndexSignature } from '../../extensions/typescript-utility-extensions';
import { CourseUnitContentInterface } from '../../database/models/course-unit-content';
import { CourseWWTopicQuestionInterface } from '../../database/models/course-ww-topic-question';
import { CourseInterface } from '../../database/models/course';
import { stripSequelizeFromUpdateResult } from '../../generic-interfaces/sequelize-generic-interfaces';
import { StudentWorkbookInterface } from '../../database/models/student-workbook';
import { StudentEnrollmentInterface } from '../../database/models/student-enrollment';
import courseRepository from './course-repository';
import { CourseQuestionAssessmentInfoInterface } from '../../database/models/course-question-assessment-info';
import { StudentTopicOverrideInterface } from '../../database/models/student-topic-override';

export const router = express.Router();

const fileUpload = multer();

import { coursesPostImportArchive } from '@rederly/backend-validation';
router.post('/:courseId/import-archive',
    authenticationMiddleware,
    validationMiddleware(coursesPostImportArchive),
    paidMiddleware('Importing content from an archive'),
    rederlyTempFileWrapper((tmpFilePath: string) => multer({dest: tmpFilePath}).single('file')),
    asyncHandler<coursesPostImportArchive.IParams, coursesPostImportArchive.IResponse, coursesPostImportArchive.IBody, coursesPostImportArchive.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.file)) {
            throw new IllegalArgumentException('Missing file.');
        }
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const user = req.rederlyUser ?? await req.session.getUser({
            where: {
                active: true
            }
        });

        const result = await courseController.importCourseTarball({
            filePath: req.file.path,
            fileName: req.file.originalname,
            courseId: req.params.id,
            user: user,
            keepBucketsAsTopics: req.query.keepBucketsAsTopics ?? true
        });
        const resp = httpResponse.Ok('Imported', result);
        next(resp);
    }));

import { courseStatisticsGetUnits } from '@rederly/backend-validation';
router.get('/statistics/units',
    authenticationMiddleware,
    validationMiddleware(courseStatisticsGetUnits),
    asyncHandler<courseStatisticsGetUnits.IParams, courseStatisticsGetUnits.IResponse, courseStatisticsGetUnits.IBody, courseStatisticsGetUnits.IQuery>(async (req, _res, next) => {
        try {
            const stats = await courseController.getStatisticsOnUnits({
                where: {
                    courseId: req.query.courseId,
                    userId: req.query.userId,
                    userRole: req.rederlyUserRole ?? Role.STUDENT,
                    topicTypeFilter: req.query.topicTypeFilter as TopicTypeFilters,
                },
                followQuestionRules: !_.isNil(req.query.userId)
            });

            const resp = httpResponse.Ok('Fetched successfully', {
                data: stats.map(stat => stat.get({plain: true}) as StatisticsData),
                ...getAveragesFromStatistics(stats),
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { courseStatisticsGetTopics } from '@rederly/backend-validation';
router.get('/statistics/topics',
    authenticationMiddleware,
    validationMiddleware(courseStatisticsGetTopics),
    asyncHandler<courseStatisticsGetTopics.IParams, courseStatisticsGetTopics.IResponse, courseStatisticsGetTopics.IBody, courseStatisticsGetTopics.IQuery>(async (req, _res, next) => {
        try {
            const stats = await courseController.getStatisticsOnTopics({
                where: {
                    courseUnitContentId: req.query.courseUnitContentId,
                    courseId: req.query.courseId,
                    userId: req.query.userId,
                    userRole: req.rederlyUserRole ?? Role.STUDENT,
                    topicTypeFilter: req.query.topicTypeFilter as TopicTypeFilters
                },
                followQuestionRules: !_.isNil(req.query.userId)
            });

            const resp = httpResponse.Ok('Fetched successfully', {
                data: stats.map(stat => stat.get({plain: true}) as StatisticsData),
                ...getAveragesFromStatistics(stats),
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { courseStatisticsGetQuestions } from '@rederly/backend-validation';
router.get('/statistics/questions',
    authenticationMiddleware,
    validationMiddleware(courseStatisticsGetQuestions),
    asyncHandler<courseStatisticsGetQuestions.IParams, courseStatisticsGetQuestions.IResponse, courseStatisticsGetQuestions.IBody, courseStatisticsGetQuestions.IQuery>(async (req, _res, next) => {
        try {
            const stats = await courseController.getStatisticsOnQuestions({
                where: {
                    courseTopicContentId: req.query.courseTopicContentId,
                    courseId: req.query.courseId,
                    userId: req.query.userId,
                    userRole: req.rederlyUserRole ?? Role.STUDENT,
                },
                followQuestionRules: !_.isNil(req.query.userId)
            });

            const resp = httpResponse.Ok('Fetched successfully', {
                data: stats.map(stat => stat.get({plain: true}) as StatisticsData),
                ...getAveragesFromStatistics(stats),
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { coursesPostDef } from '@rederly/backend-validation';
router.post('/def',
    authenticationMiddleware,
    validationMiddleware(coursesPostDef),
    paidMiddleware('Importing a topic'),
    fileUpload.single('def-file'),
    asyncHandler<coursesPostDef.IParams, coursesPostDef.IResponse, coursesPostDef.IBody, coursesPostDef.IQuery>(async (req, _res, next) => {
        const results = await courseController.createQuestionsForTopicFromDefFileContent({
            webworkDefFileContent: req.file.buffer.toString(),
            courseTopicId: req.query.courseTopicId
        });

        // Sequelize does not give the subobjects that are added after the fact so getting it here
        const adjustedResults = results.map(result => ({
            courseQuestionAssessmentInfo: result.courseQuestionAssessmentInfo?.get({plain: true}) as CourseQuestionAssessmentInfoInterface | undefined,
            ...result.get({plain:true}) as CourseWWTopicQuestionInterface
        }));
        const resp = httpResponse.Created('Course Topic from DEF file created successfully', {
            newQuestions: adjustedResults
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesPostCourses } from '@rederly/backend-validation';
router.post('/',
    authenticationMiddleware,
    validationMiddleware(coursesPostCourses),
    paidMiddleware('Creating a new course'),
    asyncHandler<coursesPostCourses.IParams, coursesPostCourses.IResponse, coursesPostCourses.IBody, coursesPostCourses.IQuery>(async (req, _res, next) => {
        try {
            if (_.isNil(req.session)) {
                throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
            }
            const session = req.session;
            const user = await session.getUser();
            const university = await user.getUniversity();
    
            const newCourse = await courseController.createCourse({
                object: {
                    instructorId: user.id,
                    universityId: university.id,
                    ...req.body
                }
            });
    
            const resp = httpResponse.Created('Course created successfully', newCourse.get({plain: true}) as CourseInterface);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { coursesPostUnit } from '@rederly/backend-validation';
router.post('/unit',
    authenticationMiddleware,
    validationMiddleware(coursesPostUnit),
    paidMiddleware('Adding units'),
    asyncHandler<coursesPostUnit.IParams, coursesPostUnit.IResponse, coursesPostUnit.IBody, coursesPostUnit.IQuery>(async (req, _res, next) => {
        try {
            const newUnit = await courseController.createUnit({
                ...req.body
            });
            // TODO handle not found case
            const resp = httpResponse.Created('Course Unit created successfully', newUnit.get({plain: true}) as CourseUnitContentInterface);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

// TOMTOM, router

import { coursesGetGrades } from '@rederly/backend-validation';
router.get('/grades',
    authenticationMiddleware,
    validationMiddleware(coursesGetGrades),
    userIdMeMiddleware('query.userId'),
    asyncHandler<coursesGetGrades.IParams, coursesGetGrades.IResponse, coursesGetGrades.IBody, coursesGetGrades.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.rederlyUser)) {
            throw new ForbiddenError('You must be logged in to access grades.');
        }

        const grades = await courseController.getGrades({
            where: {
                courseId: req.query.courseId,
                questionId: req.query.questionId,
                topicId: req.query.topicId,
                unitId: req.query.unitId,
                topicTypeFilter: req.query.topicTypeFilter as TopicTypeFilters | undefined,
                userId: req.query.userId === 'me' ? req.rederlyUser.id : req.query.userId,
            },
            userRole: req.rederlyUserRole ?? Role.STUDENT,
        });
        const resp = httpResponse.Ok('Fetched successfully', grades.map(grade => grade.get({plain: true}) as GradingData));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesGetTopicGrades } from '@rederly/backend-validation';
router.get('/:courseId/topic-grades',
    authenticationMiddleware,
    validationMiddleware(coursesGetTopicGrades),
    asyncHandler<coursesGetTopicGrades.IParams, coursesGetTopicGrades.IResponse, coursesGetTopicGrades.IBody, coursesGetTopicGrades.IQuery>(async (req, _res, next) => {
        const topics = await courseController.getGradesForTopics({
            courseId: req.params.id,
        });

        const resp = httpResponse.Ok('Fetched successfully', {
            topics: topics
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));



// TOMTOM
import { router as assessmentRouter } from './routes/assessment-routes';
router.use('/', assessmentRouter);

import { coursesDeleteUnitById } from '@rederly/backend-validation';
router.delete('/unit/:id',
    authenticationMiddleware,
    validationMiddleware(coursesDeleteUnitById),
    paidMiddleware('Deleting units'),
    asyncHandler<coursesDeleteUnitById.IParams, coursesDeleteUnitById.IResponse, coursesDeleteUnitById.IBody, coursesDeleteUnitById.IQuery>(async (req, _res, next) => {
        try {
            const updatesResult = await courseController.softDeleteUnits({
                id: req.params.id
            });
            // TODO handle not found case
            const resp = httpResponse.Ok('Deleted units and subobjects successfully', stripSequelizeFromUpdateResult<Omit<CourseUnitContentInterface, 'topics'> & {
                topics: (Omit<CourseTopicContentInterface, 'questions' | 'studentTopicOverride'> & {
                    questions: CourseWWTopicQuestionInterface[];
                    studentTopicOverride: StudentTopicOverrideInterface[];
                })[];
            }>(updatesResult));
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));



import { coursesPutUnitById } from '@rederly/backend-validation';
router.put('/unit/:id',
    authenticationMiddleware,
    validationMiddleware(coursesPutUnitById),
    paidMiddleware('Updating units'),
    asyncHandler<coursesPutUnitById.IParams, coursesPutUnitById.IResponse, coursesPutUnitById.IBody, coursesPutUnitById.IQuery>(async (req, _res, next) => {
        try {
            const updatedRecords = await courseController.updateCourseUnit({
                where: {
                    id: req.params.id
                },
                updates: {
                    ...req.body
                }
            });
            // TODO handle not found case
            const resp = httpResponse.Ok('Updated unit successfully', stripSequelizeFromUpdateResult<CourseUnitContentInterface>({
                updatedRecords: updatedRecords,
                updatedCount: updatedRecords.length
            }));
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { coursesPutCoursesById } from '@rederly/backend-validation';
router.put('/:id',
    authenticationMiddleware,
    validationMiddleware(coursesPutCoursesById),
    paidMiddleware('Modifying courses'),
    asyncHandler<coursesPutCoursesById.IParams, coursesPutCoursesById.IResponse, coursesPutCoursesById.IBody, coursesPutCoursesById.IQuery>(async (req, _res, next) => {
        try {
            const updatesResult = await courseController.updateCourse({
                where: {
                    id: req.params.id
                },
                updates: {
                    ...req.body
                }
            });
            // TODO handle not found case
            const resp = httpResponse.Ok('Updated course successfully', stripSequelizeFromUpdateResult<CourseInterface>({
                updatedRecords: updatesResult,
                updatedCount: updatesResult.length
            }));
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { coursesPostPreview } from '@rederly/backend-validation';
//TODO: Probably move this up?
router.post('/preview',
    authenticationMiddleware,
    // TODO investigate if this is a problem
    // if the body were to be consumed it should hang here
    bodyParser.raw({
        type: '*/*'
    }),
    validationMiddleware(coursesPostPreview),
    // Before this wasn't being strongly typed, it is based on the other one but uses dummy data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler<coursesPostPreview.IParams, coursesPostPreview.IResponse | undefined, coursesPostPreview.IBody, coursesPostPreview.IQuery, any>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();
        const rederlyUserRole = req.rederlyUserRole ?? user.roleId;
        if (rederlyUserRole === Role.STUDENT) throw new ForbiddenError('Preview is not available.');

        if (!_.isNil(req.body) && !_.isEmpty(req.body)) {
            req.meta = {
                rendererParams: {
                    outputformat: rendererHelper.getOutputFormatForRole(Role.PROFESSOR),
                    permissionLevel: rendererHelper.getPermissionForRole(Role.PROFESSOR),
                    showSolutions: Number(1),
                },
                studentGrade: {
                    numAttempts: 0,
                    randomSeed: req.query.problemSeed,
                },
                courseQuestion: {
                    webworkQuestionPath: req.query.webworkQuestionPath
                },
            };
            return next(undefined);
        }
        if (_.isNil(req.query.webworkQuestionPath)) {
            throw new Error('Missing required field');
        }
        try {
            const question = await courseController.previewQuestion({
                webworkQuestionPath: req.query.webworkQuestionPath,
                problemSeed: req.query.problemSeed,
                formURL: req.originalUrl,
                formData: {},
                role: rederlyUserRole,
                showAnswersUpfront: req.query.showAnswersUpfront,
            });
            const resp = httpResponse.Ok('Fetched question successfully', question);
            next(resp as DeepAddIndexSignature<typeof resp>);


            // If testing renderer integration from the browser without the front end simply return the rendered html
            // To do so first uncomment the below res.send and comment out the above next
            // Also when in the browser console add your auth token (`document.cookie = "sessionToken=UUID;`)
            // Don't forget to do this in post as well
            // res.send(question.rendererData.renderedHTML);
        } catch (e) {
            next(e);
        }
    }),
    proxy(configurations.renderer.url, {
        proxyReqPathResolver: (req: RederlyExpressRequest<EmptyExpressParams, coursesPostPreview.IResponse, coursesPostPreview.IBody, EmptyExpressQuery, PostQuestionMeta>) => {
            if (_.isNil(req.meta)) {
                throw new Error('Previously fetched metadata is nil');
            }
            const rendererParams: GetProblemParameters = {
                format: 'json',
                formURL: req.originalUrl,
                baseURL: '/',
                ...req.meta?.rendererParams,
                numIncorrect: req.meta.studentGrade?.numAttempts,
                problemSeed: req.meta.studentGrade?.randomSeed
            };
            return `${RENDERER_ENDPOINT}?${qs.stringify(rendererParams)}`;
        },
        userResDecorator: async (proxyRes, proxyResData, userReq: RederlyExpressRequest<EmptyExpressParams, coursesPostPreview.IResponse, coursesPostPreview.IBody, EmptyExpressQuery, PostQuestionMeta>) => {
            if (_.isNil(userReq.session)) {
                throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
            }

            if (_.isNil(userReq.meta)) {
                throw new Error('Previously fetched metadata is nil');
            }

            const data = proxyResData.toString('utf8');
            if (proxyRes.statusCode >= 400) {
                throw new RederlyError(`Renderer preview responded with error ${proxyRes.statusCode}: ${data}`);
            }

            let rendererResponse: RendererResponse | null = null;
            try {
                rendererResponse = await rendererHelper.parseRendererResponse(data, {
                    questionPath: userReq.meta.courseQuestion.webworkQuestionPath,
                    questionRandomSeed: userReq.meta.studentGrade?.randomSeed
                });
            } catch (e) {
                throw new WrappedError(`Error parsing data response from renderer on question ${userReq.meta?.studentGrade?.courseWWTopicQuestionId} for grade ${userReq.meta?.studentGrade?.id}`, e);
            }

            const resp = httpResponse.Ok('Answer submitted for question', {
                rendererData: rendererHelper.cleanRendererResponseForTheResponse(rendererResponse),
            });
            // next(resp as DeepAddIndexSignature<typeof resp>);
            // There is no way to get next callback, however anything thrown will get sent to next
            // Using the below line will responde with a 201 the way we do in our routes
            throw resp;

            // If testing renderer integration from the browser without the front end simply return the rendered html
            // To do so first uncomment the below return and comment out the above throw
            // Also when in the browser console add your auth token (`document.cookie = "sessionToken=UUID;`)
            // Don't forget to do this in get as well
            // TODO switch back to json response, right now we don't use the extra data and the iframe implementation requires html passed back
            // return data.renderedHTML;
        }
    }));

import { coursesGetCourses } from '@rederly/backend-validation';
router.get('/',
    authenticationMiddleware,
    validationMiddleware(coursesGetCourses),
    asyncHandler<coursesGetCourses.IParams, coursesGetCourses.IResponse, coursesGetCourses.IBody, coursesGetCourses.IQuery>(async (req, _res, next) => {
        const courses = await courseController.getCourses({
            filter: {
                instructorId: req.query.instructorId,
                enrolledUserId: req.query.enrolledUserId,
                filterOptions: req.query.filterOptions as ListCoursesFilters,
            }
        });
        const resp = httpResponse.Ok('Fetched successfully', courses.map(course => course.get({plain: true}) as CourseInterface));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

// TOMTOM
import { router as browseProblemsRouter } from './routes/browse-problems-routes';
router.use('/', browseProblemsRouter);



import { coursesPostEmail } from '@rederly/backend-validation';
router.post('/:id/email',
    authenticationMiddleware,
    validationMiddleware(coursesPostEmail),
    asyncHandler<coursesPostEmail.IParams, coursesPostEmail.IResponse, coursesPostEmail.IBody, coursesPostEmail.IQuery>(async (req, res, next) => {

        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();

        const baseURL = req.headers['rederly-origin'] as string | undefined; // need this because it incorrectly thinks it can be an array
        if (_.isNil(baseURL)) {
            throw new IllegalArgumentException('rederly-origin is required in the request');
        }
        const result = await courseController.emailProfessor({
            courseId: req.params.id,
            content: req.body.content,
            question: req.body.question,
            student: user,
            baseURL: baseURL,
        });
        const resp = httpResponse.Ok('Your message was sent to your professor.', result);
        next(resp as DeepAddIndexSignature<typeof resp>);
    })
);

import { coursesGetCoursesById } from '@rederly/backend-validation';
router.get('/:id',
    authenticationMiddleware,
    validationMiddleware(coursesGetCoursesById),
    asyncHandler<coursesGetCoursesById.IParams, undefined, coursesGetCoursesById.IBody, coursesGetCoursesById.IQuery>(async (req, _res, next) => {
        try {
            const userIdForExtensions = req.rederlyUserRole === Role.STUDENT ? req.session?.userId : undefined;
            req.course = await courseController.getCourseById(req.params.id, userIdForExtensions);
            next(undefined);
        } catch (e) {
            next(e);
        }
    }),
    canUserViewCourse,
    asyncHandler<coursesGetCoursesById.IParams, coursesGetCoursesById.IResponse, coursesGetCoursesById.IBody, coursesGetCoursesById.IQuery>(async (req, _res, next) => {
        if(_.isNil(req.course)) {
            throw new RederlyError('TSNH, course should have already been fetched');
        }

        const university = await req.course.getUniversity({
            where: {
                active: true,
            }
        });
        const canAskForHelp = university?.universityName === 'CityTech' ?? false;
        const resp = httpResponse.Ok('Fetched successfully', {
            ...req.course.get({plain: true}) as Omit<CourseInterface, 'units'> & {
                units: (Omit<CourseUnitContentInterface, 'topics'> & {
                    topics: CourseTopicContentInterface[];
                })[];
            },
            canAskForHelp,
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    })
);

import { coursesPostEnroll } from '@rederly/backend-validation';
router.post('/enroll',
    authenticationMiddleware,
    validationMiddleware(coursesPostEnroll),
    asyncHandler<coursesPostEnroll.IParams, coursesPostEnroll.IResponse, coursesPostEnroll.IBody, coursesPostEnroll.IQuery>(async (req, _res, next) => {
        try {
            if (_.isNil(req.body.userId) === _.isNil(req.body.studentEmail)) {
                throw new IllegalArgumentException('Enrollment requires either userId or studentEmail, not both, not neither');
            } else if (!_.isNil(req.body.userId)) {
                const enrollment = await courseController.enrollManually({
                    userId: req.body.userId,
                    courseId: req.body.courseId
                });
                const resp = httpResponse.Ok('Enrolled', stripSequelizeFromManualEnrollmentResult(enrollment));
                next(resp as DeepAddIndexSignature<typeof resp>);    
            } else if (!_.isNil(req.body.studentEmail)) {
                const enrollment = await courseController.enrollManually({
                    studentEmail: req.body.studentEmail,
                    courseId: req.body.courseId
                });
                const resp = httpResponse.Ok('Enrolled', stripSequelizeFromManualEnrollmentResult(enrollment));
                next(resp as DeepAddIndexSignature<typeof resp>);
            } else {
                throw new RederlyError('Enroll: Strict type checking error handling lead to impossible situation');
            }
        } catch (e) {
            if (e instanceof NotFoundError) {
                // const resp = Boom.notFound(e.message);
                const resp = httpResponse.BadRequest(e.message, null);
                // next(resp as DeepAddIndexSignature<typeof resp>);
                next(resp);
            } else {
                next(e);
            }
        }
    }));

import { coursesPostEnrollByCode } from '@rederly/backend-validation';
router.post('/enroll/:code',
    authenticationMiddleware,
    validationMiddleware(coursesPostEnrollByCode),
    asyncHandler<coursesPostEnrollByCode.IParams, coursesPostEnrollByCode.IResponse, coursesPostEnrollByCode.IBody, coursesPostEnrollByCode.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }


        const session = req.session;

        // TODO remove once we have elevated permissions
        if (_.isNil(req.rederlyUser)) {
            throw new Error('Enroll by code: Rederly user is missing');
        }
        
        if (req.rederlyUser.roleId === Role.PROFESSOR) {
            throw new IllegalArgumentException('Professors can not enroll by code');
        }

        try {
            const enrollment = await courseController.enrollByCode({
                code: req.params.code,
                userId: session.userId
            });
            const resp = httpResponse.Ok('Enrolled', enrollment.get({plain: true}) as StudentEnrollmentInterface);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            if (e instanceof NotFoundError) {
                const resp = httpResponse.BadRequest(e.message, null);
                next(resp);    
            } else {
                next(e);
            }
        }
    }));

import { coursesDeleteEnroll } from '@rederly/backend-validation';
router.delete('/enroll',
    authenticationMiddleware,
    validationMiddleware(coursesDeleteEnroll),
    paidMiddleware('Un-enrolling users'),
    asyncHandler<coursesDeleteEnroll.IParams, coursesDeleteEnroll.IResponse, coursesDeleteEnroll.IBody, coursesDeleteEnroll.IQuery>(async (req, _res, next) => {
        try {
            const success = await courseController.softDeleteEnrollment({
                ...req.body,
            });
            const resp = httpResponse.Ok('Student was dropped', success);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            if (e instanceof NotFoundError) {
                const resp = httpResponse.BadRequest(e.message, null);
                next(resp);    
            } else {
                next(e);
            }
        }
    }));

// TOMTOM
import { router as attachmentRouter } from './routes/attachments-routes';
router.use('/', attachmentRouter);

// TOMTOM
import { router as questionRouter } from './routes/question-routes';
router.use('/', questionRouter);

import { courseWorkbookPostFeedback } from '@rederly/backend-validation';
router.post('/workbook/:workbookId/feedback', 
    authenticationMiddleware,
    validationMiddleware(courseWorkbookPostFeedback),
    asyncHandler<courseWorkbookPostFeedback.IParams, courseWorkbookPostFeedback.IResponse, courseWorkbookPostFeedback.IBody, courseWorkbookPostFeedback.IQuery>(async (req, _res, next) => {
        const res = await courseController.addFeedback({
            content: req.body.content,
            workbookId: req.params.workbookId,
        });

        const resp = httpResponse.Ok('Feedback saved', stripSequelizeFromUpdateResult<StudentWorkbookInterface>(res));
        next(resp as DeepAddIndexSignature<typeof resp>);
    })
);

// TODO implement validations middleware below 
import { courseWorkbookUploadPostFeedback } from '@rederly/backend-validation';
router.post('/upload/workbook/:workbookId/feedback',
    authenticationMiddleware,
    validationMiddleware(courseWorkbookUploadPostFeedback),
    asyncHandler<courseWorkbookUploadPostFeedback.IParams, courseWorkbookUploadPostFeedback.IResponse, courseWorkbookUploadPostFeedback.IBody, courseWorkbookUploadPostFeedback.IQuery>(async (req, _res, next) => {
        // TODO permission to check if user has access to the provided grade or grade instance
        const result = await courseRepository.createWorkbookFeedbackAttachment(req.body.attachment, req.params.workbookId);
        next(httpResponse.Ok('Attachment record created', result));
    }));

import { courseTopicUploadPostFeedback } from '@rederly/backend-validation';
router.post('/upload/topic/:topicId/feedback',
    authenticationMiddleware,
    validationMiddleware(courseTopicUploadPostFeedback),
    asyncHandler<courseTopicUploadPostFeedback.IParams, courseTopicUploadPostFeedback.IResponse, courseTopicUploadPostFeedback.IBody, courseTopicUploadPostFeedback.IQuery>(async (req, _res, next) => {
        // TODO permission to check if user has access to the provided grade or grade instance
        const result = await courseRepository.createTopicFeedbackAttachment(req.body.attachment, req.params.topicId, req.body.userId);
        next(httpResponse.Ok('Attachment record created', result));
    }));

import { courseTopicUploadPostDescription } from '@rederly/backend-validation';
router.post('/upload/topic/:topicId/description',
    authenticationMiddleware,
    validationMiddleware(courseTopicUploadPostDescription),
    asyncHandler<courseTopicUploadPostDescription.IParams, courseTopicUploadPostDescription.IResponse, courseTopicUploadPostDescription.IBody, courseTopicUploadPostDescription.IQuery>(async (req, _res, next) => {
        // TODO permission to check if user has access to the provided grade or grade instance
        const result = await courseRepository.createTopicDescriptionAttachment(req.body.attachment, req.params.topicId);
        next(httpResponse.Ok('Attachment record created', result));
    }));

import { courseFeedbackGetUserByUserId } from '@rederly/backend-validation';
router.get('/feedback/topic/:topicId/user/:userId',
    authenticationMiddleware,
    validationMiddleware(courseFeedbackGetUserByUserId),
    asyncHandler<courseFeedbackGetUserByUserId.IParams, courseFeedbackGetUserByUserId.IResponse, courseFeedbackGetUserByUserId.IBody, courseFeedbackGetUserByUserId.IQuery>(async (req, _res, next) => {
        const result = await courseRepository.getTopicFeedback({
            topicId: req.params.topicId,
            userId: req.params.userId,
        });
        next(httpResponse.Ok('Returning Topic Feedback', result));
    })
);

import { courseFeedbackPostUserByUserId } from '@rederly/backend-validation';
router.post('/feedback/topic/:topicId/user/:userId',
    authenticationMiddleware,
    validationMiddleware(courseFeedbackPostUserByUserId),
    asyncHandler<courseFeedbackPostUserByUserId.IParams, courseFeedbackPostUserByUserId.IResponse, courseFeedbackPostUserByUserId.IBody, courseFeedbackPostUserByUserId.IQuery>(async (req, _res, next) => {
        const result = await courseRepository.createTopicFeedback({
            topicId: req.params.topicId,
            userId: req.params.userId,
            feedback: req.body.content,
        });
        next(httpResponse.Ok('Topic Feedback created', result));
    })
);
