import { Request, Response, NextFunction } from 'express';
import courseController from './course-controller';
const router = require('express').Router();
import validate from '../../middleware/joi-validator';
import { authenticationMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import * as asyncHandler from 'express-async-handler';
import { createCourseValidation, getCourseValidation, enrollInCourseValidation, listCoursesValidation, createCourseUnitValidation, createCourseTopicValidation, createCourseTopicQuestionValidation, getQuestionValidation, updateCourseTopicValidation, getGradesValidation, updateCourseUnitValidation, getStatisticsOnUnitsValidation, getStatisticsOnTopicsValidation, getStatisticsOnQuestionsValidation, getTopicsValidation, getQuestionsValidation, enrollInCourseByCodeValidation, updateCourseTopicQuestionValidation, updateCourseValidation, createQuestionsForTopicFromDefFileValidation, deleteCourseTopicValidation, deleteCourseQuestionValidation, deleteCourseUnitValidation } from './course-route-validation';
import NotFoundError from '../../exceptions/not-found-error';
import multer = require('multer');
import * as proxy from 'express-http-proxy';
import * as qs from 'qs';
import * as _ from 'lodash';
import configurations from '../../configurations';
import WrappedError from '../../exceptions/wrapped-error';
import { RederlyExpressRequest } from '../../extensions/rederly-express-request';
import { GetStatisticsOnUnitsRequest, GetStatisticsOnTopicsRequest, GetStatisticsOnQuestionsRequest, CreateCourseRequest, CreateCourseUnitRequest, GetGradesRequest, GetQuestionsRequest, UpdateCourseTopicRequest, UpdateCourseUnitRequest, CreateCourseTopicQuestionRequest, GetQuestionRequest, ListCoursesRequest, GetTopicsRequest, GetCourseRequest, EnrollInCourseRequest, EnrollInCourseByCodeRequest, UpdateCourseRequest, UpdateCourseTopicQuestionRequest, CreateQuestionsForTopicFromDefFileRequest, DeleteCourseUnitRequest, DeleteCourseTopicRequest, DeleteCourseQuestionRequest } from './course-route-request-types';
import Boom = require('boom');
import { Constants } from '../../constants';
import CourseTopicContent from '../../database/models/course-topic-content';
import Role from '../permissions/roles';
import { GetCalculatedRendererParamsResponse } from './course-types';
import { RENDERER_ENDPOINT, GetProblemParameters } from '../../utilities/renderer-helper';
import StudentGrade from '../../database/models/student-grade';
import bodyParser = require('body-parser');

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
                }
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
                }
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
                }
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
        try {
            const newTopic = await courseController.createTopic({
                ...req.body
            });
            // TODO handle not found case
            next(httpResponse.Created('Course Topic created successfully', newTopic));
        } catch (e) {
            next(e);
        }
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

        let topic: CourseTopicContent | null = null;
        if(!_.isNil(req.query.courseTopicContentId)) {
            topic = await courseController.getTopicById(req.query.courseTopicContentId);
            if (new Date().getTime() < topic.startDate.getTime()) {
                const user = await req.session.getUser();
                if (user.roleId === Role.STUDENT) {
                    next(Boom.badRequest(`The topic "${topic.name}" has not started yet.`));
                    return;    
                }
            }
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

        const questions = await courseController.getQuestions({
            userId: userId,
            courseTopicContentId: req.query.courseTopicContentId
        });

        next(httpResponse.Ok(null, {
            questions: questions,
            topic
        }));
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
            // TODO handle not found case
            const question = await courseController.getQuestion({
                questionId: params.id,
                userId: session.userId,
                formURL: req.originalUrl,
                role: user.roleId
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

router.post('/question/:id',
    authenticationMiddleware,
    // TODO investigate if this is a problem
    // if the body were to be consumed it should hang here
    bodyParser.raw({
        type: '*/*'
    }),
    // Can't use unknown due to restrictions on the type from express
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, unknown, unknown, { rendererParams: GetCalculatedRendererParamsResponse; studentGrade?: StudentGrade | null }>, _res: Response, next: NextFunction) => {
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
            studentGrade: studentGrade?.get({ plain: true}) as StudentGrade
        };
        next();
    }),
    proxy(configurations.renderer.url, {
        // Can't use unknown due to restrictions on the type from express
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        proxyReqPathResolver: (req: RederlyExpressRequest<any, unknown, unknown, unknown, { rendererParams: GetCalculatedRendererParamsResponse; studentGrade?: StudentGrade | null }>) => {
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
        userResDecorator: async (_proxyRes, proxyResData, userReq: RederlyExpressRequest<any, unknown, unknown, unknown, { rendererParams: GetCalculatedRendererParamsResponse; studentGrade?: StudentGrade | null }>) => {
            if (_.isNil(userReq.session)) {
                throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
            }

            let data = proxyResData.toString('utf8');
            try {
                data = JSON.parse(data);
            } catch (e) {
                throw new WrappedError(`Error parsing data response from renderer on question ${userReq.meta?.studentGrade?.courseWWTopicQuestionId} for grade ${userReq.meta?.studentGrade?.id}`, e);
            }

            const params = userReq.params as unknown as {
                id: number;
            };

            const result = await courseController.submitAnswer({
                userId: userReq.session.userId,
                questionId: params.id as number,
                score: data.problem_result.score,
                submitted: data,
            });

            // There is no way to get next callback, however anything thrown will get sent to next
            // Using the below line will responde with a 201 the way we do in our routes
            throw httpResponse.Ok('Answer submitted for question', {
                rendererData: data,
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

router.get('/topics',
    authenticationMiddleware,
    validate(getTopicsValidation),
    asyncHandler(async (req: RederlyExpressRequest<GetTopicsRequest.params, unknown, GetTopicsRequest.body, GetTopicsRequest.query>, _res: Response, next: NextFunction) => {
        try {
            const result = await courseController.getTopics({
                courseId: req.query.courseId,
                isOpen: req.query.isOpen
            });
            next(httpResponse.Ok('Fetched successfully', result));
        } catch (e) {
            next(e);
        }
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

module.exports = router;
