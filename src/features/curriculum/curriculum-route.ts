import { Response, NextFunction } from "express";
const router = require('express').Router();
import validate from '../../middleware/joi-validator';
import { authenticationMiddleware } from "../../middleware/auth";
import httpResponse from "../../utilities/http-response";
import * as asyncHandler from 'express-async-handler';
import { getCurriculumValidation, createCurriculumValidation, createCurriculumUnitValidation, createCurriculumTopicValidation, createCurriculumTopicQuestionValidation, updateCurriculumUnitValidation, updateCurriculumTopicValidation, listCurriculumValidation } from "./curriculum-route-validation";
import curriculumController from "./curriculum-controller";
import logger from "../../utilities/logger";
import { RederlyExpressRequest } from "../../extensions/rederly-express-request";
import { CreateCurriculumRequest, CreateCurriculumTopicRequest, UpdateCurriculumUnitRequest, UpdateCurriculumTopicRequest, CreateCurriculumTopicQuestionRequest, GetCurriculumRequest, ListCurriculumRequest } from "./curriculum-route-request-types";
import appSequelize from "../../database/app-sequelize";
import Curriculum from "../../database/models/curriculum";

router.post('/',
    authenticationMiddleware,
    validate(createCurriculumValidation),
    asyncHandler(async (req: RederlyExpressRequest<CreateCurriculumRequest.params, unknown, CreateCurriculumRequest.body, CreateCurriculumRequest.query>, res: Response, next: NextFunction) => {
        try {
            const session = req.session;
            const user = await session.getUser();
            const university = await user.getUniversity();

            let newCurriculum: Curriculum;
            await appSequelize.transaction(async () => {
                newCurriculum = await curriculumController.createCurriculum({
                    ...req.body,
                    universityId: university.id
                });

                try {
                    await curriculumController.createUniversityCurriculumPermission({
                        curriculumId: newCurriculum.id,
                        universityId: university.id,
                    });
                } catch (e) {
                    logger.error(e);
                }
            });
            next(httpResponse.Created('Curriculum created successfully', newCurriculum));
        } catch (e) {
            next(e);
        }
    }));

router.post('/unit',
    authenticationMiddleware,
    validate(createCurriculumUnitValidation),
    asyncHandler(async (req: RederlyExpressRequest<CreateCurriculumRequest.params, unknown, CreateCurriculumRequest.body, CreateCurriculumRequest.query>, res: Response, next: NextFunction) => {
        try {
            const newUnit = await curriculumController.createUnit({
                ...req.body
            });
            // TODO handle not found case
            next(httpResponse.Created('Unit created successfully', newUnit));
        } catch (e) {
            next(e);
        }
    }));

router.post('/topic',
    authenticationMiddleware,
    validate(createCurriculumTopicValidation),
    asyncHandler(async (req: RederlyExpressRequest<CreateCurriculumTopicRequest.params, unknown, CreateCurriculumTopicRequest.body, CreateCurriculumTopicRequest.query>, res: Response, next: NextFunction) => {
        try {
            const newTopic = await curriculumController.createTopic({
                ...req.body
            });
            // TODO handle not found case
            next(httpResponse.Created('Topic created successfully', newTopic));
        } catch (e) {
            next(e);
        }
    }));

router.put('/unit/:id',
    authenticationMiddleware,
    validate(updateCurriculumUnitValidation),
    // This is a typescript workaround since this comes up as extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, UpdateCurriculumUnitRequest.body, UpdateCurriculumUnitRequest.query>, res: Response, next: NextFunction) => {
        try {
            const params = req.params as UpdateCurriculumUnitRequest.params;
            const updates = await curriculumController.updateUnit({
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

router.put('/topic/:id',
    authenticationMiddleware,
    validate(updateCurriculumTopicValidation),
    // This is a typescript error workaround
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, UpdateCurriculumTopicRequest.body, UpdateCurriculumTopicRequest.query>, res: Response, next: NextFunction) => {
        try {
            const params = req.params as UpdateCurriculumTopicRequest.params;
            const updates = await curriculumController.updateTopic({
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

router.post('/question',
    authenticationMiddleware,
    validate(createCurriculumTopicQuestionValidation),
    asyncHandler(async (req: RederlyExpressRequest<CreateCurriculumTopicQuestionRequest.params, unknown, CreateCurriculumTopicQuestionRequest.body, CreateCurriculumTopicQuestionRequest.query>, res: Response, next: NextFunction) => {
        try {
            const newQuestion = await curriculumController.createQuestion({
                ...req.body
            });
            // TODO handle not found case
            next(httpResponse.Created('Question created successfully', newQuestion));
        } catch (e) {
            next(e);
        }
    }));

router.get('/',
    authenticationMiddleware,
    validate(listCurriculumValidation),
    asyncHandler(async (req: RederlyExpressRequest<ListCurriculumRequest.params, unknown, ListCurriculumRequest.body, ListCurriculumRequest.query>, res: Response, next: NextFunction) => {
        try {
            const curriculums = await curriculumController.getCurriculums();
            next(httpResponse.Ok('Fetched successfully', curriculums));
        } catch (e) {
            next(e);
        }
    }));

router.get('/:id',
    authenticationMiddleware,
    validate(getCurriculumValidation),
    // This is due to typescript not accepting it as the first parameter
    // We take it as any and then immediately cast it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GetCurriculumRequest.body, GetCurriculumRequest.query>, res: Response, next: NextFunction) => {
        try {
            const params = req.params as GetCurriculumRequest.params;
            const curriculum = await curriculumController.getCurriculumById(params.id);
            next(httpResponse.Ok('Fetched successfully', curriculum));
        } catch (e) {
            next(e);
        }
    }));

module.exports = router;
