import { Request, Response, NextFunction } from 'express';
import courseController from './course-controller';
const router = require('express').Router();
import validate from '../../middleware/joi-validator';
import { authenticationMiddleware, paidMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import * as asyncHandler from 'express-async-handler';
import { createCourseValidation, getCourseValidation, enrollInCourseValidation, listCoursesValidation, createCourseUnitValidation, createCourseTopicValidation, createCourseTopicQuestionValidation, getQuestionValidation, updateCourseTopicValidation, getGradesValidation, updateCourseUnitValidation, getStatisticsOnUnitsValidation, getStatisticsOnTopicsValidation, getStatisticsOnQuestionsValidation, getTopicsValidation, getQuestionsValidation, enrollInCourseByCodeValidation, updateCourseTopicQuestionValidation, updateCourseValidation, createQuestionsForTopicFromDefFileValidation, deleteCourseTopicValidation, deleteCourseQuestionValidation, deleteCourseUnitValidation, updateGradeValidation, deleteEnrollmentValidation, createAssessmentVersionValidation, extendCourseTopicForUserValidation, extendCourseTopicQuestionValidation, getTopicValidation, submitAssessmentVersionValidation, endAssessmentVersionValidation, previewQuestionValidation, gradeAssessmentValidation, getAttachmentPresignedURLValidation, postAttachmentValidation, listAttachmentsValidation, deleteAttachmentValidation, emailProfValidation, readQuestionValidation, saveQuestionValidation, catalogValidation, getVersionValidation, getQuestionRawValidation, getQuestionGradeValidation, getQuestionOpenLabValidation, postImportCourseArchiveValidation } from './course-route-validation';
import NotFoundError from '../../exceptions/not-found-error';
import multer = require('multer');
import * as proxy from 'express-http-proxy';
import * as qs from 'qs';
import * as _ from 'lodash';
import configurations from '../../configurations';
import WrappedError from '../../exceptions/wrapped-error';
import { RederlyExpressRequest } from '../../extensions/rederly-express-request';
import { GetStatisticsOnUnitsRequest, GetStatisticsOnTopicsRequest, GetStatisticsOnQuestionsRequest, CreateCourseRequest, CreateCourseUnitRequest, GetGradesRequest, GetQuestionsRequest, UpdateCourseTopicRequest, UpdateCourseUnitRequest, CreateCourseTopicQuestionRequest, GetQuestionRequest, ListCoursesRequest, GetTopicsRequest, GetCourseRequest, EnrollInCourseRequest, EnrollInCourseByCodeRequest, UpdateCourseRequest, UpdateCourseTopicQuestionRequest, CreateQuestionsForTopicFromDefFileRequest, DeleteCourseUnitRequest, DeleteCourseTopicRequest, DeleteCourseQuestionRequest, UpdateGradeRequest, DeleteEnrollmentRequest, ExtendCourseTopicForUserRequest, GetTopicRequest, ExtendCourseTopicQuestionRequest, CreateAssessmentVersionRequest, SubmitAssessmentVersionRequest, UpdateGradeInstanceRequest, EndAssessmentVersionRequest, PreviewQuestionRequest, GradeAssessmentRequest, GetAttachmentPresignedURLRequest, PostAttachmentRequest, ListAttachmentsRequest, DeleteAttachmentRequest, EmailProfRequest, ReadQuestionRequest, SaveQuestionRequest, CatalogRequest, GetVersionRequest, GetQuestionRawRequest, GetQuestionGradeRequest, PostImportCourseArchiveRequest, GetQuestionOpenLabRequest } from './course-route-request-types';
import Boom = require('boom');
import { Constants } from '../../constants';
import Role from '../permissions/roles';
import { PostQuestionMeta } from './course-types';
import rendererHelper, { RENDERER_ENDPOINT, GetProblemParameters, RendererResponse } from '../../utilities/renderer-helper';
import StudentGrade from '../../database/models/student-grade';
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

const fileUpload = multer();

router.post('/:courseId/import-archive',
    authenticationMiddleware,
    validate(postImportCourseArchiveValidation),
    paidMiddleware('Importing content from an archive'),
    rederlyTempFileWrapper((tmpFilePath: string) => multer({dest: tmpFilePath}).single('file')),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, PostImportCourseArchiveRequest.body, PostImportCourseArchiveRequest.query>, _res: unknown, next: NextFunction) => {
        if (_.isNil(req.file)) {
            throw new IllegalArgumentException('Missing file.');
        }
        const params = req.params as PostImportCourseArchiveRequest.params;
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const user = await req.session.getUser({
            where: {
                active: true
            }
        });

        const result = await courseController.importCourseTarball({
            filePath: req.file.path,
            fileName: req.file.originalname,
            courseId: params.courseId,
            user: user,
        });
        next(httpResponse.Ok(null, result));
    }));

