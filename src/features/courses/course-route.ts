import { Request, Response, NextFunction } from 'express';
import courseController from './course-controller';
const router = require('express').Router();
import validate from '../../middleware/joi-validator';
import { authenticationMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import * as asyncHandler from 'express-async-handler';
import { createCourseValidation, getCourseValidation, enrollInCourseValidation, listCoursesValidation, createCourseUnitValidation, createCourseTopicValidation, createCourseTopicQuestionValidation, getQuestionValidation, updateCourseTopicValidation, getGradesValidation, updateCourseUnitValidation, getStatisticsOnUnitsValidation, getStatisticsOnTopicsValidation, getStatisticsOnQuestionsValidation, getTopicsValidation, getQuestionsValidation, enrollInCourseByCodeValidation, updateCourseTopicQuestionValidation, updateCourseValidation, createQuestionsForTopicFromDefFileValidation, deleteCourseTopicValidation, deleteCourseQuestionValidation, deleteCourseUnitValidation, updateGradeValidation, deleteEnrollmentValidation, createAssessmentVersionValidation, extendCourseTopicForUserValidation, extendCourseTopicQuestionValidation, getTopicValidation, submitAssessmentVersionValidation } from './course-route-validation';
import NotFoundError from '../../exceptions/not-found-error';
import multer = require('multer');
import * as proxy from 'express-http-proxy';
import * as qs from 'qs';
import * as _ from 'lodash';
import configurations from '../../configurations';
import WrappedError from '../../exceptions/wrapped-error';
import { RederlyExpressRequest } from '../../extensions/rederly-express-request';
import { GetStatisticsOnUnitsRequest, GetStatisticsOnTopicsRequest, GetStatisticsOnQuestionsRequest, CreateCourseRequest, CreateCourseUnitRequest, GetGradesRequest, GetQuestionsRequest, UpdateCourseTopicRequest, UpdateCourseUnitRequest, CreateCourseTopicQuestionRequest, GetQuestionRequest, ListCoursesRequest, GetTopicsRequest, GetCourseRequest, EnrollInCourseRequest, EnrollInCourseByCodeRequest, UpdateCourseRequest, UpdateCourseTopicQuestionRequest, CreateQuestionsForTopicFromDefFileRequest, DeleteCourseUnitRequest, DeleteCourseTopicRequest, DeleteCourseQuestionRequest, UpdateGradeRequest, DeleteEnrollmentRequest, ExtendCourseTopicForUserRequest, GetTopicRequest, ExtendCourseTopicQuestionRequest, CreateAssessmentVersionRequest, SubmitAssessmentVersionRequest, UpdateGradeInstanceRequest } from './course-route-request-types';
import Boom = require('boom');
import { Constants } from '../../constants';
import CourseTopicContent from '../../database/models/course-topic-content';
import Role from '../permissions/roles';
import { PostQuestionMeta } from './course-types';
import rendererHelper, { RENDERER_ENDPOINT, GetProblemParameters, RendererResponse } from '../../utilities/renderer-helper';
import StudentGrade from '../../database/models/student-grade';
import bodyParser = require('body-parser');
import moment = require('moment');
import StudentTopicAssessmentInfo from '../../database/models/student-topic-assessment-info';
import IllegalArgumentException from '../../exceptions/illegal-argument-exception';
import logger from '../../utilities/logger';

const fileUpload = multer();

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
            next(httpResponse.Ok('Fetched successfully', stats));
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
            next(httpResponse.Ok('Fetched successfully', stats));
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
            next(httpResponse.Ok('Fetched successfully', stats));
        } catch (e) {
            next(e);
        }
    }));

