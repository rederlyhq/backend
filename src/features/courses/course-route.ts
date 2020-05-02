import { Request, Response, NextFunction } from "express";
import courseController from "./course-controller";
const router = require('express').Router();
import validate from '../../middleware/joi-validator'
import { authenticationMiddleware } from "../../middleware/auth";
import httpResponse from "../../utilities/http-response";
import * as asyncHandler from 'express-async-handler'
import { createCourseValidation, getCourseValidation } from "./course-route-validation";
import Session from "../../database/models/session";

router.post('/',
    authenticationMiddleware,
    validate(createCourseValidation),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        // TODO figure out session for request
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = (req as any).session as Session;
        const user = await session.getUser();
        const university = await user.getUniversity();

        try {
            const newCourse = await courseController.createCourse({
                // Database field
                // eslint-disable-next-line @typescript-eslint/camelcase
                instructor_id: user.id,
                // Database field
                // eslint-disable-next-line @typescript-eslint/camelcase
                university_id: university.id,
                ...req.body
            });
            next(httpResponse.Created('Course successfully', newCourse));
        } catch (e) {
            next(e)
        }
    }));

router.get('/',
    authenticationMiddleware,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const courses = await courseController.getCourses();
            next(httpResponse.Ok('Fetched successfully', courses));
        } catch (e) {
            next(e)
        }
    }));

router.get('/:id',
    authenticationMiddleware,
    validate(getCourseValidation),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const course = await courseController.getCourseById(parseInt(req.params.id));
            next(httpResponse.Ok('Fetched successfully', course));
        } catch (e) {
            next(e)
        }
    }));

module.exports = router;