router.get('/statistics/units',
    authenticationMiddleware,
    validate(getStatisticsOnUnitsValidation),
    asyncHandler(async (req: RederlyExpressRequest<GetStatisticsOnUnitsRequest.params, unknown, GetStatisticsOnUnitsRequest.body, GetStatisticsOnUnitsRequest.query>, _res: Response, next: NextFunction) => {
        try {
            const stats = await courseController.getStatisticsOnUnits({
                where: {
                    courseId: req.query.courseId,
                    userId: req.query.userId,
                },
                followQuestionRules: !_.isNil(req.query.userId)
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            next(httpResponse.Ok('Fetched successfully', {
                data: stats,
                ...getAveragesFromStatistics(stats),
            }));
        } catch (e) {
            next(e);
        }
    }));

router.get('/statistics/topics',
    authenticationMiddleware,
    validate(getStatisticsOnTopicsValidation),
    asyncHandler(async (req: RederlyExpressRequest<GetStatisticsOnTopicsRequest.params, unknown, GetStatisticsOnTopicsRequest.body, GetStatisticsOnTopicsRequest.query>, _res: Response, next: NextFunction) => {
        try {
            const stats = await courseController.getStatisticsOnTopics({
                where: {
                    courseUnitContentId: req.query.courseUnitContentId,
                    courseId: req.query.courseId,
                    userId: req.query.userId,
                },
                followQuestionRules: !_.isNil(req.query.userId)
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            next(httpResponse.Ok('Fetched successfully', {
                data: stats,
                ...getAveragesFromStatistics(stats),
            }));
        } catch (e) {
            next(e);
        }
    }));

router.get('/statistics/questions',
    authenticationMiddleware,
    validate(getStatisticsOnQuestionsValidation),
    asyncHandler(async (req: RederlyExpressRequest<GetStatisticsOnQuestionsRequest.params, unknown, GetStatisticsOnQuestionsRequest.body, GetStatisticsOnQuestionsRequest.query>, _res: Response, next: NextFunction) => {
        try {
            const stats = await courseController.getStatisticsOnQuestions({
                where: {
                    courseTopicContentId: req.query.courseTopicContentId,
                    courseId: req.query.courseId,
                    userId: req.query.userId,
                },
                followQuestionRules: !_.isNil(req.query.userId)
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            next(httpResponse.Ok('Fetched successfully', {
                data: stats,
                ...getAveragesFromStatistics(stats),
            }));
        } catch (e) {
            next(e);
        }
    }));

router.post('/def',
    authenticationMiddleware,
    validate(createQuestionsForTopicFromDefFileValidation),
    paidMiddleware('Importing a topic'),
    fileUpload.single('def-file'),
    asyncHandler(async (req: RederlyExpressRequest<CreateQuestionsForTopicFromDefFileRequest.params, unknown, CreateQuestionsForTopicFromDefFileRequest.body, unknown>, _res: Response, next: NextFunction) => {
        const query = req.query as CreateQuestionsForTopicFromDefFileRequest.query;
        const results = await courseController.createQuestionsForTopicFromDefFileContent({
            webworkDefFileContent: req.file.buffer.toString(),
            courseTopicId: query.courseTopicId
        });
        next(httpResponse.Created('Course successfully', {
            newQuestions: results
        }));
    }));

router.post('/',
    authenticationMiddleware,
    validate(createCourseValidation),
    paidMiddleware('Creating a new course'),
    asyncHandler(async (req: RederlyExpressRequest<CreateCourseRequest.params, unknown, CreateCourseRequest.body, unknown>, _res: Response, next: NextFunction) => {
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
            next(httpResponse.Created('Course successfully', newCourse));
        } catch (e) {
            next(e);
        }
    }));

router.post('/unit',
    authenticationMiddleware,
    validate(createCourseUnitValidation),
    paidMiddleware('Adding units'),
    asyncHandler(async (req: RederlyExpressRequest<CreateCourseUnitRequest.params, unknown, CreateCourseUnitRequest.body, CreateCourseUnitRequest.query>, _res: Response, next: NextFunction) => {
        try {
            const newUnit = await courseController.createUnit({
                ...req.body
            });
            // TODO handle not found case
            next(httpResponse.Created('Course Unit created successfully', newUnit));
        } catch (e) {
            next(e);
        }
    }));

router.post('/topic',
    authenticationMiddleware,
    validate(createCourseTopicValidation),
    paidMiddleware('Adding topics'),
    asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
        const newTopic = await courseController.createTopic({
            ...req.body
        });

        next(httpResponse.Created('Course Topic created successfully', newTopic));
    }));

router.get('/grades',
    authenticationMiddleware,
    validate(getGradesValidation),
    asyncHandler(async (req: RederlyExpressRequest<GetGradesRequest.params, unknown, GetGradesRequest.body, GetGradesRequest.query>, _res: Response, next: NextFunction) => {
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
            next(httpResponse.Ok('Fetched successfully', grades));
        } catch (e) {
            next(e);
        }
    }));

router.get('/questions',
    authenticationMiddleware,
    validate(getQuestionsValidation),
    asyncHandler(async (req: RederlyExpressRequest<GetQuestionsRequest.params, unknown, GetQuestionsRequest.body, GetQuestionsRequest.query>, _res: Response, next: NextFunction) => {
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
                return;
            }
        } else if (typeof userIdInput === 'number') {
            userId = userIdInput;
        }

        if (_.isNil(userId)) {
            throw new WrappedError('It is impossible for userId to still be undefined here.');
        }

        const {
            message,
            userCanGetQuestions,
            topic,
            version
        } = await courseController.canUserGetQuestions({
            userId,
            courseTopicContentId: req.query.courseTopicContentId,
            studentTopicAssessmentInfoId: req.query.studentTopicAssessmentInfoId,
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

        next(httpResponse.Ok(null, {
            questions: questions,
            topic
        }));
    }));


router.get('/topic/:topicId/version/:userId',
    authenticationMiddleware,
    validate(getVersionValidation),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GetVersionRequest.body, GetVersionRequest.query>, _res: Response, next: NextFunction) => {
        const params: GetVersionRequest.params = req.params;
        const result = await courseController.getAllContentForVersion({topicId: params.topicId, userId: params.userId});
        next(httpResponse.Ok('Fetched successfully', result));
    })
);

