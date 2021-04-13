import * as express from 'express';
import courseController from './course-controller';
import { authenticationMiddleware, paidMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import NotFoundError from '../../exceptions/not-found-error';
import multer = require('multer');
import * as proxy from 'express-http-proxy';
import * as qs from 'qs';
import * as _ from 'lodash';
import configurations from '../../configurations';
import WrappedError from '../../exceptions/wrapped-error';
import { RederlyExpressRequest, EmptyExpressParams, EmptyExpressQuery, /*asyncHandler*/ } from '../../extensions/rederly-express-request';
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
import { ProblemAttachmentInterface } from '../../database/models/problem-attachment';
import { StudentEnrollmentInterface } from '../../database/models/student-enrollment';

// TODO temporary, for development so the backend will still build
export interface RederlyRequestHandler<P extends {} = {}, ResBody = unknown, ReqBody = unknown, ReqQuery extends {} = {}, MetaType = never> {
    // tslint:disable-next-line callable-types (This is extended from and can't extend from a type alias in ts<2.2)
    // temporary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req: RederlyExpressRequest<P, ResBody, ReqBody, ReqQuery, MetaType>, res: express.Response<ResBody>, next: (arg?: any) => void): void;
}

export const asyncHandler = <P extends {} = {}, ResBody = unknown, ReqBody = unknown, ReqQuery extends {} = {}, MetaType = never>(requestHandler: RederlyRequestHandler<P, ResBody, ReqBody, ReqQuery, MetaType>): express.RequestHandler => async (req, res, next): Promise<void> => {
    try {
        // temporary
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await requestHandler(req as any, res, next);
    } catch (e) {
        next(e);
    }
};

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
        next(resp as DeepAddIndexSignature<typeof resp>);
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
    asyncHandler<courseStatisticsGetTopics.IParams, courseStatisticsGetTopics.IResponse, courseStatisticsGetTopics.IBody, courseStatisticsGetTopics.IQuery>(async (req, _res, next) => {
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
    asyncHandler<coursesPostDef.IParams, coursesPostDef.IResponse, coursesPostDef.IBody, coursesPostDef.IQuery>(async (req, _res, next) => {
        const results = await courseController.createQuestionsForTopicFromDefFileContent({
            webworkDefFileContent: req.file.buffer.toString(),
            courseTopicId: req.query.courseTopicId
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
    asyncHandler<coursesPostCourses.IParams, coursesPostCourses.IResponse, coursesPostCourses.IBody, coursesPostCourses.IQuery>(async (req, _res, next) => {
        try {
            if (_.isNil(req.session)) {
                throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
            }

            if (_.isNil(req.query.useCurriculum)) {
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
                    useCurriculum: req.query.useCurriculum
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

import { courseTopicPostTopic } from '@rederly/backend-validation';
router.post('/topic',
    authenticationMiddleware,
    validationMiddleware(courseTopicPostTopic),
    paidMiddleware('Adding topics'),
    asyncHandler<courseTopicPostTopic.IParams, courseTopicPostTopic.IResponse, courseTopicPostTopic.IBody, courseTopicPostTopic.IQuery>(async (req, _res, next) => {
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
    asyncHandler<coursesGetGrades.IParams, coursesGetGrades.IResponse, coursesGetGrades.IBody, coursesGetGrades.IQuery>(async (req, _res, next) => {
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
    asyncHandler<coursesGetTopicGrades.IParams, coursesGetTopicGrades.IResponse, coursesGetTopicGrades.IBody, coursesGetTopicGrades.IQuery>(async (req, _res, next) => {
        const topics = await courseController.getGradesForTopics({
            courseId: req.params.id,
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
    asyncHandler<coursesGetQuestions.IParams, coursesGetQuestions.IResponse, coursesGetQuestions.IBody, coursesGetQuestions.IQuery>(async (req, _res, next) => {
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
    asyncHandler<courseTopicGetVersionByUserId.IParams, courseTopicGetVersionByUserId.IResponse, courseTopicGetVersionByUserId.IBody, courseTopicGetVersionByUserId.IQuery>(async (req, _res, next) => {
        const result = await courseController.getAllContentForVersion({topicId: req.params.topicId, userId: req.params.userId});
        const resp = httpResponse.Ok('Fetched successfully', result);
        next(resp as DeepAddIndexSignature<typeof resp>);
    })
);

import { courseTopicPutEndExport } from '@rederly/backend-validation';
router.put('/topic/:topicId/endExport', 
    // this call is expected from a microservice, so doesn't go through authentication
    validationMiddleware(courseTopicPutEndExport),
    asyncHandler<courseTopicPutEndExport.IParams, courseTopicPutEndExport.IResponse, courseTopicPutEndExport.IBody, courseTopicPutEndExport.IQuery>(async (req, _res, next) => {
        const topic = await CourseTopicContent.findOne({
            where: {
                id: req.params.id,
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
    asyncHandler<courseTopicPostStartExport.IParams, courseTopicPostStartExport.IResponse, courseTopicPostStartExport.IBody, courseTopicPostStartExport.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        
        const professor = await req.session.getUser();

        const topic = await CourseTopicContent.findOne({
            where: {
                id: req.params.id,
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
        if (req.query.force === false) {
            next(httpResponse.Ok('Details', exportDetails));
        } else {
            helper.start({
                topic, 
                professorUUID: professor.uuid,
                showSolutions: req.query.showSolutions ?? false,
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
    asyncHandler<courseTopicPutExtend.IParams, courseTopicPutExtend.IResponse, courseTopicPutExtend.IBody, courseTopicPutExtend.IQuery>(
        async (req, _res, next) => {
            const updatesResult = await courseController.extendTopicForUser({
                where: {
                    courseTopicContentId: req.query.courseTopicContentId,
                    userId: req.query.userId
                },
                assessmentWhere: {
                    topicAssessmentInfoId: req.query.topicAssessmentInfoId
                },
                updates: req.body,
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
    asyncHandler<courseTopicPutTopicById.IParams, courseTopicPutTopicById.IResponse, courseTopicPutTopicById.IBody, courseTopicPutTopicById.IQuery>(async (req, _res, next) => {
        const updatesResult = await courseController.updateTopic({
            where: {
                id: req.params.id
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
    asyncHandler<coursesGetGradeById.IParams, coursesGetGradeById.IResponse, coursesGetGradeById.IBody, coursesGetGradeById.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();
        if (await courseController.canUserGradeAssessment({user, topicId: req.params.id}) === false) {
            throw new ForbiddenError('You are not allowed to grade this assessment.');
        }

        const {problems, topic} = await courseController.getAssessmentForGrading({topicId: req.params.id});
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
    asyncHandler<coursesGetEndById.IParams, coursesGetEndById.IResponse, coursesGetEndById.IBody, coursesGetEndById.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const user = req.rederlyUser ?? await req.session.getUser();
        const version = await courseController.getStudentTopicAssessmentInfoById(req.params.id);

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
    asyncHandler<coursesGetStart.IParams, coursesGetStart.IResponse, coursesGetStart.IBody, coursesGetStart.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const user = req.rederlyUser ?? await req.session.getUser();
        const rederlyUserRole = req.rederlyUserRole ?? user.roleId;

        // function returns boolean and IF the user is not allowed to start a new version, a reason is included
        const { userCanStartNewVersion, message, data } = await courseController.canUserStartNewVersion({ user, topicId: req.params.id, role: rederlyUserRole });

        // will never have true + message
        if (userCanStartNewVersion === false && !_.isNil(message)) {
            throw new IllegalArgumentException(message, data);
        }

        const versionInfo = await courseController.createGradeInstancesForAssessment({
            topicId: req.params.id,
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
    asyncHandler<coursesDeleteUnitById.IParams, coursesDeleteUnitById.IResponse, coursesDeleteUnitById.IBody, coursesDeleteUnitById.IQuery>(async (req, _res, next) => {
        try {
            const updatesResult = await courseController.softDeleteUnits({
                id: req.params.id
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
    asyncHandler<courseTopicDeleteTopicById.IParams, courseTopicDeleteTopicById.IResponse, courseTopicDeleteTopicById.IBody, courseTopicDeleteTopicById.IQuery>(async (req, _res, next) => {
        try {
            const updatesResult = await courseController.softDeleteTopics({
                id: req.params.id
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
    asyncHandler<courseQuestionDeleteQuestionById.IParams, courseQuestionDeleteQuestionById.IResponse, courseQuestionDeleteQuestionById.IBody, courseQuestionDeleteQuestionById.IQuery>(async (req, _res, next) => {
        try {
            const updatesResult = await courseController.softDeleteQuestions({
                id: req.params.id
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

import { courseQuestionPutGradeById } from '@rederly/backend-validation';
router.put('/question/grade/:id',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPutGradeById),
    asyncHandler<courseQuestionPutGradeById.IParams, courseQuestionPutGradeById.IResponse, courseQuestionPutGradeById.IBody, courseQuestionPutGradeById.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const updatedRecords = await courseController.updateGrade({
            where: {
                id: req.params.id
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
    asyncHandler<courseQuestionPutInstanceById.IParams, courseQuestionPutInstanceById.IResponse, courseQuestionPutInstanceById.IBody, courseQuestionPutInstanceById.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const updatesResult = await courseController.updateGradeInstance({
            where: {
                id: req.params.id
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
    asyncHandler<courseQuestionPutExtend.IParams, courseQuestionPutExtend.IResponse, courseQuestionPutExtend.IBody, courseQuestionPutExtend.IQuery>(async (req, _res, next) => {
        const extensions = await courseController.extendQuestionForUser({
            where: {
                ...req.query
            },
            updates: {
                ...req.body
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
    asyncHandler<courseQuestionPutQuestionById.IParams, courseQuestionPutQuestionById.IResponse, courseQuestionPutQuestionById.IBody, courseQuestionPutQuestionById.IQuery>(async (req, _res, next) => {
        const updatesResult = await courseController.updateQuestion({
            where: {
                id: req.params.id
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

import { courseQuestionPostQuestion } from '@rederly/backend-validation';
router.post('/question',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPostQuestion),
    paidMiddleware('Adding questions'),
    asyncHandler<courseQuestionPostQuestion.IParams, courseQuestionPostQuestion.IResponse, courseQuestionPostQuestion.IBody, courseQuestionPostQuestion.IQuery>(async (req, _res, next) => {
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
    asyncHandler<courseQuestionGetRaw.IParams, courseQuestionGetRaw.IResponse, courseQuestionGetRaw.IBody, courseQuestionGetRaw.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const { id: questionId } = req.params;
        const { userId } = req.query;

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
    asyncHandler<courseQuestionGetGrade.IParams, courseQuestionGetGrade.IResponse, courseQuestionGetGrade.IBody, courseQuestionGetGrade.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const { userId, includeWorkbooks } = req.query;
        const { id: questionId } = req.params;

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
    asyncHandler<courseQuestionGetOpenlab.IParams, courseQuestionGetOpenlab.IResponse, courseQuestionGetOpenlab.IBody, courseQuestionGetOpenlab.IQuery>(async (req, res, next) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();
        const { id: questionId } = req.params;
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
    asyncHandler<courseQuestionGetSma.IParams, courseQuestionGetSma.IResponse, courseQuestionGetSma.IBody, courseQuestionGetSma.IQuery>(async (req, res, next) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const userId = await req.session.userId;
        const { id: questionId } = req.params;

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
    asyncHandler<courseQuestionGetQuestionById.IParams, courseQuestionGetQuestionById.IResponse, courseQuestionGetQuestionById.IBody, courseQuestionGetQuestionById.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const requestingUser = req.rederlyUser ?? await req.session.getUser();
        const rederlyUserRole = req.rederlyUserRole ?? requestingUser.roleId;

        const { id: questionId } = req.params;
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
    asyncHandler<coursesPostAuto.IParams, coursesPostAuto.IResponse, coursesPostAuto.IBody, coursesPostAuto.IQuery>(async (req, _res, next) => {
        try {
            const assessmentResult = await courseController.submitAssessmentAnswers(req.params.version, true); // false: wasAutoSubmitted
            const resp = httpResponse.Ok('Assessment submitted successfully', assessmentResult);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            if (e instanceof AttemptsExceededException) {
                logger.warn('This assessment version has no attempts remaining but was auto submitted.', JSON.stringify({
                    assessmentVersionId: req.params.version,
                    topicId: req.params.id
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
    // Before this wasn't being strongly typed, it is based on the other one but uses dummy data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler<coursesPostPreview.IParams, coursesPostPreview.IResponse, coursesPostPreview.IBody, coursesPostPreview.IQuery, any>(async (req, _res, next) => {
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

import { coursesPostSubmitByVersion } from '@rederly/backend-validation';
router.post('/assessment/topic/:id/submit/:version',
    authenticationMiddleware,
    validationMiddleware(coursesPostSubmitByVersion),
    asyncHandler<coursesPostSubmitByVersion.IParams, coursesPostSubmitByVersion.IResponse, coursesPostSubmitByVersion.IBody, coursesPostSubmitByVersion.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();


        const studentTopicAssessmentInfo = await courseController.getStudentTopicAssessmentInfoById(req.params.version);
        if (user.id != studentTopicAssessmentInfo.userId) {
            throw new Error('You cannot submit an assessment that does not belong to you.');
        }

        if (studentTopicAssessmentInfo.maxAttempts > 0 && studentTopicAssessmentInfo.numAttempts >= studentTopicAssessmentInfo.maxAttempts) {
            throw new IllegalArgumentException('This assessment version has no attempts remaining.');
        }

        const assessmentResult = await courseController.submitAssessmentAnswers(req.params.version, false); // false: wasAutoSubmitted
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
    asyncHandler<courseQuestionPostQuestionById.IParams, courseQuestionPostQuestionById.IResponse, courseQuestionPostQuestionById.IBody, courseQuestionPostQuestionById.IQuery, PostQuestionMeta>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();
        const rederlyUserRole = req.rederlyUserRole ?? user.roleId;

        const question = await courseController.getQuestionRecord(req.params.id);

        const rendererParams = await courseController.getCalculatedRendererParams({
            courseQuestion: question,
            role: rederlyUserRole,
            userId: user.id
        });

        const studentGrade = await StudentGrade.findOne({
            where: {
                userId: user.id,
                courseWWTopicQuestionId: req.params.id
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
        proxyReqPathResolver: (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPostQuestionById.IResponse, courseQuestionPostQuestionById.IBody, EmptyExpressQuery, PostQuestionMeta>) => {
            if (_.isNil(req.meta)) {
                throw new Error('Previously fetched metadata is nil');
            }
            const rendererParams: GetProblemParameters = {
                format: 'json',
                formURL: req.originalUrl,
                baseURL: '/',
                ...req.meta?.rendererParams,
                numIncorrect: req.meta.studentGrade?.numAttempts
            };
            return `${RENDERER_ENDPOINT}?${qs.stringify(rendererParams)}`;
        },
        userResDecorator: async (proxyRes, proxyResData, userReq: RederlyExpressRequest<EmptyExpressParams, courseQuestionPostQuestionById.IResponse, courseQuestionPostQuestionById.IBody, EmptyExpressQuery, PostQuestionMeta>) => {
            // Async handler can't be used here since this is part of the proxy
            const params = userReq.params as courseQuestionPostQuestionById.IParams;
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

            const result = await courseController.submitAnswer({
                userId: userReq.session.userId,
                questionId: params.id,
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
    asyncHandler<coursesGetCourses.IParams, coursesGetCourses.IResponse, coursesGetCourses.IBody, coursesGetCourses.IQuery>(async (req, _res, next) => {
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
    asyncHandler<coursesGetCourseList.IParams, coursesGetCourseList.IResponse, coursesGetCourseList.IBody, coursesGetCourseList.IQuery>(async (req, _res, next) => {
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
    asyncHandler<coursesGetUnitList.IParams, coursesGetUnitList.IResponse, coursesGetUnitList.IBody, coursesGetUnitList.IQuery>(async (req, _res, next) => {
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
    asyncHandler<coursesGetTopicList.IParams, coursesGetTopicList.IResponse, coursesGetTopicList.IBody, coursesGetTopicList.IQuery>(async (req, _res, next) => {
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
    asyncHandler<coursesGetSearch.IParams, coursesGetSearch.IResponse, coursesGetSearch.IBody, coursesGetSearch.IQuery>(async (req, _res, next) => {
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
    asyncHandler<courseTopicGetTopicById.IParams, courseTopicGetTopicById.IResponse, courseTopicGetTopicById.IBody, courseTopicGetTopicById.IQuery>(async (req, _res, next) => {
        const result = await courseController.getTopicById({
            id: req.params.id, 
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
    asyncHandler<coursesGetTopics.IParams, coursesGetTopics.IResponse, coursesGetTopics.IBody, coursesGetTopics.IQuery>(async (req, _res, next) => {
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
    asyncHandler<coursesGetCoursesById.IParams, coursesGetCoursesById.IResponse, coursesGetCoursesById.IBody, coursesGetCoursesById.IQuery>(async (req, _res, next) => {
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
    asyncHandler<coursesPostEnrollByCode.IParams, coursesPostEnrollByCode.IResponse, coursesPostEnrollByCode.IBody, coursesPostEnrollByCode.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }


        const session = req.session;
        try {
            const enrollment = await courseController.enrollByCode({
                code: req.params.code,
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
    asyncHandler<coursesDeleteEnroll.IParams, coursesDeleteEnroll.IResponse, coursesDeleteEnroll.IBody, coursesDeleteEnroll.IQuery>(async (req, _res, next) => {
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
router.post('/attachments/upload-url',
    authenticationMiddleware,
    validationMiddleware(coursesPostUploadUrl),
    asyncHandler<coursesPostUploadUrl.IParams, coursesPostUploadUrl.IResponse, coursesPostUploadUrl.IBody, coursesPostUploadUrl.IQuery>(async (req, _res, next) => {
        const result = await attachmentHelper.getNewPresignedURL();
        const resp = httpResponse.Ok('Get new presigned url success', result);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesPostAttachments } from '@rederly/backend-validation';
router.post('/attachments',
    authenticationMiddleware,
    validationMiddleware(coursesPostAttachments),
    asyncHandler<coursesPostAttachments.IParams, coursesPostAttachments.IResponse, coursesPostAttachments.IBody, coursesPostAttachments.IQuery>(async (req, _res, next) => {
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
    asyncHandler<coursesGetList.IParams, coursesGetList.IResponse, coursesGetList.IBody, coursesGetList.IQuery>(async (req, _res, next) => {
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
    asyncHandler<coursesDeleteAttachmentsById.IParams, coursesDeleteAttachmentsById.IResponse, coursesDeleteAttachmentsById.IBody, coursesDeleteAttachmentsById.IQuery>(async (req, _res, next) => {
        // TODO permission to check if user has access to the provided grade or grade instance
        const result = await courseController.deleteAttachment({
            problemAttachmentId: req.params.id
        });

        const resp = httpResponse.Ok('Attachment deleted successfully', stripSequelizeFromUpdateResult<ProblemAttachmentInterface>(result));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPostSave } from '@rederly/backend-validation';
router.post('/question/editor/save',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPostSave),
    asyncHandler<courseQuestionPostSave.IParams, courseQuestionPostSave.IResponse, courseQuestionPostSave.IBody, courseQuestionPostSave.IQuery>(async (req, _res, next) => {
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
    asyncHandler<courseQuestionPostUploadAsset.IParams, courseQuestionPostUploadAsset.IResponse, courseQuestionPostUploadAsset.IBody, courseQuestionPostUploadAsset.IQuery>(async (req, _res, next) => {
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
    asyncHandler<courseQuestionPostRead.IParams, courseQuestionPostRead.IResponse, courseQuestionPostRead.IBody, courseQuestionPostRead.IQuery>(async (req, _res, next) => {
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
    asyncHandler<courseQuestionPostCatalog.IParams, courseQuestionPostCatalog.IResponse, courseQuestionPostCatalog.IBody, courseQuestionPostCatalog.IQuery>(async (req, _res, next) => {
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
router.post('/feedback', 
    authenticationMiddleware,
    validationMiddleware(coursesPostFeedback),
    asyncHandler<coursesPostFeedback.IParams, courseQuestionPostCatalog.IResponse, coursesPostFeedback.IBody, coursesPostFeedback.IQuery>(async (req, _res, next) => {
        const res = await courseController.addFeedback({
            content: req.body.content,
            workbookId: req.query.workbookId,
        });

        const resp = httpResponse.Ok('Attachment record created', stripSequelizeFromUpdateResult<StudentWorkbookInterface>(res));
        next(resp as DeepAddIndexSignature<typeof resp>);
    })
);
