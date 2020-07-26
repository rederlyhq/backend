import * as _ from 'lodash';
import { Request, Response, NextFunction } from "express";
import userController from "./user-controller";
const router = require('express').Router();
import validate from '../../middleware/joi-validator'
import { registerValidation, loginValidation, verifyValidation, listUsers, emailUsers, getUser } from "./user-route-validation";
import Boom = require("boom");
import passport = require("passport");
import { authenticationMiddleware } from "../../middleware/auth";
import httpResponse from "../../utilities/http-response";
import * as asyncHandler from 'express-async-handler'
import NoAssociatedUniversityError from "../../exceptions/no-associated-university-error";
import AlreadyExistsError from "../../exceptions/already-exists-error";
import Session from "../../database/models/session";
import WrappedError from '../../exceptions/wrapped-error';

router.post('/login',
    validate(loginValidation),
    passport.authenticate('local'),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        // TODO fix Request object for session
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newSession = (req as any).session.passport.user as Session;
        const user = await newSession.getUser();
        const role = await user.getRole();
        if (newSession) {
            const cookieOptions = {
                expires: newSession.expiresAt
            };
            res.cookie('sessionToken', newSession.uuid, cookieOptions);
            next(httpResponse.Ok(null, {
                roleId: role.id,
                firstName: user.firstName,
                lastName: user.lastName,
                userId: user.id
            }));
        } else {
            next(Boom.badRequest('Invalid login'));
        }
    }));

router.post('/register',
    validate(registerValidation),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const baseUrl = req.headers.referer
            if(_.isNil(baseUrl)) {
                next(Boom.badRequest('`referer` required in headers'))
                return
            }
            const newUser = await userController.registerUser({
                userObject: req.body,
                baseUrl
            });
            next(httpResponse.Created('User registered successfully', newUser));
        } catch (e) {
            if (e instanceof NoAssociatedUniversityError) {
                next(Boom.notFound(e.message));
            } else if (e instanceof AlreadyExistsError) {
                next(Boom.badRequest(e.message));
            } else {
                throw new WrappedError('An unknown error occurred', e);
            }
        }
    }));

router.get('/verify',
    validate(verifyValidation),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const verified = await userController.verifyUser(req.query.verifyToken as string);
        if (verified) {
            next(httpResponse.Ok("Verified"));
        } else {
            next(Boom.badRequest("Invalid verification token"));
        }
    }));

router.post('/logout',
    authenticationMiddleware,
    // validate(), // TODO: should we have a no param validate to block all parameters?
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        // TODO fix Request object for session
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await userController.logout((req as any).session.dataValues.uuid);
        res.clearCookie('sessionToken');
        next(httpResponse.Ok("Logged out"));
    }));

router.get('/',
    authenticationMiddleware,
    validate(listUsers),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const users = await userController.list({
            filters: {
                // TODO set types in Request
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                userIds: (req.query as any).userIds,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                courseId: (req.query as any).courseId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                includeGrades: (req.query as any).includeGrades
            }
        });
        next(httpResponse.Ok(null, users));
    }));

router.get('/:id',
    authenticationMiddleware,
    validate(getUser),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const users = await userController.getUser({
            id: parseInt(req.params.id),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            courseId: (req.query as any).courseId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            includeGrades: (req.query as any).includeGrades
        });
        next(httpResponse.Ok(null, users));
    }));

router.post('/email',
    authenticationMiddleware,
    validate(emailUsers),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const result = await userController.email({
            listUsersFilter: {
                userIds: req.body.userIds
            },
            content: req.body.content,
            subject: req.body.subject
        });
        next(httpResponse.Ok(null, result));
    }));

module.exports = router;