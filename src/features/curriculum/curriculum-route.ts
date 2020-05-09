import { Request, Response, NextFunction } from "express";
const router = require('express').Router();
import validate from '../../middleware/joi-validator'
import { authenticationMiddleware } from "../../middleware/auth";
import httpResponse from "../../utilities/http-response";
import * as asyncHandler from 'express-async-handler'
import { getCurriculumValidation, createCurriculumValidation } from "./curriculum-route-validation";
import curriculumController from "./curriculum-controller";
import Session from "../../database/models/session";

router.post('/',
    authenticationMiddleware,
    validate(createCurriculumValidation),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            // TODO figure out session for request
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const session = (req as any).session as Session;
            const user = await session.getUser();
            const university = await user.getUniversity();

            const newCurriculum = await curriculumController.createCurriculum({
                universityId: university.id,
                ...req.body
            });
            next(httpResponse.Created('Curriculum successfully', newCurriculum));
        } catch (e) {
            next(e)
        }
    }));

router.get('/',
    authenticationMiddleware,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const curriculums = await curriculumController.getCurriculums();
            next(httpResponse.Ok('Fetched successfully', curriculums));
        } catch (e) {
            next(e)
        }
    }));

router.get('/:id',
    authenticationMiddleware,
    validate(getCurriculumValidation),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const curriculum = await curriculumController.getCurriculumById(parseInt(req.params.id));
            next(httpResponse.Ok('Fetched successfully', curriculum));
        } catch (e) {
            next(e)
        }
    }));

module.exports = router;