router.put('/topic/extend',
    authenticationMiddleware,
    validate(extendCourseTopicForUserValidation),
    paidMiddleware('Modifying topic settings'),
    asyncHandler(
        async (req: RederlyExpressRequest<ExtendCourseTopicForUserRequest.params, ExtendCourseTopicForUserRequest.body, ExtendCourseTopicForUserRequest.query, unknown>, _res: Response, next: NextFunction) => {
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
            next(httpResponse.Ok('Extended topic successfully', updatesResult));
        }));

router.put('/topic/:id',
    authenticationMiddleware,
    validate(updateCourseTopicValidation),
    paidMiddleware('Modifying topic settings'),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, UpdateCourseTopicRequest.body, UpdateCourseTopicRequest.query>, _res: Response, next: NextFunction) => {
        const params = req.params as UpdateCourseTopicRequest.params;
        try {
            const updatesResult = await courseController.updateTopic({
                where: {
                    id: params.id
                },
                updates: {
                    ...req.body
                }
            });
            // TODO handle not found case
            next(httpResponse.Ok('Updated topic successfully', {
                updatesResult,
                updatesCount: updatesResult.length
            }));
        } catch (e) {
            next(e);
        }
    }));

router.get('/assessment/topic/grade/:id',
    authenticationMiddleware,
    validate(gradeAssessmentValidation),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GradeAssessmentRequest.body, GradeAssessmentRequest.query>, _res: Response, next: NextFunction) => {
        const params = req.params as GradeAssessmentRequest.params;
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = await req.session.getUser();
        if (await courseController.canUserGradeAssessment({user, topicId: params.id}) === false) {
            throw new ForbiddenError('You are not allowed to grade this assessment.');
        }

        const {problems, topic} = await courseController.getAssessmentForGrading({topicId: params.id});
        next(httpResponse.Ok('Fetched problems + workbooks successfully', {problems, topic}));
    }));

router.get('/assessment/topic/end/:id',
    authenticationMiddleware,
    validate(endAssessmentVersionValidation),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, EndAssessmentVersionRequest.body, EndAssessmentVersionRequest.query>, _res: Response, next: NextFunction) => {
        const params = req.params as EndAssessmentVersionRequest.params;
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const user = await req.session.getUser();
        const version = await courseController.getStudentTopicAssessmentInfoById(params.id);

        if (version.userId !== user.id) {
            throw new ForbiddenError('You may not end an exam that does not belong to you.');
        }

        if (version.numAttempts === 0) {
            throw new ForbiddenError('You cannot end an exam without making at least one attempt.');
        }

        await courseController.endAssessmentEarly(version, true);

        next(httpResponse.Ok('Assessment version has been closed.'));
    }));

router.get('/assessment/topic/:id/start',
    authenticationMiddleware,
    validate(createAssessmentVersionValidation),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, CreateAssessmentVersionRequest.body, CreateAssessmentVersionRequest.query>, _res: Response, next: NextFunction) => {
        const params = req.params as CreateAssessmentVersionRequest.params;
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const user = await req.session.getUser();

        // function returns boolean and IF the user is not allowed to start a new version, a reason is included
        const { userCanStartNewVersion, message, data } = await courseController.canUserStartNewVersion({ user, topicId: params.id });

        // will never have true + message
        if (userCanStartNewVersion === false && !_.isNil(message)) {
            throw new IllegalArgumentException(message, data);
        }

        const versionInfo = await courseController.createGradeInstancesForAssessment({
            topicId: params.id,
            userId: user.id,
            requestURL: req.headers['rederly-origin'] as string | undefined // need this because it incorrectly thinks it can be an array
        });

        next(httpResponse.Ok('New version of this assessment created successfully', versionInfo));
    }));

