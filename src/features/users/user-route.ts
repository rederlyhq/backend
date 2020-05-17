import { Request, Response, NextFunction } from "express";
import userController from "./user-controller";
const router = require('express').Router();
import validate from '../../middleware/joi-validator'
import { registerValidation, loginValidation, verifyValidation, listUsers, emailUsers } from "./user-route-validation";
import Boom = require("boom");
import passport = require("passport");
import { authenticationMiddleware } from "../../middleware/auth";
import httpResponse from "../../utilities/http-response";
import * as asyncHandler from 'express-async-handler'
import NoAssociatedUniversityError from "../../exceptions/no-associated-university-error";
import AlreadyExistsError from "../../exceptions/already-exists-error";
import Session from "../../database/models/session";
import emailHelper from "../../utilities/email-helper";

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
            const baseUrl = `${req.protocol}://${req.get('host')}`;
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
                userIds: (req.query as any).userIds
            }
        });
        next(httpResponse.Ok(null, users));
    }));

router.post('/email',
    authenticationMiddleware,
    validate(emailUsers),
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const users = await userController.list({
            filters: {
                userIds: req.body.userIds
            }
        });
        // TODO switch this from loop to bcc?
        const emailPromises = [];
        for(let i = 0; i < users.length; i++) {
            emailPromises.push(emailHelper.sendEmail({
                content: req.body.content as string,
                subject: req.body.subject as string,
                email: users[i].email
            }));
        }
        await Promise.all(emailPromises);
        // TODO change this to indicate problems
        next(httpResponse.Ok(null, users.map(user => user.id)));
    }));

module.exports = router;