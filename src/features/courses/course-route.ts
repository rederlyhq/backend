import * as express from 'express';
import { Response } from 'express';
import courseController from './course-controller';
import { authenticationMiddleware, paidMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import * as asyncHandler from 'express-async-handler';
import NotFoundError from '../../exceptions/not-found-error';
import multer = require('multer');
import * as proxy from 'express-http-proxy';
import * as qs from 'qs';
import * as _ from 'lodash';
import configurations from '../../configurations';
import WrappedError from '../../exceptions/wrapped-error';
type TypedNextFunction<THISISTEMP> = (arg?: any) => void;
import { RederlyExpressRequest, EmptyExpressParams, EmptyExpressQuery } from '../../extensions/rederly-express-request';
import { GetStatisticsOnUnitsRequest, GetStatisticsOnTopicsRequest, GetStatisticsOnQuestionsRequest, CreateCourseRequest, CreateCourseUnitRequest, GetGradesRequest, GetQuestionsRequest, UpdateCourseTopicRequest, UpdateCourseUnitRequest, CreateCourseTopicQuestionRequest, GetQuestionRequest, ListCoursesRequest, GetTopicsRequest, GetCourseRequest, EnrollInCourseRequest, EnrollInCourseByCodeRequest, UpdateCourseRequest, UpdateCourseTopicQuestionRequest, CreateQuestionsForTopicFromDefFileRequest, DeleteCourseUnitRequest, DeleteCourseTopicRequest, DeleteCourseQuestionRequest, UpdateGradeRequest, DeleteEnrollmentRequest, ExtendCourseTopicForUserRequest, GetTopicRequest, ExtendCourseTopicQuestionRequest, CreateAssessmentVersionRequest, SubmitAssessmentVersionRequest, UpdateGradeInstanceRequest, EndAssessmentVersionRequest, PreviewQuestionRequest, GradeAssessmentRequest, GetAttachmentPresignedURLRequest, PostAttachmentRequest, ListAttachmentsRequest, DeleteAttachmentRequest, EmailProfRequest, ReadQuestionRequest, SaveQuestionRequest, CatalogRequest, GetVersionRequest, GetQuestionRawRequest, GetQuestionGradeRequest, PostImportCourseArchiveRequest, GetQuestionOpenLabRequest, UploadAssetRequest, GetQuestionShowMeAnotherRequest, BrowseProblemsCourseListRequest, BrowseProblemsSearchRequest, BrowseProblemsTopicListRequest, BrowseProblemsUnitListRequest, BulkExportRequest, EndBulkExportRequest, GetGradesForTopicsByCourseRequest, PostFeedbackRequest } from './course-route-request-types';
import Boom = require('boom');
import { Constants } from '../../constants';
import Role from '../permissions/roles';
import { PostQuestionMeta, stripSequelizeFromManualEnrollmentResult } from './course-types';
import rendererHelper, { RENDERER_ENDPOINT, GetProblemParameters, RendererResponse } from '../../utilities/renderer-helper';
import StudentGrade, { StudentGradeInterface } from '../../database/models/student-grade';
import bodyParser = require('body-parser');
import IllegalArgumentException from '../../exceptions/illegal-argument-exception';
import logger from '../../utilities/logger';
import ForbiddenError from '../../exceptions/forbidden-error';
import AttemptsExceededException from '../../exceptions/attempts-exceeded-exception';
import attachmentHelper from '../../utilities/attachments-helper';
import urljoin = require('url-join');
import RederlyError from '../../exceptions/rederly-error';
import openLabHelper from '../../utilities/openlab-helper';
import { getAveragesFromStatistics } from './statistics-helper';
import { rederlyTempFileWrapper } from '../../middleware/rederly-temp-file-wrapper';
import ExportPDFHelper from '../../utilities/export-pdf-helper';
import CourseTopicContent, { CourseTopicContentInterface } from '../../database/models/course-topic-content';
import { canUserViewCourse } from '../../middleware/permissions/course-permissions';
import { validationMiddleware, ValidationMiddlewareOptions } from '../../middleware/validation-middleware';
import { DeepAddIndexSignature } from '../../extensions/typescript-utility-extensions';
import { CourseUnitContentInterface } from '../../database/models/course-unit-content';
import { CourseWWTopicQuestionInterface } from '../../database/models/course-ww-topic-question';
import { CourseInterface } from '../../database/models/course';
import { stripSequelizeFromUpsertResult, stripSequelizeFromUpdateResult } from '../../generic-interfaces/sequelize-generic-interfaces';
import { StudentTopicOverrideInterface } from '../../database/models/student-topic-override';
import { TopicAssessmentInfoInterface } from '../../database/models/topic-assessment-info';
import { StudentTopicAssessmentInfoInterface } from '../../database/models/student-topic-assessment-info';
import { StudentGradeInstanceInterface } from '../../database/models/student-grade-instance';
import { StudentTopicQuestionOverrideInterface } from '../../database/models/student-topic-question-override';
import { StudentWorkbookInterface } from '../../database/models/student-workbook';

const router = express.Router();

const fileUpload = multer();

import { coursesPostImportArchive } from '@rederly/backend-validation';
router.post('/:courseId/import-archive',
    authenticationMiddleware,
    validationMiddleware(coursesPostImportArchive),
    paidMiddleware('Importing content from an archive'),
    rederlyTempFileWrapper((tmpFilePath: string) => multer({dest: tmpFilePath}).single('file')),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPostImportArchive.IResponse, PostImportCourseArchiveRequest.body, PostImportCourseArchiveRequest.query>, _res: Response<coursesPostImportArchive.IResponse>, next: TypedNextFunction<coursesPostImportArchive.IResponse>) => {
        if (_.isNil(req.file)) {
            throw new IllegalArgumentException('Missing file.');
        }
        const params = req.params as PostImportCourseArchiveRequest.params;
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
            courseId: params.courseId,
            user: user,
            keepBucketsAsTopics: req.query.keepBucketsAsTopics ?? true
        });
        const resp = httpResponse.Ok('Imported', result);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseStatisticsGetUnits } from '@rederly/backend-validation';
