import { Request, Response, NextFunction } from "express";
import courseController from "./course-controller";
const router = require('express').Router();
import validate from '../../middleware/joi-validator'
import { authenticationMiddleware } from "../../middleware/auth";
import httpResponse from "../../utilities/http-response";
import * as asyncHandler from 'express-async-handler'
import { createCourseValidation, getCourseValidation, enrollInCourseValidation, listCoursesValidation, createCourseUnitValidation, createCourseTopicValidation, createCourseTopicQuestionValidation, getQuestionValidation, updateCourseTopicValidation, getGradesValidation, updateCourseUnitValidation, getStatisticsOnUnitsValidation, getStatisticsOnTopicsValidation, getStatisticsOnQuestionsValidation, getTopicsValidation, getQuestionsValidation, enrollInCourseByCodeValidation } from "./course-route-validation";
import NotFoundError from "../../exceptions/not-found-error";
import multer = require("multer");
import WebWorkDef from "../../utilities/web-work-def-parser";
import * as proxy from 'express-http-proxy';
import * as qs from 'qs';
import configurations from "../../configurations";
import WrappedError from "../../exceptions/wrapped-error";
import { RederlyExpressRequest } from "../../extensions/rederly-express-request";
import { GetStatisticsOnUnitsRequest, GetStatisticsOnTopicsRequest, GetStatisticsOnQuestionsRequest, CreateCourseRequest, CreateCourseUnitRequest, GetGradesRequest, GetQuestionsRequest, UpdateCourseTopicRequest, UpdateCourseUnitRequest, CreateCourseTopicQuestionRequest, GetQuestionRequest, ListCoursesRequest, GetTopicsRequest, GetCourseRequest, EnrollInCourseRequest, EnrollInCourseByCodeRequest } from './course-route-request-types';
import Boom = require("boom");

const fileUpload = multer();

router.get('/statistics/units',
    authenticationMiddleware,
    validate(getStatisticsOnUnitsValidation),
    asyncHandler(async (req: RederlyExpressRequest<GetStatisticsOnUnitsRequest.params, unknown, GetStatisticsOnUnitsRequest.body, GetStatisticsOnUnitsRequest.query>, res: Response, next: NextFunction) => {
        try {
            const stats = await courseController.getStatisticsOnUnits({
                where: {
                    courseId: req.query.courseId
                }
            });
            next(httpResponse.Ok('Fetched successfully', stats));
        } catch (e) {
            next(e)
        }
    }));

router.get('/statistics/topics',
    authenticationMiddleware,
    validate(getStatisticsOnTopicsValidation),
    asyncHandler(async (req: RederlyExpressRequest<GetStatisticsOnTopicsRequest.params, unknown, GetStatisticsOnTopicsRequest.body, GetStatisticsOnTopicsRequest.query>, res: Response, next: NextFunction) => {
        try {
            const stats = await courseController.getStatisticsOnTopics({
                where: {
                    courseUnitContentId: req.query.courseUnitContentId,
                    courseId: req.query.courseId
                }
            });
            next(httpResponse.Ok('Fetched successfully', stats));
        } catch (e) {
            next(e)
        }
    }));

router.get('/statistics/questions',
    authenticationMiddleware,
    validate(getStatisticsOnQuestionsValidation),
    asyncHandler(async (req: RederlyExpressRequest<GetStatisticsOnQuestionsRequest.params, unknown, GetStatisticsOnQuestionsRequest.body, GetStatisticsOnQuestionsRequest.query>, res: Response, next: NextFunction) => {
        try {
            const stats = await courseController.getStatisticsOnQuestions({
                where: {
                    courseTopicContentId: req.query.courseTopicContentId,
                    courseId: req.query.courseId
                }
            });
            next(httpResponse.Ok('Fetched successfully', stats));
        } catch (e) {
            next(e)
        }
    }));

router.post('/def',
    authenticationMiddleware,
    // validate(createCourseValidation),
    fileUpload.single('def-file'),
    asyncHandler(async (req: Request, res: Response) => {
        const parsedDefFile = new WebWorkDef(req.file.buffer.toString())
        res.json(parsedDefFile);
    }));

router.post('/',
    authenticationMiddleware,
    validate(createCourseValidation),
    asyncHandler(async (req: RederlyExpressRequest<CreateCourseRequest.params, unknown, CreateCourseRequest.body, CreateCourseRequest.query>, res: Response, next: NextFunction) => {
        try {
            const session = req.session;
            const user = await session.getUser();
            const university = await user.getUniversity();

            const newCourse = await courseController.createCourse({
                instructorId: user.id,
                universityId: university.id,
                ...req.body
            });
            next(httpResponse.Created('Course successfully', newCourse));
        } catch (e) {
            next(e)
        }
    }));

