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

router.post('/login',
    validate(loginValidation),
    passport.authenticate('local'),
    asyncHandler(async (req: any, res: Response, next: NextFunction) => {
        const newSession = req.session.passport.user;
        if (newSession) {
            const cookieOptions = {
                expires: newSession.expires_at
            };
            res.cookie('sessionToken', newSession.uuid, cookieOptions);
            next(httpResponse.Ok());
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
        } catch(e) {
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
        await userController.verifyUser(req.query.verify_token);
        next(httpResponse.Ok("Verified"));
    }));

router.post('/logout',
    authenticationMiddleware,
    asyncHandler(async (req: any, res: Response, next: NextFunction) => {
        await userController.logout(req.session.dataValues.uuid);
        res.clearCookie('sessionToken');
        next(httpResponse.Ok("Logged out"));
    }));

module.exports = router;