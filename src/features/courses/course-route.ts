import { Request, Response, NextFunction } from "express";
import configurations from '../../configurations';
import courseController from "./course-controller";
const router = require('express').Router();
import validate from '../../middleware/joi-validator'
import Boom = require("boom");
import { authenticationMiddleware } from "../../middleware/auth";
import httpResponse from "../../utilities/http-response";
import * as asyncHandler from 'express-async-handler'
import { createCourseValidation, getCourseValidation } from "./course-route-validation";

router.post('/',
    authenticationMiddleware,
    validate(createCourseValidation),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const newCourse = await courseController.createCourse(req.body);
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