router.post('/unit',
    authenticationMiddleware,
    validate(createCourseUnitValidation),
    asyncHandler(async (req: RederlyExpressRequest<CreateCourseUnitRequest.params, unknown, CreateCourseUnitRequest.body, CreateCourseUnitRequest.query>, res: Response, next: NextFunction) => {
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
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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
    asyncHandler(async (req: RederlyExpressRequest<GetGradesRequest.params, unknown, GetGradesRequest.body, GetGradesRequest.query>, res: Response, next: NextFunction) => {
        try {
            const grades = await courseController.getGrades({
                where: {
                    courseId: req.query.courseId,
                    questionId: req.query.questionId,
                    topicId: req.query.topicId,
                    unitId: req.query.unitId
                }
            });
            next(httpResponse.Ok('Fetched successfully', grades));
        } catch (e) {
            next(e)
        }
    }));

router.get('/questions',
    authenticationMiddleware,
    validate(getQuestionsValidation),
    asyncHandler(async (req: RederlyExpressRequest<GetQuestionsRequest.params, unknown, GetQuestionsRequest.body, GetQuestionsRequest.query>, res: Response, next: NextFunction) => {
        const userIdInput = req.query.userId
        let userId: number;
        if (typeof userIdInput === 'string') {
            if (userIdInput === 'me') {
                const session = req.session;
                userId = session.userId
            } else {
                next(Boom.badRequest('userIdInput as a string must be the value `me`'));
                return;
            }
        } else if (typeof userIdInput === 'number') {
            userId = userIdInput
        }

        const result = await courseController.getQuestions({
            userId: userId,
            courseTopicContentId: req.query.courseTopicContentId
        });
        next(httpResponse.Ok(null, result));
    }));

router.put('/topic/:id',
    authenticationMiddleware,
    validate(updateCourseTopicValidation),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, UpdateCourseTopicRequest.body, UpdateCourseTopicRequest.query>, res: Response, next: NextFunction) => {
        try {
            const params = req.params as UpdateCourseTopicRequest.params;
            const updates = await courseController.updateTopic({
                where: {
                    id: params.id
                },
                updates: {
                    ...req.body
                }
            });
            // TODO handle not found case
            next(httpResponse.Ok('Updated topic successfully', updates));
        } catch (e) {
            next(e);
        }
    }));

router.put('/unit/:id',
    authenticationMiddleware,
    validate(updateCourseUnitValidation),
    // This is to work around "extractMap" error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, UpdateCourseUnitRequest.body, UpdateCourseUnitRequest.query>, res: Response, next: NextFunction) => {
        try {
            const params = req.params as UpdateCourseUnitRequest.params;
            const updates = await courseController.updateUnit({
                where: {
                    id: params.id
                },
                updates: {
                    ...req.body
                }
            });
            // TODO handle not found case
            next(httpResponse.Ok('Updated unit successfully', updates));
        } catch (e) {
            next(e);
        }
    }));

router.post('/question',
    authenticationMiddleware,
    validate(createCourseTopicQuestionValidation),
    asyncHandler(async (req: RederlyExpressRequest<CreateCourseTopicQuestionRequest.params, unknown, CreateCourseTopicQuestionRequest.body, CreateCourseTopicQuestionRequest.query>, res: Response, next: NextFunction) => {
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
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GetQuestionRequest.body, GetQuestionRequest.query>, res: Response, next: NextFunction) => {
        const session = req.session;

        const params = req.params as GetQuestionRequest.params;
        try {
            // TODO handle not found case
            const question = await courseController.getQuestion({
                questionId: params.id,
                userId: session.userId,
                formURL: req.originalUrl
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
    proxy(configurations.renderer.url, {
        proxyReqPathResolver: (req) => {
            return `/rendered?${qs.stringify({
                format: 'json',
                template: 'single',
                formURL: req.originalUrl,
            })}`;
        },
        userResDecorator: async (proxyRes, proxyResData, userReq: RederlyExpressRequest) => {
            let data = proxyResData.toString('utf8');
            try {
                data = JSON.parse(data);
            } catch (e) {
                throw new WrappedError('Error parsing data response from renderer', e);
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
    asyncHandler(async (req: RederlyExpressRequest<ListCoursesRequest.params, unknown, ListCoursesRequest.body, ListCoursesRequest.query>, res: Response, next: NextFunction) => {
        try {
            const courses = await courseController.getCourses({
                filter: {
                    instructorId: req.query.instructorId,
                    enrolledUserId: req.query.enrolledUserId,
                }
            });
            next(httpResponse.Ok('Fetched successfully', courses));
        } catch (e) {
            next(e)
        }
    }));

router.get('/topics',
    authenticationMiddleware,
    validate(getTopicsValidation),
    asyncHandler(async (req: RederlyExpressRequest<GetTopicsRequest.params, unknown, GetTopicsRequest.body, GetTopicsRequest.query>, res: Response, next: NextFunction) => {
        try {
            const result = await courseController.getTopics({
                courseId: req.query.courseId,
                isOpen: req.query.isOpen
            });
            next(httpResponse.Ok('Fetched successfully', result))
        } catch (e) {
            next(e)
        }
    }));

router.get('/:id',
    authenticationMiddleware,
    validate(getCourseValidation),
    // This is a work around because typescript has errors with "extractMap"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GetCourseRequest.body, GetCourseRequest.query>, res: Response, next: NextFunction) => {
        try {
            const params = req.params as GetCourseRequest.params;
            const course = await courseController.getCourseById(params.id);
            next(httpResponse.Ok('Fetched successfully', course));
        } catch (e) {
            next(e)
        }
    }));

router.post('/enroll',
    authenticationMiddleware,
    validate(enrollInCourseValidation),
    asyncHandler(async (req: RederlyExpressRequest<EnrollInCourseRequest.params, unknown, EnrollInCourseRequest.body, EnrollInCourseRequest.query>, res: Response, next: NextFunction) => {
        try {
            const enrollment = await courseController.enroll({
                ...req.body,
            })
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
    asyncHandler(async (req: RederlyExpressRequest<EnrollInCourseByCodeRequest.params, unknown, EnrollInCourseByCodeRequest.body, EnrollInCourseByCodeRequest.query>, res: Response, next: NextFunction) => {
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