router.get('/statistics/units',
    authenticationMiddleware,
    validationMiddleware(courseStatisticsGetUnits),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseStatisticsGetUnits.IResponse, GetStatisticsOnUnitsRequest.body, GetStatisticsOnUnitsRequest.query>, _res: Response<courseStatisticsGetUnits.IResponse>, next: TypedNextFunction<courseStatisticsGetUnits.IResponse>) => {
        try {
            const stats = await courseController.getStatisticsOnUnits({
                where: {
                    courseId: req.query.courseId,
                    userId: req.query.userId,
                    userRole: req.rederlyUserRole ?? Role.STUDENT,
                },
                followQuestionRules: !_.isNil(req.query.userId)
            });

            const resp = httpResponse.Ok('Fetched successfully', {
                data: stats.map(stat => stat.get({plain: true}) as CourseUnitContentInterface),
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseStatisticsGetTopics.IResponse, GetStatisticsOnTopicsRequest.body, GetStatisticsOnTopicsRequest.query>, _res: Response<courseStatisticsGetTopics.IResponse>, next: TypedNextFunction<courseStatisticsGetTopics.IResponse>) => {
        try {
            const stats = await courseController.getStatisticsOnTopics({
                where: {
                    courseUnitContentId: req.query.courseUnitContentId,
                    courseId: req.query.courseId,
                    userId: req.query.userId,
                    userRole: req.rederlyUserRole ?? Role.STUDENT,
                },
                followQuestionRules: !_.isNil(req.query.userId)
            });

            const resp = httpResponse.Ok('Fetched successfully', {
                data: stats.map(stat => stat.get({plain: true}) as CourseTopicContentInterface),
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseStatisticsGetQuestions.IResponse, GetStatisticsOnQuestionsRequest.body, GetStatisticsOnQuestionsRequest.query>, _res: Response<courseStatisticsGetQuestions.IResponse>, next: TypedNextFunction<courseStatisticsGetQuestions.IResponse>) => {
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
                data: stats.map(stat => stat.get({plain: true}) as CourseWWTopicQuestionInterface),
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPostDef.IResponse, CreateQuestionsForTopicFromDefFileRequest.body, unknown>, _res: Response<coursesPostDef.IResponse>, next: TypedNextFunction<coursesPostDef.IResponse>) => {
        const query = req.query as CreateQuestionsForTopicFromDefFileRequest.query;
        const results = await courseController.createQuestionsForTopicFromDefFileContent({
            webworkDefFileContent: req.file.buffer.toString(),
            courseTopicId: query.courseTopicId
        });

        // Sequelize does not give the subobjects that are added after the fact so getting it here
        const adjustedResults = results.map(result => ({
            courseQuestionAssessmentInfo: result.courseQuestionAssessmentInfo?.get({plain: true}),
            ...result.get({plain:true})
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPostCourses.IResponse, CreateCourseRequest.body, unknown>, _res: Response<coursesPostCourses.IResponse>, next: TypedNextFunction<coursesPostCourses.IResponse>) => {
        const query = req.query as CreateCourseRequest.query;
        try {
            if (_.isNil(req.session)) {
                throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
            }

            if (_.isNil(query.useCurriculum)) {
                throw new Error('useCurriculum has a default value and therefore is not possible to be nil');
            }
            const session = req.session;
            const user = await session.getUser();
            const university = await user.getUniversity();

            const newCourse = await courseController.createCourse({
                object: {
                    instructorId: user.id,
                    universityId: university.id,
                    ...req.body
                },
                options: {
                    useCurriculum: query.useCurriculum
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPostUnit.IResponse, CreateCourseUnitRequest.body, CreateCourseUnitRequest.query>, _res: Response<coursesPostUnit.IResponse>, next: TypedNextFunction<coursesPostUnit.IResponse>) => {
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

import { courseTopicPostTopic } from '@rederly/backend-validation';
router.post('/topic',
    authenticationMiddleware,
    validationMiddleware(courseTopicPostTopic),
    paidMiddleware('Adding topics'),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseTopicPostTopic.IResponse, any, EmptyExpressQuery>, _res: Response<courseTopicPostTopic.IResponse>, next: TypedNextFunction<courseTopicPostTopic.IResponse>) => {
        const newTopic = await courseController.createTopic({
            ...req.body
        });

        const resp = httpResponse.Created('Course Topic created successfully', newTopic.get({plain: true}) as CourseTopicContentInterface);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesGetGrades } from '@rederly/backend-validation';
router.get('/grades',
    authenticationMiddleware,
    validationMiddleware(coursesGetGrades),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetGrades.IResponse, GetGradesRequest.body, GetGradesRequest.query>, _res: Response<coursesGetGrades.IResponse>, next: TypedNextFunction<coursesGetGrades.IResponse>) => {
        try {
            const grades = await courseController.getGrades({
                where: {
                    courseId: req.query.courseId,
                    questionId: req.query.questionId,
                    topicId: req.query.topicId,
                    unitId: req.query.unitId,
                    userId: req.query.userId,
                }
            });
            const resp = httpResponse.Ok('Fetched successfully', grades.map(grade => grade.get({plain: true}) as StudentGradeInterface));
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { coursesGetTopicGrades } from '@rederly/backend-validation';
router.get('/:courseId/topic-grades',
    authenticationMiddleware,
    validationMiddleware(coursesGetTopicGrades),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetTopicGrades.IResponse, GetGradesForTopicsByCourseRequest.body, GetGradesForTopicsByCourseRequest.query>, res: Response<coursesGetTopicGrades.IResponse>, next: TypedNextFunction<coursesGetTopicGrades.IResponse>) => {
        const params = req.params as GetGradesForTopicsByCourseRequest.params;
        const topics = await courseController.getGradesForTopics({
            courseId: params.courseId,
        });

        const resp = httpResponse.Ok('Fetched successfully', {
            topics: topics
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesGetQuestions } from '@rederly/backend-validation';
router.get('/questions',
    authenticationMiddleware,
    validationMiddleware(coursesGetQuestions),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetQuestions.IResponse, GetQuestionsRequest.body, GetQuestionsRequest.query>, _res: Response<coursesGetQuestions.IResponse>, next: TypedNextFunction<coursesGetQuestions.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const userIdInput = req.query.userId;
        let userId: number | undefined;
        if (typeof userIdInput === 'string') {
            if (userIdInput === 'me') {
                const session = req.session;
                userId = session.userId;
            } else {
                throw new IllegalArgumentException('userIdInput as a string must be the value `me`');
            }
        } else if (typeof userIdInput === 'number') {
            userId = userIdInput;
        }

        if (_.isNil(userId)) {
            throw new WrappedError('It is impossible for userId to still be undefined here.');
        }

        // This should not happen anyway, need to do a more in depth change in the future
        const rederlyUserRole = req.rederlyUserRole ?? Role.STUDENT;

        const {
            message,
            userCanGetQuestions,
            topic,
            version
        } = await courseController.canUserGetQuestions({
            userId,
            courseTopicContentId: req.query.courseTopicContentId,
            studentTopicAssessmentInfoId: req.query.studentTopicAssessmentInfoId,
            role: rederlyUserRole
        });

        // TODO fix frontend error handling around assessments when canGetQuestions is false
        if (userCanGetQuestions === false) {
            if (_.isNil(topic)){
                throw new IllegalArgumentException(message);
            } else {
                next(httpResponse.Ok(message, {topic}));
            }
            return;
        }

        const questions = await courseController.getQuestions({
            userId: userId,
            courseTopicContentId: req.query.courseTopicContentId,
            studentTopicAssessmentInfoId: req.query.studentTopicAssessmentInfoId ?? version?.id,
        });

        const resp = httpResponse.Ok('Got questions', {
            questions: questions.map(question => question.get({plain: true}) as CourseWWTopicQuestionInterface),
            topic: topic?.get({plain: true}) as CourseTopicContentInterface
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseTopicGetVersionByUserId } from '@rederly/backend-validation';
router.get('/topic/:topicId/version/:userId',
    authenticationMiddleware,
    validationMiddleware(courseTopicGetVersionByUserId),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseTopicGetVersionByUserId.IResponse, GetVersionRequest.body, GetVersionRequest.query>, _res: Response<courseTopicGetVersionByUserId.IResponse>, next: TypedNextFunction<courseTopicGetVersionByUserId.IResponse>) => {
        const params = req.params as GetVersionRequest.params;
        const result = await courseController.getAllContentForVersion({topicId: params.topicId, userId: params.userId});
        const resp = httpResponse.Ok('Fetched successfully', result);
        next(resp as DeepAddIndexSignature<typeof resp>);
    })
);

import { courseTopicPutEndExport } from '@rederly/backend-validation';
router.put('/topic/:topicId/endExport', 
    // this call is expected from a microservice, so doesn't go through authentication
    validationMiddleware(courseTopicPutEndExport),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseTopicPutEndExport.IResponse, EndBulkExportRequest.body, EndBulkExportRequest.query>, _res: Response<courseTopicPutEndExport.IResponse>, next: TypedNextFunction<courseTopicPutEndExport.IResponse>) => {
        const params = req.params as EndBulkExportRequest.params;
        const topic = await CourseTopicContent.findOne({
            where: {
                id: params.topicId,
                active: true,
            },
        });

        if (_.isNil(topic)) {
            throw new NotFoundError('A endExport PUT was received for a non-existant topic. Was it deleted?');
        }

        if (_.isNil(req.body.exportUrl)) {
            logger.error('The Exporter failed to successfully export a topic.');
            topic.exportUrl = null;
            topic.lastExported = null;
        } else {
            topic.exportUrl = req.body.exportUrl;
        }
        await topic.save();

        const resp = httpResponse.Ok('Got it!', null);
        next(resp as DeepAddIndexSignature<typeof resp>);
    })
);

import { courseTopicPostStartExport } from '@rederly/backend-validation';
router.post('/topic/:topicId/startExport',
    authenticationMiddleware,
    validationMiddleware(courseTopicPostStartExport),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseTopicPostStartExport.IResponse, BulkExportRequest.body, BulkExportRequest.query>, _res: Response<courseTopicPostStartExport.IResponse>, next: TypedNextFunction<courseTopicPostStartExport.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        
        const params = req.params as BulkExportRequest.params;
        const query: BulkExportRequest.query = req.query;
        const professor = await req.session.getUser();

        const topic = await CourseTopicContent.findOne({
            where: {
                id: params.topicId,
                active: true,
            },
        });

        if (_.isNil(topic)) {
            throw new NotFoundError('No such topic was found.');
        }

        // Since this is a job, we'll always have this by here.
        const exportDetails = {lastExported: topic.lastExported, exportUrl: topic.exportUrl};

        const helper = new ExportPDFHelper();

        // If we're just checking, return what's already here.
        if (query.force === false) {
            next(httpResponse.Ok('Details', exportDetails));
        } else {
            helper.start({
                topic, 
                professorUUID: professor.uuid,
                showSolutions: query.showSolutions ?? false,
            })
            .then(() => logger.info(`Finished uploading ${topic.id}.`))
            .catch((e) => {
                logger.error('Failed to export', e);
                topic.lastExported = null;
                topic.save();
            });
            
            const resp = httpResponse.Ok('Loading', exportDetails);
            next(resp as DeepAddIndexSignature<typeof resp>);
        }
    })
);

import { courseTopicPutExtend } from '@rederly/backend-validation';
router.put('/topic/extend',
    authenticationMiddleware,
    validationMiddleware(courseTopicPutExtend),
    paidMiddleware('Modifying topic settings'),
    asyncHandler(
        async (req: RederlyExpressRequest<EmptyExpressParams, courseTopicPutExtend.IResponse, ExtendCourseTopicForUserRequest.body, EmptyExpressQuery, unknown>, _res: Response<courseTopicPutExtend.IResponse>, next: TypedNextFunction<courseTopicPutExtend.IResponse>) => {
            const query = req.query as ExtendCourseTopicForUserRequest.query;
            const body = req.body as ExtendCourseTopicForUserRequest.body;

            const updatesResult = await courseController.extendTopicForUser({
                where: {
                    courseTopicContentId: query.courseTopicContentId,
                    userId: query.userId
                },
                assessmentWhere: {
                    topicAssessmentInfoId: query.topicAssessmentInfoId
                },
                updates: body,
            });
            // TODO handle not found case
            const resp = httpResponse.Ok('Extended topic successfully', {
                extendTopicResult: stripSequelizeFromUpsertResult<StudentTopicOverrideInterface>(updatesResult.extendTopicResult),
                extendTopicAssessmentResult: stripSequelizeFromUpsertResult<StudentTopicOverrideInterface>(updatesResult.extendTopicAssessmentResult)
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        }));

import { courseTopicPutTopicById } from '@rederly/backend-validation';
router.put('/topic/:id',
    authenticationMiddleware,
    validationMiddleware(courseTopicPutTopicById),
    paidMiddleware('Modifying topic settings'),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseTopicPutTopicById.IResponse, UpdateCourseTopicRequest.body, UpdateCourseTopicRequest.query>, _res: Response<courseTopicPutTopicById.IResponse>, next: TypedNextFunction<courseTopicPutTopicById.IResponse>) => {
        const params = req.params as UpdateCourseTopicRequest.params;
        const updatesResult = await courseController.updateTopic({
            where: {
                id: params.id
            },
            updates: {
                ...req.body
            }
        });
        // TODO handle not found case
        const resp = httpResponse.Ok('Updated topic successfully', {
            updatesResult: updatesResult.map(result => ({
                ...result.get({ plain: true }) as CourseTopicContentInterface,
                topicAssessmentInfo: result.topicAssessmentInfo as TopicAssessmentInfoInterface
            })),
            updatesCount: updatesResult.length
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesGetGradeById } from '@rederly/backend-validation';
router.get('/assessment/topic/grade/:id',
    authenticationMiddleware,
    validationMiddleware(coursesGetGradeById),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetGradeById.IResponse, GradeAssessmentRequest.body, GradeAssessmentRequest.query>, _res: Response<coursesGetGradeById.IResponse>, next: TypedNextFunction<coursesGetGradeById.IResponse>) => {
        const params = req.params as GradeAssessmentRequest.params;
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();
        if (await courseController.canUserGradeAssessment({user, topicId: params.id}) === false) {
            throw new ForbiddenError('You are not allowed to grade this assessment.');
        }

        const {problems, topic} = await courseController.getAssessmentForGrading({topicId: params.id});
        const resp = httpResponse.Ok('Fetched problems + workbooks successfully', {
            problems: problems.map(problem => problem.get({plain: true}) as CourseWWTopicQuestionInterface),
            topic: topic.get({plain: true}) as CourseTopicContentInterface
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesGetEndById } from '@rederly/backend-validation';
router.get('/assessment/topic/end/:id',
    authenticationMiddleware,
    validationMiddleware(coursesGetEndById),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetEndById.IResponse, EndAssessmentVersionRequest.body, EndAssessmentVersionRequest.query>, _res: Response<coursesGetEndById.IResponse>, next: TypedNextFunction<coursesGetEndById.IResponse>) => {
        const params = req.params as EndAssessmentVersionRequest.params;
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const user = req.rederlyUser ?? await req.session.getUser();
        const version = await courseController.getStudentTopicAssessmentInfoById(params.id);

        if (version.userId !== user.id) {
            throw new ForbiddenError('You may not end an exam that does not belong to you.');
        }

        if (version.numAttempts === 0) {
            throw new ForbiddenError('You cannot end an exam without making at least one attempt.');
        }

        await courseController.endAssessmentEarly(version, true);

        const resp = httpResponse.Ok('Assessment version has been closed.', null);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesGetStart } from '@rederly/backend-validation';
router.get('/assessment/topic/:id/start',
    authenticationMiddleware,
    validationMiddleware(coursesGetStart),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetStart.IResponse, CreateAssessmentVersionRequest.body, CreateAssessmentVersionRequest.query>, _res: Response<coursesGetStart.IResponse>, next: TypedNextFunction<coursesGetStart.IResponse>) => {
        const params = req.params as CreateAssessmentVersionRequest.params;
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const user = req.rederlyUser ?? await req.session.getUser();
        const rederlyUserRole = req.rederlyUserRole ?? user.roleId;

        // function returns boolean and IF the user is not allowed to start a new version, a reason is included
        const { userCanStartNewVersion, message, data } = await courseController.canUserStartNewVersion({ user, topicId: params.id, role: rederlyUserRole });

        // will never have true + message
        if (userCanStartNewVersion === false && !_.isNil(message)) {
            throw new IllegalArgumentException(message, data);
        }

        const versionInfo = await courseController.createGradeInstancesForAssessment({
            topicId: params.id,
            userId: user.id,
            requestURL: req.headers['rederly-origin'] as string | undefined // need this because it incorrectly thinks it can be an array
        });

        const resp = httpResponse.Ok('New version of this assessment created successfully', versionInfo.get({plain: true}) as StudentTopicAssessmentInfoInterface);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesDeleteUnitById } from '@rederly/backend-validation';
router.delete('/unit/:id',
    authenticationMiddleware,
    validationMiddleware(coursesDeleteUnitById),
    paidMiddleware('Deleting units'),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesDeleteUnitById.IResponse, DeleteCourseUnitRequest.body, DeleteCourseUnitRequest.query>, _res: Response<coursesDeleteUnitById.IResponse>, next: TypedNextFunction<coursesDeleteUnitById.IResponse>) => {
        const params = req.params as DeleteCourseUnitRequest.params;
        try {
            const updatesResult = await courseController.softDeleteUnits({
                id: params.id
            });
            // TODO handle not found case
            const resp = httpResponse.Ok('Deleted units and subobjects successfully', stripSequelizeFromUpdateResult<CourseUnitContentInterface>(updatesResult));
            
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { courseTopicDeleteTopicById } from '@rederly/backend-validation';
router.delete('/topic/:id',
    authenticationMiddleware,
    validationMiddleware(courseTopicDeleteTopicById),
    paidMiddleware('Deleting topics'),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseTopicDeleteTopicById.IResponse, DeleteCourseTopicRequest.body, DeleteCourseTopicRequest.query>, _res: Response<courseTopicDeleteTopicById.IResponse>, next: TypedNextFunction<courseTopicDeleteTopicById.IResponse>) => {
        const params = req.params as DeleteCourseTopicRequest.params;
        try {
            const updatesResult = await courseController.softDeleteTopics({
                id: params.id
            });
            // TODO handle not found case
            const resp = httpResponse.Ok('Deleted topics and subobjects successfully', stripSequelizeFromUpdateResult<CourseTopicContentInterface>(updatesResult));
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { courseQuestionDeleteQuestionById } from '@rederly/backend-validation';
router.delete('/question/:id',
    authenticationMiddleware,
    validationMiddleware(courseQuestionDeleteQuestionById),
    paidMiddleware('Deleting questions'),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionDeleteQuestionById.IResponse, DeleteCourseQuestionRequest.body, DeleteCourseQuestionRequest.query>, _res: Response<courseQuestionDeleteQuestionById.IResponse>, next: TypedNextFunction<courseQuestionDeleteQuestionById.IResponse>) => {
        const params = req.params as DeleteCourseQuestionRequest.params;
        try {
            const updatesResult = await courseController.softDeleteQuestions({
                id: params.id
            });
            // TODO handle not found case
            const resp = httpResponse.Ok('Deleted questions and subobjects successfully', stripSequelizeFromUpdateResult<CourseWWTopicQuestionInterface>(updatesResult));
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPutUnitById.IResponse, UpdateCourseUnitRequest.body, UpdateCourseUnitRequest.query>, _res: Response<coursesPutUnitById.IResponse>, next: TypedNextFunction<coursesPutUnitById.IResponse>) => {
        try {
            const params = req.params as UpdateCourseUnitRequest.params;
            const updatedRecords = await courseController.updateCourseUnit({
                where: {
                    id: params.id
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

import { courseQuestionPutGradeById } from '@rederly/backend-validation';
router.put('/question/grade/:id',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPutGradeById),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPutGradeById.IResponse, UpdateGradeRequest.body, UpdateGradeRequest.query>, _res: Response<courseQuestionPutGradeById.IResponse>, next: TypedNextFunction<courseQuestionPutGradeById.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const params = req.params as UpdateCourseTopicQuestionRequest.params;
        const updatedRecords = await courseController.updateGrade({
            where: {
                id: params.id
            },
            updates: {
                ...req.body
            },
            initiatingUserId: req.session.userId
        });
        const resp = httpResponse.Ok('Updated grade successfully', stripSequelizeFromUpdateResult<StudentGradeInterface>(updatedRecords));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPutInstanceById } from '@rederly/backend-validation';
router.put('/question/grade/instance/:id',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPutInstanceById),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPutInstanceById.IResponse, UpdateGradeInstanceRequest.body, UpdateGradeInstanceRequest.query>, _res: Response<courseQuestionPutInstanceById.IResponse>, next: TypedNextFunction<courseQuestionPutInstanceById.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const params = req.params as UpdateGradeInstanceRequest.params;
        const updatesResult = await courseController.updateGradeInstance({
            where: {
                id: params.id
            },
            updates: {
                ...req.body
            },
            initiatingUserId: req.session.userId
        });
        const resp = httpResponse.Ok('Updated grade successfully', stripSequelizeFromUpdateResult<StudentGradeInstanceInterface>(updatesResult));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPutExtend } from '@rederly/backend-validation';
router.put('/question/extend',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPutExtend),
    paidMiddleware('Modifying questions'),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPutExtend.IResponse, ExtendCourseTopicQuestionRequest.body, EmptyExpressQuery>, _res: Response<courseQuestionPutExtend.IResponse>, next: TypedNextFunction<courseQuestionPutExtend.IResponse>) => {
        const query = req.query as ExtendCourseTopicQuestionRequest.query;
        const body = req.body;

        const extensions = await courseController.extendQuestionForUser({
            where: {
                ...query
            },
            updates: {
                ...body
            }
        });
        const resp = httpResponse.Ok('Extended topic successfully', stripSequelizeFromUpsertResult<StudentTopicQuestionOverrideInterface>(extensions));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPutQuestionById } from '@rederly/backend-validation';
router.put('/question/:id',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPutQuestionById),
    paidMiddleware('Modifying questions'),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPutQuestionById.IResponse, UpdateCourseTopicQuestionRequest.body, UpdateCourseTopicQuestionRequest.query>, _res: Response<courseQuestionPutQuestionById.IResponse>, next: TypedNextFunction<courseQuestionPutQuestionById.IResponse>) => {
        const params = req.params as UpdateCourseTopicQuestionRequest.params;
        const updatesResult = await courseController.updateQuestion({
            where: {
                id: params.id
            },
            updates: {
                ...req.body
            }
        });
        const resp = httpResponse.Ok('Updated question successfully', stripSequelizeFromUpdateResult<CourseWWTopicQuestionInterface>({
            updatedRecords: updatesResult,
            updatedCount: updatesResult.length
        }));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesPutCoursesById } from '@rederly/backend-validation';
router.put('/:id',
    authenticationMiddleware,
    validationMiddleware(coursesPutCoursesById),
    paidMiddleware('Modifying courses'),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPutCoursesById.IResponse, UpdateCourseRequest.body, UpdateCourseRequest.query>, _res: Response<coursesPutCoursesById.IResponse>, next: TypedNextFunction<coursesPutCoursesById.IResponse>) => {
        try {
            const params = req.params as UpdateCourseRequest.params;
            const updatesResult = await courseController.updateCourse({
                where: {
                    id: params.id
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

import { courseQuestionPostQuestion } from '@rederly/backend-validation';
router.post('/question',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPostQuestion),
    paidMiddleware('Adding questions'),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPostQuestion.IResponse, CreateCourseTopicQuestionRequest.body, CreateCourseTopicQuestionRequest.query>, _res: Response<courseQuestionPostQuestion.IResponse>, next: TypedNextFunction<courseQuestionPostQuestion.IResponse>) => {
        const newQuestion = await courseController.addQuestion({
            question: {
                ...req.body
            }
        });
        // TODO handle not found case
        const resp = httpResponse.Created('Course Question created successfully', newQuestion.get({plain: true}) as CourseWWTopicQuestionInterface);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionGetRaw } from '@rederly/backend-validation';
router.get('/question/:id/raw',
    authenticationMiddleware,
    validationMiddleware(courseQuestionGetRaw),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionGetRaw.IResponse, GetQuestionRawRequest.body, unknown>, _res: Response<courseQuestionGetRaw.IResponse>, next: TypedNextFunction<courseQuestionGetRaw.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const { id: questionId } = req.params as GetQuestionRawRequest.params;
        const { userId } = req.query as GetQuestionRawRequest.query;

        const question = await courseController.getQuestionWithoutRenderer({
                id: questionId,
                userId,
            });
        const resp = httpResponse.Ok('Fetched question successfully', question.get({plain: true}) as CourseWWTopicQuestionInterface);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionGetGrade } from '@rederly/backend-validation';
router.get('/question/:id/grade',
    authenticationMiddleware,
    validationMiddleware(courseQuestionGetGrade),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionGetGrade.IResponse, GetQuestionGradeRequest.body, unknown>, _res: Response<courseQuestionGetGrade.IResponse>, next: TypedNextFunction<courseQuestionGetGrade.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const { userId, includeWorkbooks } = req.query as GetQuestionGradeRequest.query;
        const { id: questionId } = req.params as GetQuestionGradeRequest.params;

        const grade = await courseController.getGradeForQuestion({
            questionId,
            userId,
            includeWorkbooks
        });

        const resp = httpResponse.Ok('Fetched question grade successfully', (grade?.get({plain: true}) as StudentGradeInterface) ?? null);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionGetOpenlab } from '@rederly/backend-validation';
router.get('/question/:id/openlab',
    authenticationMiddleware,
    validationMiddleware(courseQuestionGetOpenlab),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionGetOpenlab.IResponse, GetQuestionOpenLabRequest.body, GetQuestionOpenLabRequest.query>, res: Response<courseQuestionGetOpenlab.IResponse>, next: TypedNextFunction<courseQuestionGetOpenlab.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();
        const { id: questionId } = req.params as GetQuestionOpenLabRequest.params;
        const baseURL = req.headers['rederly-origin'] as string | undefined; // need this because it incorrectly thinks it can be an array
        if (_.isNil(baseURL)) {
            throw new RederlyError('Could not determine the base URL from the ask for help request');
        }

        const openLabRedirectInfo = await courseController.prepareOpenLabRedirect({user, questionId, baseURL});
        const openLabResponse = await openLabHelper.askForHelp(openLabRedirectInfo);

        const resp = httpResponse.Ok('Data sent to OpenLab successfully', openLabResponse);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionGetSma } from '@rederly/backend-validation';
router.get('/question/:id/sma',
    authenticationMiddleware,
    validationMiddleware(courseQuestionGetSma),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionGetSma.IResponse, GetQuestionShowMeAnotherRequest.body, GetQuestionShowMeAnotherRequest.query>, res: Response<courseQuestionGetSma.IResponse>, next: TypedNextFunction<courseQuestionGetSma.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const userId = await req.session.userId;
        const { id: questionId } = req.params as GetQuestionShowMeAnotherRequest.params;

        const updatedGrade = await courseController.requestProblemNewVersion({questionId, userId}); 
        if (_.isNil(updatedGrade)) {
            const resp = httpResponse.Ok('No new versions of this problem could be found.', null);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } else {
            const resp = httpResponse.Ok('New version found!', updatedGrade.get({plain: true}) as StudentGradeInterface);
            next(resp as DeepAddIndexSignature<typeof resp>);
        }
    }));

import { courseQuestionGetQuestionById } from '@rederly/backend-validation';
router.get('/question/:id',
    authenticationMiddleware,
    validationMiddleware(courseQuestionGetQuestionById),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionGetQuestionById.IResponse, GetQuestionRequest.body, GetQuestionRequest.query>, _res: Response<courseQuestionGetQuestionById.IResponse>, next: TypedNextFunction<courseQuestionGetQuestionById.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const requestingUser = req.rederlyUser ?? await req.session.getUser();
        const rederlyUserRole = req.rederlyUserRole ?? requestingUser.roleId;

        const { id: questionId } = req.params as GetQuestionRequest.params;
        const { readonly, workbookId, userId: requestedUserId, studentTopicAssessmentInfoId, showCorrectAnswers } = req.query;
        try {
            // check to see if we should allow this question to be viewed
            const {
                userCanViewQuestion,
                message
            } = await courseController.canUserViewQuestionId({
                user: requestingUser,
                questionId,
                studentTopicAssessmentInfoId,
                role: rederlyUserRole
            });

            if (userCanViewQuestion === false) throw new IllegalArgumentException(message);

            const question = await courseController.getQuestion({
                questionId,
                userId: requestedUserId ?? requestingUser.id,
                formURL: req.originalUrl,
                role: rederlyUserRole,
                readonly,
                workbookId,
                studentTopicAssessmentInfoId,
                showCorrectAnswers,
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
    }));

import { coursesPostAuto } from '@rederly/backend-validation';
router.post('/assessment/topic/:id/submit/:version/auto',
    validationMiddleware(coursesPostAuto),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPostAuto.IResponse, SubmitAssessmentVersionRequest.body, SubmitAssessmentVersionRequest.query>, _res: Response<coursesPostAuto.IResponse>, next: TypedNextFunction<coursesPostAuto.IResponse>) => {
        const params = req.params as SubmitAssessmentVersionRequest.params;
        try {
            const assessmentResult = await courseController.submitAssessmentAnswers(params.version, true); // false: wasAutoSubmitted
            const resp = httpResponse.Ok('Assessment submitted successfully', assessmentResult);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            if (e instanceof AttemptsExceededException) {
                logger.warn('This assessment version has no attempts remaining but was auto submitted.', JSON.stringify({
                    assessmentVersionId: params.version,
                    topicId: params.id
                }));
                const resp = httpResponse.Ok('Attempts exceeded skipping auto submit', null);
                next(resp as DeepAddIndexSignature<typeof resp>);    
            } else {
                logger.error('Auto submit ran into uncaught error', e);
                throw e;
            }
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPostPreview.IResponse, GetQuestionRequest.body, PreviewQuestionRequest.query>, _res: Response<coursesPostPreview.IResponse>, next: TypedNextFunction<undefined>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();
        const rederlyUserRole = req.rederlyUserRole ?? user.roleId;
        if (rederlyUserRole === Role.STUDENT) throw new ForbiddenError('Preview is not available.');

        const query = req.query as PreviewQuestionRequest.query;
        if (!_.isNil(req.body) && !_.isEmpty(req.body)) {
            req.meta = {
                rendererParams: {
                    outputformat: rendererHelper.getOutputFormatForRole(Role.PROFESSOR),
                    permissionLevel: rendererHelper.getPermissionForRole(Role.PROFESSOR),
                    showSolutions: Number(1),
                },
                studentGrade: {
                    numAttempts: 0,
                    randomSeed: query.problemSeed,
                },
                courseQuestion: {
                    webworkQuestionPath: query.webworkQuestionPath
                },
            };
            return next(undefined);
        }
        if (_.isNil(query.webworkQuestionPath)) {
            throw new Error('Missing required field');
        }
        try {
            const question = await courseController.previewQuestion({
                webworkQuestionPath: query.webworkQuestionPath,
                problemSeed: query.problemSeed,
                formURL: req.originalUrl,
                formData: {},
                role: rederlyUserRole,
                showAnswersUpfront: query.showAnswersUpfront,
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
        proxyReqPathResolver: (req: RederlyExpressRequest<EmptyExpressParams, unknown, unknown, unknown, PostQuestionMeta>) => {
            if (_.isNil(req.meta)) {
                throw new Error('Previously fetched metadata is nil');
            }
            const params: GetProblemParameters = {
                format: 'json',
                formURL: req.originalUrl,
                baseURL: '/',
                ...req.meta?.rendererParams,
                numIncorrect: req.meta.studentGrade?.numAttempts,
                problemSeed: req.meta.studentGrade?.randomSeed
            };
            return `${RENDERER_ENDPOINT}?${qs.stringify(params)}`;
        },
        userResDecorator: async (proxyRes: Response<coursesPostPreview.IResponse>, proxyResData, userReq: RederlyExpressRequest<EmptyExpressParams, coursesPostPreview.IResponse, unknown, EmptyExpressQuery, PostQuestionMeta>) => {
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

import { coursesPostSubmitByVersion } from '@rederly/backend-validation';
router.post('/assessment/topic/:id/submit/:version',
    authenticationMiddleware,
    validationMiddleware(coursesPostSubmitByVersion),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPostSubmitByVersion.IResponse, SubmitAssessmentVersionRequest.body, SubmitAssessmentVersionRequest.query>, _res: Response<coursesPostSubmitByVersion.IResponse>, next: TypedNextFunction<coursesPostSubmitByVersion.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();

        const params = req.params as SubmitAssessmentVersionRequest.params;

        const studentTopicAssessmentInfo = await courseController.getStudentTopicAssessmentInfoById(params.version);
        if (user.id != studentTopicAssessmentInfo.userId) {
            throw new Error('You cannot submit an assessment that does not belong to you.');
        }

        if (studentTopicAssessmentInfo.maxAttempts > 0 && studentTopicAssessmentInfo.numAttempts >= studentTopicAssessmentInfo.maxAttempts) {
            throw new IllegalArgumentException('This assessment version has no attempts remaining.');
        }

        const assessmentResult = await courseController.submitAssessmentAnswers(params.version, false); // false: wasAutoSubmitted
        const resp = httpResponse.Ok('Assessment submitted successfully', assessmentResult);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPostQuestionById } from '@rederly/backend-validation';
router.post('/question/:id',
    authenticationMiddleware,
    // TODO investigate if this is a problem
    // if the body were to be consumed it should hang here
    bodyParser.raw({
        type: '*/*'
    }),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPostQuestionById.IResponse, unknown, unknown, PostQuestionMeta>, _res: Response<courseQuestionPostQuestionById.IResponse>, next: TypedNextFunction<undefined>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();
        const rederlyUserRole = req.rederlyUserRole ?? user.roleId;

        const params = req.params as unknown as {
            id: number;
        };

        const question = await courseController.getQuestionRecord(params.id);

        const rendererParams = await courseController.getCalculatedRendererParams({
            courseQuestion: question,
            role: rederlyUserRole,
            userId: user.id
        });

        const studentGrade = await StudentGrade.findOne({
            where: {
                userId: user.id,
                courseWWTopicQuestionId: params.id
            }
        });

        req.meta = {
            rendererParams,
            // TODO investigate why having full sequelize model causes proxy to hang
            // maybe meta is a reserved field?
            studentGrade: studentGrade?.get({ plain: true }) as StudentGrade,
            courseQuestion: question
        };
        next(undefined);
    }),
    proxy(configurations.renderer.url, {
        proxyReqPathResolver: (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPostQuestionById.IResponse, unknown, unknown, PostQuestionMeta>) => {
            if (_.isNil(req.meta)) {
                throw new Error('Previously fetched metadata is nil');
            }
            const params: GetProblemParameters = {
                format: 'json',
                formURL: req.originalUrl,
                baseURL: '/',
                ...req.meta?.rendererParams,
                numIncorrect: req.meta.studentGrade?.numAttempts
            };
            return `${RENDERER_ENDPOINT}?${qs.stringify(params)}`;
        },
        userResDecorator: async (proxyRes: Response<courseQuestionPostQuestionById.IResponse>, proxyResData, userReq: RederlyExpressRequest<EmptyExpressParams, courseQuestionPostQuestionById.IResponse, unknown, unknown, PostQuestionMeta>) => {
            if (_.isNil(userReq.session)) {
                throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
            }

            if (_.isNil(userReq.meta)) {
                throw new Error('Previously fetched metadata is nil');
            }


            let rendererResponse: RendererResponse | null = null;
            const data = proxyResData.toString('utf8');
            if (proxyRes.statusCode >= 400) {
                throw new RederlyError(`Renderer submit question responded with error ${proxyRes.statusCode}: ${data}`);
            }
            try {
                rendererResponse = await rendererHelper.parseRendererResponse(data, {
                    questionPath: userReq.meta.courseQuestion.webworkQuestionPath,
                    questionRandomSeed: userReq.meta.studentGrade?.randomSeed
                });
            } catch (e) {
                throw new WrappedError(`Error parsing data response from renderer on question ${userReq.meta?.studentGrade?.courseWWTopicQuestionId} for grade ${userReq.meta?.studentGrade?.id}`, e);
            }

            const params = userReq.params as unknown as {
                id: number;
            };

            const result = await courseController.submitAnswer({
                userId: userReq.session.userId,
                questionId: params.id as number,
                score: rendererResponse.problem_result.score,
                submitted: rendererResponse,
            });

            const resp = httpResponse.Ok('Answer submitted for question', {
                rendererData: rendererHelper.cleanRendererResponseForTheResponse(rendererResponse),
                ...result
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetCourses.IResponse, ListCoursesRequest.body, ListCoursesRequest.query>, _res: Response<coursesGetCourses.IResponse>, next: TypedNextFunction<coursesGetCourses.IResponse>) => {
        const courses = await courseController.getCourses({
            filter: {
                instructorId: req.query.instructorId,
                enrolledUserId: req.query.enrolledUserId,
            }
        });
        const resp = httpResponse.Ok('Fetched successfully', courses.map(course => course.get({plain: true}) as CourseInterface));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesGetCourseList } from '@rederly/backend-validation';
router.get('/browse-problems/course-list',
    authenticationMiddleware,
    validationMiddleware(coursesGetCourseList),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetCourseList.IResponse, BrowseProblemsCourseListRequest.body, BrowseProblemsCourseListRequest.query>, _res: Response<coursesGetCourseList.IResponse>, next: TypedNextFunction<coursesGetCourseList.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const instructorId = req.query.instructorId === 'me' ? req.session.userId : req.query.instructorId;
        try {
            const courses = await courseController.browseProblemsCourseList({
                filter: {
                    instructorId: instructorId,
                }
            });
            const resp = httpResponse.Ok('Fetched successfully', {
                courses: courses.map(course => course.get({plain: true}) as CourseInterface)
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { coursesGetUnitList } from '@rederly/backend-validation';
router.get('/browse-problems/unit-list',
    authenticationMiddleware,
    validationMiddleware(coursesGetUnitList),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetUnitList.IResponse, BrowseProblemsUnitListRequest.body, BrowseProblemsUnitListRequest.query>, _res: Response<coursesGetUnitList.IResponse>, next: TypedNextFunction<coursesGetUnitList.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        try {
            const units = await courseController.browseProblemsUnitList({
                filter: {
                    courseId: req.query.courseId,
                }
            });
            const resp = httpResponse.Ok('Fetched successfully', {
                units: units.map(unit => unit.get({plain: true}) as CourseUnitContentInterface)
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { coursesGetTopicList } from '@rederly/backend-validation';
router.get('/browse-problems/topic-list',
    authenticationMiddleware,
    validationMiddleware(coursesGetTopicList),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetTopicList.IResponse, BrowseProblemsTopicListRequest.body, BrowseProblemsTopicListRequest.query>, _res: Response<coursesGetTopicList.IResponse>, next: TypedNextFunction<coursesGetTopicList.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        try {
            const topics = await courseController.browseProblemsTopicList({
                filter: {
                    unitId: req.query.unitId,
                }
            });
            const resp = httpResponse.Ok('Fetched successfully', {
                topics: topics.map(topic => topic.get({plain: true}) as CourseTopicContentInterface)
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { coursesGetSearch } from '@rederly/backend-validation';
router.get('/browse-problems/search',
    authenticationMiddleware,
    validationMiddleware(coursesGetSearch),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetSearch.IResponse, BrowseProblemsSearchRequest.body, BrowseProblemsSearchRequest.query>, _res: Response<coursesGetSearch.IResponse>, next: TypedNextFunction<coursesGetSearch.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const instructorId = req.query.instructorId === 'me' ? req.session.userId : req.query.instructorId;
        try {
            const problems = await courseController.browseProblemsSearch({
                filter: {
                    instructorId: instructorId,
                    courseId: req.query.courseId,
                    unitId: req.query.unitId,
                    topicId: req.query.topicId,
                }
            });
            const resp = httpResponse.Ok('Fetched successfully', {
                problems: problems.map(problem => problem.get({plain: true}) as CourseWWTopicQuestionInterface)
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { courseTopicGetTopicById } from '@rederly/backend-validation';
// This returns information about a specific topic. Currently, it only
// returns extension information if a specific user is passed.
router.get('/topic/:id',
    authenticationMiddleware,
    validationMiddleware(courseTopicGetTopicById),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseTopicGetTopicById.IResponse, GetTopicRequest.body, GetTopicRequest.query, unknown>, _res: Response<courseTopicGetTopicById.IResponse>, next: TypedNextFunction<courseTopicGetTopicById.IResponse>) => {
        const params = req.params as GetTopicRequest.params;
        const result = await courseController.getTopicById({
            id: params.id, 
            userId: req.query.userId, 
            includeQuestions: req.query.includeQuestions,
            includeWorkbookCount: req.query.includeWorkbookCount,
        });

        if (req.query.includeWorkbookCount) {
            result.calculateWorkbookCount();
        }

        const resp = httpResponse.Ok('Fetched successfully', result.get({plain: true}) as CourseTopicContentInterface);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesGetTopics } from '@rederly/backend-validation';
router.get('/topics',
    authenticationMiddleware,
    validationMiddleware(coursesGetTopics),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetTopics.IResponse, GetTopicsRequest.body, GetTopicsRequest.query>, _res: Response<coursesGetTopics.IResponse>, next: TypedNextFunction<coursesGetTopics.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const user = req.rederlyUser ?? await req.session.getUser();
        const rederlyUserRole = req.rederlyUserRole ?? user.roleId;
        const userId = (rederlyUserRole === Role.STUDENT) ? user.id : undefined;

        const result = await courseController.getTopics({
            courseId: req.query.courseId,
            isOpen: req.query.isOpen,
            userId
        });
        const resp = httpResponse.Ok('Fetched successfully', result.map(topic => topic.get({plain: true}) as CourseTopicContentInterface));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesPostEmail } from '@rederly/backend-validation';
router.post('/:id/email',
    authenticationMiddleware,
    validationMiddleware(coursesPostEmail),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPostEmail.IResponse, EmailProfRequest.body, EmailProfRequest.query>, res: Response<coursesPostEmail.IResponse>, next: TypedNextFunction<coursesPostEmail.IResponse>) => {
        const params = req.params as EmailProfRequest.params;

        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();

        const baseURL = req.headers['rederly-origin'] as string | undefined; // need this because it incorrectly thinks it can be an array
        if (_.isNil(baseURL)) {
            throw new IllegalArgumentException('rederly-origin is required in the request');
        }
        const result = await courseController.emailProfessor({
            courseId: params.id,
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetCoursesById.IResponse, GetCourseRequest.body, GetCourseRequest.query>, _res: Response<coursesGetCoursesById.IResponse>, next: TypedNextFunction<undefined>) => {
        try {
            const params = req.params as GetCourseRequest.params;
            const userIdForExtensions = req.rederlyUserRole === Role.STUDENT ? req.session?.userId : undefined;
            req.course = await courseController.getCourseById(params.id, userIdForExtensions);
            next(undefined);
        } catch (e) {
            next(e);
        }
    }),
    canUserViewCourse,
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetCoursesById.IResponse, unknown, EmptyExpressQuery>, _res: Response<coursesGetCoursesById.IResponse>, next: TypedNextFunction<coursesGetCoursesById.IResponse>) => {
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
            ...req.course.get({plain: true}),
            canAskForHelp,
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    })
);

import { coursesPostEnroll } from '@rederly/backend-validation';
router.post('/enroll',
    authenticationMiddleware,
    validationMiddleware(coursesPostEnroll),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPostEnroll.IResponse, EnrollInCourseRequest.body, EnrollInCourseRequest.query>, _res: Response<coursesPostEnroll.IResponse>, next: TypedNextFunction<coursesPostEnroll.IResponse>) => {
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
                const resp = Boom.notFound(e.message);
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPostEnrollByCode.IResponse, EnrollInCourseByCodeRequest.body, EnrollInCourseByCodeRequest.query>, _res: Response<coursesPostEnrollByCode.IResponse>, next: TypedNextFunction<coursesPostEnrollByCode.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const params = req.params as EnrollInCourseByCodeRequest.params;

        const session = req.session;
        try {
            const enrollment = await courseController.enrollByCode({
                code: params.code,
                userId: session.userId
            });
            const resp = httpResponse.Ok('Enrolled', enrollment.get({plain: true}) as StudentEnrollmentInterface);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            if (e instanceof NotFoundError) {
                const resp = Boom.notFound(e.message);
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesDeleteEnroll.IResponse, DeleteEnrollmentRequest.body, DeleteEnrollmentRequest.query>, _res: Response<coursesDeleteEnroll.IResponse>, next: TypedNextFunction<coursesDeleteEnroll.IResponse>) => {
        try {
            const success = await courseController.softDeleteEnrollment({
                ...req.body,
            });
            const resp = httpResponse.Ok('Student was dropped', success);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            if (e instanceof NotFoundError) {
                const resp = Boom.notFound(e.message);
                next(resp);    
            } else {
                next(e);
            }
        }
    }));

import { coursesPostUploadUrl } from '@rederly/backend-validation';
// TODO: Switch to POST in next release to match Frontend API.
// This was to avoid API failures from one release to another.
router.post('/attachments/upload-url',
    authenticationMiddleware,
    validationMiddleware(coursesPostUploadUrl),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPostUploadUrl.IResponse, GetAttachmentPresignedURLRequest.body, GetAttachmentPresignedURLRequest.query>, _res: Response<coursesPostUploadUrl.IResponse>, next: TypedNextFunction<coursesPostUploadUrl.IResponse>) => {
        const result = await attachmentHelper.getNewPresignedURL();
        const resp = httpResponse.Ok('Get new presigned url success', result);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesPostAttachments } from '@rederly/backend-validation';
router.post('/attachments',
    authenticationMiddleware,
    validationMiddleware(coursesPostAttachments),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesPostAttachments.IResponse, PostAttachmentRequest.body, PostAttachmentRequest.query>, _res: Response<coursesPostAttachments.IResponse>, next: TypedNextFunction<coursesPostAttachments.IResponse>) => {
        // TODO permission to check if user has access to the provided grade or grade instance
        const result = await courseController.createAttachment({
            obj: req.body.attachment,
            studentGradeId: req.body.studentGradeId,
            studentGradeInstanceId: req.body.studentGradeInstanceId,
            studentWorkbookId: req.body.studentWorkbookId
        });
        const resp = httpResponse.Ok('Attachment record created', result.get({plain: true}) as ProblemAttachmentInterface);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesGetList } from '@rederly/backend-validation';
router.get('/attachments/list',
    authenticationMiddleware,
    validationMiddleware(coursesGetList),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesGetList.IResponse, ListAttachmentsRequest.body, ListAttachmentsRequest.query>, _res: Response<coursesGetList.IResponse>, next: TypedNextFunction<coursesGetList.IResponse>) => {
        // TODO permission to check if user has access to the provided grade or grade instance
        const result = await courseController.listAttachments({
            studentGradeId: req.query.studentGradeId,
            studentGradeInstanceId: req.query.studentGradeInstanceId,
            studentWorkbookId: req.query.studentWorkbookId,
        });

        const resp = httpResponse.Ok('Attachments fetched successfully', {
            attachments: result.map(attachment => attachment.get({plain: true}) as ProblemAttachmentInterface),
            baseUrl: configurations.attachments.baseUrl
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesDeleteAttachmentsById } from '@rederly/backend-validation';
router.delete('/attachments/:id',
    authenticationMiddleware,
    validationMiddleware(coursesDeleteAttachmentsById),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, coursesDeleteAttachmentsById.IResponse, DeleteAttachmentRequest.body, DeleteAttachmentRequest.query>, _res: Response<coursesDeleteAttachmentsById.IResponse>, next: TypedNextFunction<coursesDeleteAttachmentsById.IResponse>) => {
        const params = req.params as DeleteAttachmentRequest.params;
        // TODO permission to check if user has access to the provided grade or grade instance
        const result = await courseController.deleteAttachment({
            problemAttachmentId: params.id
        });

        const resp = httpResponse.Ok('Attachment deleted successfully', stripSequelizeFromUpdateResult<ProblemAttachmentInterface>(result));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPostSave } from '@rederly/backend-validation';
router.post('/question/editor/save',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPostSave),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPostSave.IResponse, SaveQuestionRequest.body, SaveQuestionRequest.query>, _res: Response<courseQuestionPostSave.IResponse>, next: TypedNextFunction<courseQuestionPostSave.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser({
            where: {
                active: true
            }
        });

        const writeFilePath = urljoin(`private/my/${user.uuid}`, req.body.relativePath);
        const result = await rendererHelper.saveProblemSource({
            problemSource: req.body.problemSource,
            writeFilePath: writeFilePath,
        });

        const resp = httpResponse.Ok('Saved', {
            filePath: result
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPostUploadAsset } from '@rederly/backend-validation';
router.post('/question/editor/upload-asset',
    authenticationMiddleware,
    rederlyTempFileWrapper((tmpFilePath: string) => multer({dest: tmpFilePath}).single('asset-file')),
    validationMiddleware(courseQuestionPostUploadAsset),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPostUploadAsset.IResponse, UploadAssetRequest.body, UploadAssetRequest.query>, _res: Response<courseQuestionPostUploadAsset.IResponse>, next: TypedNextFunction<courseQuestionPostUploadAsset.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser({
            where: {
                active: true
            }
        });

        const writeFilePath = urljoin(`private/my/${user.uuid}`, req.body.relativePath);
        const result = await rendererHelper.uploadAsset({
            filePath: req.file.path,
            rendererPath: writeFilePath
        });

        const resp = httpResponse.Ok('Uploaded', {
            filePath: result
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPostRead } from '@rederly/backend-validation';
router.post('/question/editor/read',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPostRead),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPostRead.IResponse, ReadQuestionRequest.body, ReadQuestionRequest.query>, _res: Response<courseQuestionPostRead.IResponse>, next: TypedNextFunction<courseQuestionPostRead.IResponse>) => {
        const sourceFilePath = req.body.filePath;
        // TODO if we use this regex elsewhere we should centralize
        // This should also be in the joi validation but due to time putting it here to handle the frontend
        if (!/^(:?private\/|Contrib\/|webwork-open-problem-library\/Contrib\/|Library\/|webwork-open-problem-library\/OpenProblemLibrary\/)\S+\.pg$/.test(sourceFilePath)) {
            throw new IllegalArgumentException('Invalid problem path; Problem paths must begin with private, Contrib or Library and end with a pg extension.');
        }
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const result = await rendererHelper.readProblemSource({
            sourceFilePath: sourceFilePath
        });

        const resp = httpResponse.Ok('Loaded', {
            problemSource: result
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPostCatalog } from '@rederly/backend-validation';
router.post('/question/editor/catalog',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPostCatalog as ValidationMiddlewareOptions),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPostCatalog.IResponse, CatalogRequest.body, CatalogRequest.query>, _res: Response<courseQuestionPostCatalog.IResponse>, next: TypedNextFunction<courseQuestionPostCatalog.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser({
            where: {
                active: true
            }
        });

        const basePath = `private/my/${user.uuid}`;
        const result = await rendererHelper.catalog({
            basePath: basePath,
            // TODO what should the depth be?
            // -1 did not do all
            maxDepth: 100,
        });

        const resp = httpResponse.Ok('Loaded', {
            problems: Object.keys(result).filter(elm => elm.endsWith('.pg'))
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesPostFeedback } from '@rederly/backend-validation';
import { ProblemAttachmentInterface } from '../../database/models/problem-attachment';
import { StudentEnrollmentInterface } from '../../database/models/student-enrollment';
router.post('/feedback', 
    authenticationMiddleware,
    validationMiddleware(coursesPostFeedback),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPostCatalog.IResponse, PostFeedbackRequest.body, unknown>, _res: Response<courseQuestionPostCatalog.IResponse>, next: TypedNextFunction<coursesPostFeedback.IResponse>) => {
        const res = await courseController.addFeedback({
            content: req.body.content,
            workbookId: (req.query as PostFeedbackRequest.query).workbookId,
        });

        const resp = httpResponse.Ok('Attachment record created', stripSequelizeFromUpdateResult<StudentWorkbookInterface>(res));
        next(resp as DeepAddIndexSignature<typeof resp>);
    })
);

module.exports = router;