router.delete('/unit/:id',
    authenticationMiddleware,
    validate(deleteCourseUnitValidation),
    paidMiddleware('Deleting units'),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, DeleteCourseUnitRequest.body, DeleteCourseUnitRequest.query>, _res: Response, next: NextFunction) => {
        const params = req.params as DeleteCourseUnitRequest.params;
        try {
            const updatesResult = await courseController.softDeleteUnits({
                id: params.id
            });
            // TODO handle not found case
            next(httpResponse.Ok('Deleted units and subobjects successfully', {
                updatedRecords: updatesResult.updatedRecords,
                updatesCount: updatesResult.updatedCount
            }));
        } catch (e) {
            next(e);
        }
    }));

router.delete('/topic/:id',
    authenticationMiddleware,
    validate(deleteCourseTopicValidation),
    paidMiddleware('Deleting topics'),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, DeleteCourseTopicRequest.body, DeleteCourseTopicRequest.query>, _res: Response, next: NextFunction) => {
        const params = req.params as DeleteCourseTopicRequest.params;
        try {
            const updatesResult = await courseController.softDeleteTopics({
                id: params.id
            });
            // TODO handle not found case
            next(httpResponse.Ok('Deleted topics and subobjects successfully', {
                updatedRecords: updatesResult.updatedRecords,
                updatesCount: updatesResult.updatedCount
            }));
        } catch (e) {
            next(e);
        }
    }));

router.delete('/question/:id',
    authenticationMiddleware,
    validate(deleteCourseQuestionValidation),
    paidMiddleware('Deleting questions'),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, DeleteCourseQuestionRequest.body, DeleteCourseQuestionRequest.query>, _res: Response, next: NextFunction) => {
        const params = req.params as DeleteCourseQuestionRequest.params;
        try {
            const updatesResult = await courseController.softDeleteQuestions({
                id: params.id
            });
            // TODO handle not found case
            next(httpResponse.Ok('Deleted questions and subobjects successfully', {
                updatedRecords: updatesResult.updatedRecords,
                updatesCount: updatesResult.updatedCount
            }));
        } catch (e) {
            next(e);
        }
    }));

router.put('/unit/:id',
    authenticationMiddleware,
    validate(updateCourseUnitValidation),
    paidMiddleware('Updating units'),
    // This is to work around "extractMap" error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, UpdateCourseUnitRequest.body, UpdateCourseUnitRequest.query>, _res: Response, next: NextFunction) => {
        try {
            const params = req.params as UpdateCourseUnitRequest.params;
            const updatesResult = await courseController.updateCourseUnit({
                where: {
                    id: params.id
                },
                updates: {
                    ...req.body
                }
            });
            // TODO handle not found case
            next(httpResponse.Ok('Updated unit successfully', {
                updatesResult,
                updatesCount: updatesResult.length
            }));
        } catch (e) {
            next(e);
        }
    }));

router.put('/question/grade/:id',
    authenticationMiddleware,
    validate(updateGradeValidation),
    // This is to work around "extractMap" error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, UpdateGradeRequest.body, UpdateGradeRequest.query>, _res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const params = req.params as UpdateCourseTopicQuestionRequest.params;
        const updatesResult = await courseController.updateGrade({
            where: {
                id: params.id
            },
            updates: {
                ...req.body
            },
            initiatingUserId: req.session.userId
        });
        next(httpResponse.Ok('Updated grade successfully', {
            updatesResult,
            updatesCount: updatesResult.updatedCount
        }));
    }));

router.put('/question/grade/instance/:id',
    authenticationMiddleware,
    validate(updateGradeValidation),
    // This is to work around "extractMap" error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, UpdateGradeInstanceRequest.body, UpdateGradeInstanceRequest.query>, _res: Response, next: NextFunction) => {
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
        next(httpResponse.Ok('Updated grade successfully', {
            updatesResult,
            updatesCount: updatesResult.updatedCount
        }));
    }));

router.put('/question/extend',
    authenticationMiddleware,
    validate(extendCourseTopicQuestionValidation),
    paidMiddleware('Modifying questions'),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, ExtendCourseTopicQuestionRequest.body, unknown, any, unknown>, _res: Response, next: NextFunction) => {
        const query = req.query as ExtendCourseTopicQuestionRequest.query;
        const body = req.body as ExtendCourseTopicQuestionRequest.body;

        const extensions = await courseController.extendQuestionForUser({
            where: {
                ...query
            },
            updates: {
                ...body
            }
        });
        next(httpResponse.Ok('Extended topic successfully', extensions));
    }));

router.put('/question/:id',
    authenticationMiddleware,
    validate(updateCourseTopicQuestionValidation),
    paidMiddleware('Modifying questions'),
    // This is to work around "extractMap" error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, UpdateCourseTopicQuestionRequest.body, UpdateCourseTopicQuestionRequest.query>, _res: Response, next: NextFunction) => {
        const params = req.params as UpdateCourseTopicQuestionRequest.params;
        const updatesResult = await courseController.updateQuestion({
            where: {
                id: params.id
            },
            updates: {
                ...req.body
            }
        });
        next(httpResponse.Ok('Updated question successfully', {
            updatesResult,
            updatesCount: updatesResult.length
        }));
    }));

