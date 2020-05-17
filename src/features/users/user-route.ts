import { Request, Response, NextFunction } from "express";
import configurations from '../../configurations';
import userController from "./user-controller";
const router = require('express').Router();
import validate from '../../middleware/joi-validator'
import { registerValidation, loginValidation, verifyValidation } from "./user-route-validation";
import Boom = require("boom");
import passport = require("passport");
import { authenticationMiddleware } from "../../middleware/auth";
import httpResponse from "../../utilities/http-response";
import * as asyncHandler from 'express-async-handler'
import NoAssociatedUniversityError from "../../exceptions/no-associated-university-error";
import AlreadyExistsError from "../../exceptions/already-exists-error";
import Session from "../../database/models/session";

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
                expires: newSession.expires_at
            };
            res.cookie('sessionToken', newSession.uuid, cookieOptions);
            next(httpResponse.Ok(null, {
                // Database field
                // eslint-disable-next-line @typescript-eslint/camelcase
                role_id: role.id,
                name: user.username
            }));
        } else {
            next(Boom.badRequest('Invalid login'));
        }
    }));

router.post('/register',
    validate(registerValidation),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            const baseUrl = `${req.protocol}://${req.get('host')}/${configurations.server.basePath}`;
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
                throw e;
            }
        }
    }));

router.get('/verify',
    validate(verifyValidation),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const verified = await userController.verifyUser(req.query.verify_token as string);
        if (verified) {
            next(httpResponse.Ok("Verified"));
        } else {
            next(Boom.badRequest("Invalid verification token"));
        }
    }));

router.post('/logout',
    authenticationMiddleware,
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        // TODO fix Request object for session
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await userController.logout((req as any).session.dataValues.uuid);
        res.clearCookie('sessionToken');
        next(httpResponse.Ok("Logged out"));
    }));

module.exports = router;