router.post('/def',
    authenticationMiddleware,
    validate(createQuestionsForTopicFromDefFileValidation),
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
                next(Boom.badRequest('userIdInput as a string must be the value `me`'));
                return;
            }
        } else if (typeof userIdInput === 'number') {
            userId = userIdInput;
        }

        let topic: CourseTopicContent | null = null;
        let version: StudentTopicAssessmentInfo | undefined;
        if(!_.isNil(req.query.courseTopicContentId)) {
            topic = await courseController.getTopicById({
                id: req.query.courseTopicContentId,
                userId,
            });
            const overrideStartDate = topic.studentTopicOverride?.[0]?.startDate;
            const startDate = overrideStartDate ?? topic.startDate;

            const user = await req.session.getUser();
            if (moment().isBefore(startDate)) {
                if (user.roleId === Role.STUDENT) {
                    next(Boom.badRequest(`The topic "${topic.name}" has not started yet.`));
                    return;
                }
            }

            if (topic?.topicTypeId === 2 && !_.isNil(userId)) {
                if (_.isNil(topic.topicAssessmentInfo)){
                    next(Boom.badRequest('Topic is an assessment, but does not have corresponding assessment info. This should never happen.'));
                    return;
                }

                // get version info - descending by startTime unless specific id is included in query
                if (_.isNil(req.query.studentTopicAssessmentInfoId)) {
                    // _.orderBy puts in ascending order
                    const versions = _.orderBy(topic.topicAssessmentInfo.studentTopicAssessmentInfo, ['startTime'], ['desc']);
                    if (_.isNil(versions) || versions.length === 0) {
                        next(httpResponse.Ok('You have not started any versions of this assessment.', {questions: null, topic}));
                        return;
                    }
                    version = versions[0];
                } else {
                    version = await courseController.getStudentTopicAssessmentInfoById(req.query.studentTopicAssessmentInfoId);
                }

                if (
                    topic.topicAssessmentInfo.hideProblemsAfterFinish && (
                        moment().isAfter(moment(version.endTime)) ||
                        version.isClosed ||
                        version.maxAttempts <= version.numAttempts 
                    ) &&
                    user.roleId === Role.STUDENT
                ) {
                    next(httpResponse.Ok('You have finished this version of the assessment and you are blocked from seeing the problems.', {questions: null, topic}));
                    return;
                }
            }
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

router.put('/topic/extend',
    authenticationMiddleware,
    validate(extendCourseTopicForUserValidation),
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
        const {userCanStartNewVersion, message} = await courseController.canUserStartNewVersion({user, topicId: params.id});

        // will never have true + message
        if (userCanStartNewVersion === false && !_.isNil(message)) {
            throw new IllegalArgumentException(message);
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
    asyncHandler(async (req: RederlyExpressRequest<CreateCourseTopicQuestionRequest.params, unknown, CreateCourseTopicQuestionRequest.body, CreateCourseTopicQuestionRequest.query>, _res: Response, next: NextFunction) => {
        try {
            const newQuestion = await courseController.addQuestion({
                ...req.body
            });
            // TODO handle not found case
            next(httpResponse.Created('Course Question created successfully', newQuestion));
        } catch (e) {
            next(e);
        }
    }));

router.get('/question/:id',
    authenticationMiddleware,
    validate(getQuestionValidation),
    // This is a typescript workaround since it tries to use the type extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GetQuestionRequest.body, GetQuestionRequest.query>, _res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const session = req.session;
        const user = await req.session.getUser();

        const params = req.params as GetQuestionRequest.params;
        try {
            let question;
            if (req.query.userId) {
                question = await courseController.getQuestionWithoutRenderer({
                    id: params.id,
                    userId: req.query.userId,
                });
            } else {
                // check to see if we should allow this question to be viewed
                const userCanViewQuestion = await courseController.userCanViewQuestionId(user, params.id, req.query.studentTopicAssessmentInfoId);
                if (userCanViewQuestion === false) throw new Error('You are not permitted to view the problems after finishing.');
                
                question = await courseController.getQuestion({
                    questionId: params.id,
                    userId: session.userId,
                    formURL: req.originalUrl,
                    role: user.roleId,
                    readonly: req.query.readonly,
                    workbookId: req.query.workbookId,
                });
            }
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

        const studentTopicAssessmentInfo = await courseController.getStudentTopicAssessmentInfoById(params.version);

        if (studentTopicAssessmentInfo.numAttempts >= studentTopicAssessmentInfo.maxAttempts) {
            logger.error('This assessment version has no attempts remaining but was auto submitted.', JSON.stringify({
                assessmentVersionId: params.version,
                topicId: params.id
            }));
            // Can't give an error response or the scheduler might try again
            next(httpResponse.Ok('Skipped'));
        }

        const assessmentResult = await courseController.submitAssessmentAnswers(params.version, true); // false: wasAutoSubmitted
        next(httpResponse.Ok('Assessment submitted successfully', assessmentResult));
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
            role: user.roleId
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
            studentGrade: studentGrade?.get({ plain: true}) as StudentGrade,
            courseQuestion: question
        };
        next();
    }),
    proxy(configurations.renderer.url, {
        // Can't use unknown due to restrictions on the type from express
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        proxyReqPathResolver: (req: RederlyExpressRequest<any, unknown, unknown, unknown, PostQuestionMeta>) => {
            if(_.isNil(req.meta)) {
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

            if(_.isNil(userReq.meta)) {
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
        const result = await courseController.getTopicById({id: req.params.id, userId: req.query.userId, includeQuestions: req.query.includeQuestions});
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

router.get('/:id',
    authenticationMiddleware,
    validate(getCourseValidation),
    // This is a work around because typescript has errors with "extractMap"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GetCourseRequest.body, GetCourseRequest.query>, _res: Response, next: NextFunction) => {
        try {
            const params = req.params as GetCourseRequest.params;
            const course = await courseController.getCourseById(params.id);
            next(httpResponse.Ok('Fetched successfully', course));
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

module.exports = router;