router.put('/:id',
    authenticationMiddleware,
    validate(updateCourseValidation),
    paidMiddleware('Modifying courses'),
    // This is to work around "extractMap" error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, UpdateCourseRequest.body, UpdateCourseRequest.query>, _res: Response, next: NextFunction) => {
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
            next(httpResponse.Ok('Updated course successfully', {
                updatesResult,
                updatesCount: updatesResult.length
            }));
        } catch (e) {
            next(e);
        }
    }));

router.post('/question',
    authenticationMiddleware,
    validate(createCourseTopicQuestionValidation),
    paidMiddleware('Adding questions'),
    asyncHandler(async (req: RederlyExpressRequest<CreateCourseTopicQuestionRequest.params, unknown, CreateCourseTopicQuestionRequest.body, CreateCourseTopicQuestionRequest.query>, _res: Response, next: NextFunction) => {
        const newQuestion = await courseController.addQuestion({
            question: {
                ...req.body
            }
        });
        // TODO handle not found case
        next(httpResponse.Created('Course Question created successfully', newQuestion));
    }));

router.get('/question/:id/raw',
    authenticationMiddleware,
    validate(getQuestionRawValidation),
    // This is a typescript workaround since it tries to use the type extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GetQuestionRawRequest.body, unknown>, _res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const { id: questionId } = req.params as GetQuestionRawRequest.params;
        const { userId } = req.query as GetQuestionRawRequest.query;

        const question = await courseController.getQuestionWithoutRenderer({
                id: questionId,
                userId,
            });
        next(httpResponse.Ok('Fetched question successfully', question));
    }));

router.get('/question/:id/grade',
    authenticationMiddleware,
    validate(getQuestionGradeValidation),
    // This is a typescript workaround since it tries to use the type extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GetQuestionGradeRequest.body, unknown>, _res: Response, next: NextFunction) => {
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

        next(httpResponse.Ok('Fetched question grade successfully', grade));

    }));

router.get('/question/:id/openlab',
    authenticationMiddleware,
    validate(getQuestionOpenLabValidation),
    // This is a typescript workaround since it tries to use the type extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GetQuestionOpenLabRequest.body, GetQuestionOpenLabRequest.query>, res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = await req.session.getUser();
        const { id: questionId } = req.params as GetQuestionOpenLabRequest.params;
        const baseURL = req.headers['rederly-origin'] as string | undefined; // need this because it incorrectly thinks it can be an array
        if (_.isNil(baseURL)) {
            throw new RederlyError('Could not determine the base URL from the ask for help request');
        }

        const openLabRedirectInfo = await courseController.prepareOpenLabRedirect({user, questionId, baseURL});
        const openLabResponse = await openLabHelper.askForHelp(openLabRedirectInfo);

        next(httpResponse.Ok('Data sent to OpenLab successfully', openLabResponse));
    }));

router.get('/question/:id',
    authenticationMiddleware,
    validate(getQuestionValidation),
    // This is a typescript workaround since it tries to use the type extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GetQuestionRequest.body, GetQuestionRequest.query>, _res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const requestingUser = await req.session.getUser();

        const { id: questionId } = req.params as GetQuestionRequest.params;
        const { readonly, workbookId, userId: requestedUserId, studentTopicAssessmentInfoId } = req.query;
        try {
            // check to see if we should allow this question to be viewed
            const {
                userCanViewQuestion,
                message
            } = await courseController.canUserViewQuestionId({
                user: requestingUser,
                questionId,
                studentTopicAssessmentInfoId
            });

            if (userCanViewQuestion === false) throw new IllegalArgumentException(message);

            const question = await courseController.getQuestion({
                questionId,
                userId: requestedUserId ?? requestingUser.id,
                formURL: req.originalUrl,
                role: requestingUser.roleId,
                readonly,
                workbookId,
                studentTopicAssessmentInfoId
            });
            next(httpResponse.Ok('Fetched question successfully', question));

            // If testing renderer integration from the browser without the front end simply return the rendered html
            // To do so first uncomment the below res.send and comment out the above next
            // Also when in the browser console add your auth token (`document.cookie = "sessionToken=UUID;`)
            // Don't forget to do this in post as well
            // res.send(question.rendererData.renderedHTML);
        } catch (e) {
            next(e);
        }
    }));

router.post('/assessment/topic/:id/submit/:version/auto',
    validate(submitAssessmentVersionValidation),
    // This is a typescript workaround since it tries to use the type extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, unknown, SubmitAssessmentVersionRequest.body, SubmitAssessmentVersionRequest.query>, _res: Response, next: NextFunction) => {
        const params = req.params as SubmitAssessmentVersionRequest.params;
        try {
            const assessmentResult = await courseController.submitAssessmentAnswers(params.version, true); // false: wasAutoSubmitted
            next(httpResponse.Ok('Assessment submitted successfully', assessmentResult));
        } catch (e) {
            if (e instanceof AttemptsExceededException) {
                logger.warn('This assessment version has no attempts remaining but was auto submitted.', JSON.stringify({
                    assessmentVersionId: params.version,
                    topicId: params.id
                }));
                next(httpResponse.Ok('Attempts exceeded skipping auto submit'));
            } else {
                logger.error('Auto submit ran into uncaught error', e);
                throw e;
            }
        }
    }));

//TODO: Probably move this up?
router.post('/preview',
    authenticationMiddleware,
    // TODO investigate if this is a problem
    // if the body were to be consumed it should hang here
    bodyParser.raw({
        type: '*/*'
    }),
    validate(previewQuestionValidation),
    // This is a typescript workaround since it tries to use the type extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, GetQuestionRequest.body, PreviewQuestionRequest.query>, _res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = await req.session.getUser();
        if (user.roleId === Role.STUDENT) throw new ForbiddenError('Preview is not available.');

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
            return next();
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
                role: user.roleId,
            });
            next(httpResponse.Ok('Fetched question successfully', question));

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
        // Can't use unknown due to restrictions on the type from express
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        proxyReqPathResolver: (req: RederlyExpressRequest<any, unknown, unknown, unknown, PostQuestionMeta>) => {
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
        // Can't use unknown due to restrictions on the type from express
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userResDecorator: async (_proxyRes, proxyResData, userReq: RederlyExpressRequest<any, unknown, unknown, unknown, PostQuestionMeta>) => {
            if (_.isNil(userReq.session)) {
                throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
            }

            if (_.isNil(userReq.meta)) {
                throw new Error('Previously fetched metadata is nil');
            }


            let rendererResponse: RendererResponse | null = null;
            try {
                rendererResponse = await rendererHelper.parseRendererResponse(proxyResData.toString('utf8'), {
                    questionPath: userReq.meta.courseQuestion.webworkQuestionPath,
                    questionRandomSeed: userReq.meta.studentGrade?.randomSeed
                });
            } catch (e) {
                throw new WrappedError(`Error parsing data response from renderer on question ${userReq.meta?.studentGrade?.courseWWTopicQuestionId} for grade ${userReq.meta?.studentGrade?.id}`, e);
            }

            // There is no way to get next callback, however anything thrown will get sent to next
            // Using the below line will responde with a 201 the way we do in our routes
            throw httpResponse.Ok('Answer submitted for question', {
                rendererData: rendererHelper.cleanRendererResponseForTheResponse(rendererResponse),
            });

            // If testing renderer integration from the browser without the front end simply return the rendered html
            // To do so first uncomment the below return and comment out the above throw
            // Also when in the browser console add your auth token (`document.cookie = "sessionToken=UUID;`)
            // Don't forget to do this in get as well
            // TODO switch back to json response, right now we don't use the extra data and the iframe implementation requires html passed back
            // return data.renderedHTML;
        }
    }));

router.post('/assessment/topic/:id/submit/:version',
    authenticationMiddleware,
    validate(submitAssessmentVersionValidation),
    // This is a typescript workaround since it tries to use the type extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, unknown, SubmitAssessmentVersionRequest.body, SubmitAssessmentVersionRequest.query>, _res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = await req.session.getUser();

        const params = req.params as SubmitAssessmentVersionRequest.params;

        const studentTopicAssessmentInfo = await courseController.getStudentTopicAssessmentInfoById(params.version);
        if (user.id != studentTopicAssessmentInfo.userId) {
            throw new Error('You cannot submit an assessment that does not belong to you.');
        }

        if (studentTopicAssessmentInfo.numAttempts >= studentTopicAssessmentInfo.maxAttempts) {
            throw new IllegalArgumentException('This assessment version has no attempts remaining.');
        }

        const assessmentResult = await courseController.submitAssessmentAnswers(params.version, false); // false: wasAutoSubmitted
        next(httpResponse.Ok('Assessment submitted successfully', assessmentResult));
    }));

router.post('/question/:id',
    authenticationMiddleware,
    // TODO investigate if this is a problem
    // if the body were to be consumed it should hang here
    bodyParser.raw({
        type: '*/*'
    }),
    // Can't use unknown due to restrictions on the type from express
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, unknown, unknown, PostQuestionMeta>, _res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = await req.session.getUser();

        const params = req.params as unknown as {
            id: number;
        };

        const question = await courseController.getQuestionRecord(params.id);

        const rendererParams = await courseController.getCalculatedRendererParams({
            courseQuestion: question,
            role: user.roleId,
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
        next();
    }),
    proxy(configurations.renderer.url, {
        // Can't use unknown due to restrictions on the type from express
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        proxyReqPathResolver: (req: RederlyExpressRequest<any, unknown, unknown, unknown, PostQuestionMeta>) => {
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
        // Can't use unknown due to restrictions on the type from express
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userResDecorator: async (_proxyRes, proxyResData, userReq: RederlyExpressRequest<any, unknown, unknown, unknown, PostQuestionMeta>) => {
            if (_.isNil(userReq.session)) {
                throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
            }

            if (_.isNil(userReq.meta)) {
                throw new Error('Previously fetched metadata is nil');
            }


            let rendererResponse: RendererResponse | null = null;
            try {
                rendererResponse = await rendererHelper.parseRendererResponse(proxyResData.toString('utf8'), {
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

            // There is no way to get next callback, however anything thrown will get sent to next
            // Using the below line will responde with a 201 the way we do in our routes
            throw httpResponse.Ok('Answer submitted for question', {
                rendererData: rendererHelper.cleanRendererResponseForTheResponse(rendererResponse),
                ...result
            });

            // If testing renderer integration from the browser without the front end simply return the rendered html
            // To do so first uncomment the below return and comment out the above throw
            // Also when in the browser console add your auth token (`document.cookie = "sessionToken=UUID;`)
            // Don't forget to do this in get as well
            // TODO switch back to json response, right now we don't use the extra data and the iframe implementation requires html passed back
            // return data.renderedHTML;
        }
    }));

router.get('/',
    authenticationMiddleware,
    validate(listCoursesValidation),
    asyncHandler(async (req: RederlyExpressRequest<ListCoursesRequest.params, unknown, ListCoursesRequest.body, ListCoursesRequest.query>, _res: Response, next: NextFunction) => {
        try {
            const courses = await courseController.getCourses({
                filter: {
                    instructorId: req.query.instructorId,
                    enrolledUserId: req.query.enrolledUserId,
                }
            });
            next(httpResponse.Ok('Fetched successfully', courses));
        } catch (e) {
            next(e);
        }
    }));

// This returns information about a specific topic. Currently, it only
// returns extension information if a specific user is passed.
router.get('/topic/:id',
    authenticationMiddleware,
    validate(getTopicValidation),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GetTopicRequest.body, GetTopicRequest.query, unknown>, _res: Response, next: NextFunction) => {
        const result = await courseController.getTopicById({ id: req.params.id, userId: req.query.userId, includeQuestions: req.query.includeQuestions });
        next(httpResponse.Ok('Fetched successfully', result));
    }));

router.get('/topics',
    authenticationMiddleware,
    validate(getTopicsValidation),
    asyncHandler(async (req: RederlyExpressRequest<GetTopicsRequest.params, unknown, GetTopicsRequest.body, GetTopicsRequest.query>, _res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const user = await req.session.getUser();
        const userId = (user.roleId === Role.STUDENT) ? user.id : undefined;

        const result = await courseController.getTopics({
            courseId: req.query.courseId,
            isOpen: req.query.isOpen,
            userId
        });
        next(httpResponse.Ok('Fetched successfully', result));
    }));

router.post('/:id/email',
    authenticationMiddleware,
    validate(emailProfValidation),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, EmailProfRequest.body, EmailProfRequest.query>, res: Response, next: NextFunction) => {
        const params: EmailProfRequest.params = req.params;

        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = await req.session.getUser();

        const result = await courseController.emailProfessor({
            courseId: params.id,
            content: req.body.content,
            question: req.body.question,
            student: user,
        });
        next(httpResponse.Ok('Your message was sent to your professor.', result));
    })
);

router.get('/:id',
    authenticationMiddleware,
    validate(getCourseValidation),
    // This is a work around because typescript has errors with "extractMap"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GetCourseRequest.body, GetCourseRequest.query>, _res: Response, next: NextFunction) => {
        try {
            const params = req.params as GetCourseRequest.params;
            const course = await courseController.getCourseById(params.id);
            const university = await course.getUniversity({
                where: {
                    active: true,
                }
            });
            const canAskForHelp = university?.universityName === 'CityTech' ?? false;
            next(httpResponse.Ok('Fetched successfully', {
                ...course.get({plain: true}),
                canAskForHelp,
            }));
        } catch (e) {
            next(e);
        }
    }));

router.post('/enroll',
    authenticationMiddleware,
    validate(enrollInCourseValidation),
    asyncHandler(async (req: RederlyExpressRequest<EnrollInCourseRequest.params, unknown, EnrollInCourseRequest.body, EnrollInCourseRequest.query>, _res: Response, next: NextFunction) => {
        try {
            const enrollment = await courseController.enroll({
                ...req.body,
            });
            next(httpResponse.Ok('Enrolled', enrollment));
        } catch (e) {
            if (e instanceof NotFoundError) {
                next(Boom.notFound(e.message));
            } else {
                next(e);
            }
        }
    }));

router.post('/enroll/:code',
    authenticationMiddleware,
    validate(enrollInCourseByCodeValidation),
    asyncHandler(async (req: RederlyExpressRequest<EnrollInCourseByCodeRequest.params | { [key: string]: string }, unknown, EnrollInCourseByCodeRequest.body, EnrollInCourseByCodeRequest.query>, _res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const session = req.session;
        try {
            const enrollment = await courseController.enrollByCode({
                code: req.params.code,
                userId: session.userId
            });
            next(httpResponse.Ok('Enrolled', enrollment));
        } catch (e) {
            if (e instanceof NotFoundError) {
                next(Boom.notFound(e.message));
            } else {
                next(e);
            }
        }
    }));

router.delete('/enroll',
    authenticationMiddleware,
    validate(deleteEnrollmentValidation),
    paidMiddleware('Un-enrolling users'),
    asyncHandler(async (req: RederlyExpressRequest<DeleteEnrollmentRequest.params, unknown, DeleteEnrollmentRequest.body, DeleteEnrollmentRequest.query>, _res: Response, next: NextFunction) => {
        try {
            const success = await courseController.softDeleteEnrollment({
                ...req.body,
            });
            next(httpResponse.Ok('Student was dropped', success));
        } catch (e) {
            if (e instanceof NotFoundError) {
                next(Boom.notFound(e.message));
            } else {
                next(e);
            }
        }
    }));

router.get('/attachments/upload-url',
    authenticationMiddleware,
    validate(getAttachmentPresignedURLValidation),
    asyncHandler(async (req: RederlyExpressRequest<GetAttachmentPresignedURLRequest.params, unknown, GetAttachmentPresignedURLRequest.body, GetAttachmentPresignedURLRequest.query>, _res: Response, next: NextFunction) => {
        const result = await attachmentHelper.getNewPresignedURL();
        next(httpResponse.Ok('Get new presigned url success', result));
    }));

router.post('/attachments',
    authenticationMiddleware,
    validate(postAttachmentValidation),
    asyncHandler(async (req: RederlyExpressRequest<PostAttachmentRequest.params, unknown, PostAttachmentRequest.body, PostAttachmentRequest.query>, _res: Response, next: NextFunction) => {
        // TODO permission to check if user has access to the provided grade or grade instance
        const result = await courseController.createAttachment({
            obj: req.body.attachment,
            studentGradeId: req.body.studentGradeId,
            studentGradeInstanceId: req.body.studentGradeInstanceId,
            studentWorkbookId: req.body.studentWorkbookId
        });
        next(httpResponse.Ok('Attachment record created', result));
    }));

router.get('/attachments/list',
    authenticationMiddleware,
    validate(listAttachmentsValidation),
    asyncHandler(async (req: RederlyExpressRequest<ListAttachmentsRequest.params, unknown, ListAttachmentsRequest.body, ListAttachmentsRequest.query>, _res: Response, next: NextFunction) => {
        // TODO permission to check if user has access to the provided grade or grade instance
        const result = await courseController.listAttachments({
            studentGradeId: req.query.studentGradeId,
            studentGradeInstanceId: req.query.studentGradeInstanceId,
            studentWorkbookId: req.query.studentWorkbookId,
        });

        next(httpResponse.Ok('Attachments fetched successfully', {
            attachments: result,
            baseUrl: configurations.attachments.baseUrl
        }));
    }));

router.delete('/attachments/:id',
    authenticationMiddleware,
    validate(deleteAttachmentValidation),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, DeleteAttachmentRequest.body, DeleteAttachmentRequest.query>, _res: Response, next: NextFunction) => {
        const params = req.params as DeleteAttachmentRequest.params;
        // TODO permission to check if user has access to the provided grade or grade instance
        const result = await courseController.deleteAttachment({
            problemAttachmentId: params.id
        });

        next(httpResponse.Ok('Attachment deleted successfully', result));
    }));

router.post('/question/editor/save',
    authenticationMiddleware,
    validate(saveQuestionValidation),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<SaveQuestionRequest.params, unknown, SaveQuestionRequest.body, SaveQuestionRequest.query>, _res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = await req.session.getUser({
            where: {
                active: true
            }
        });

        const writeFilePath = urljoin(`private/my/${user.uuid}`, req.body.relativePath);
        const result = await rendererHelper.saveProblemSource({
            problemSource: req.body.problemSource,
            writeFilePath: writeFilePath,
        });

        next(httpResponse.Ok('Loaded', {
            filePath: result
        }));
    }));

router.post('/question/editor/read',
    authenticationMiddleware,
    validate(readQuestionValidation),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<ReadQuestionRequest.params, unknown, ReadQuestionRequest.body, ReadQuestionRequest.query>, _res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const sourceFilePath = req.body.filePath;
        const result = await rendererHelper.readProblemSource({
            sourceFilePath: sourceFilePath
        });

        next(httpResponse.Ok('Loaded', {
            problemSource: result
        }));
    }));

router.post('/question/editor/catalog',
    authenticationMiddleware,
    validate(catalogValidation),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<CatalogRequest.params, unknown, CatalogRequest.body, CatalogRequest.query>, _res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = await req.session.getUser({
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

        next(httpResponse.Ok('Loaded', {
            problems: Object.keys(result).filter(elm => elm.endsWith('.pg'))
        }));
    }));

module.exports = router;
