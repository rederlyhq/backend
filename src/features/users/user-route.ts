import * as _ from 'lodash';
import { Response, NextFunction } from "express";
import userController from "./user-controller";
const router = require('express').Router();
import validate from '../../middleware/joi-validator'
import { registerValidation, loginValidation, verifyValidation, listUsersValidation, emailUsersValidation, getUserValidation, logoutValidation } from "./user-route-validation";
import { RegisterRequest, LoginRequest, VerifyRequest, ListUsersRequest, GetUserRequest, EmailUsersRequest, LogoutRequest } from './user-route-request-types';
import Boom = require("boom");
import passport = require("passport");
import { authenticationMiddleware } from "../../middleware/auth";
import httpResponse from "../../utilities/http-response";
import * as asyncHandler from 'express-async-handler'
import NoAssociatedUniversityError from "../../exceptions/no-associated-university-error";
import AlreadyExistsError from "../../exceptions/already-exists-error";
import WrappedError from '../../exceptions/wrapped-error';
import IncludeGradeOptions from './include-grade-options';
import { RederlyExpressRequest } from '../../extensions/rederly-express-request';

router.post('/login',
    validate(loginValidation),
    passport.authenticate('local'),
    asyncHandler(async (req: RederlyExpressRequest<LoginRequest.params, unknown, LoginRequest.body, LoginRequest.query>, res: Response, next: NextFunction) => {
        const newSession = req.session.passport.user;
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
    asyncHandler(async (req: RederlyExpressRequest<RegisterRequest.params, unknown, RegisterRequest.body, RegisterRequest.query>, res: Response, next: NextFunction) => {
        try {
            // Typing is incorrect here, even if I specify the header twice it comes back as a string (comma delimeted)
            const baseUrl: string = req.headers.origin as string
            if (_.isNil(baseUrl)) {
                next(Boom.badRequest('The `origin` header is required!'))
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
    asyncHandler(async (req: RederlyExpressRequest<VerifyRequest.params, unknown, VerifyRequest.body, VerifyRequest.query>, res: Response, next: NextFunction) => {
        const verified = await userController.verifyUser(req.query.verifyToken);
        if (verified) {
            next(httpResponse.Ok("Verified"));
        } else {
            next(Boom.badRequest("Invalid verification token"));
        }
    }));

router.post('/logout',
    authenticationMiddleware,
    validate(logoutValidation),
    asyncHandler(async (req: RederlyExpressRequest<LogoutRequest.params, unknown, LogoutRequest.body, LogoutRequest.query>, res: Response, next: NextFunction) => {
        await userController.logout(req.session.dataValues.uuid);
        res.clearCookie('sessionToken');
        next(httpResponse.Ok("Logged out"));
    }));

router.get('/',
    authenticationMiddleware,
    validate(listUsersValidation),
    asyncHandler(async (req: RederlyExpressRequest<ListUsersRequest.params, unknown, ListUsersRequest.body, ListUsersRequest.query>, res: Response, next: NextFunction) => {
        const users = await userController.list({
            filters: {
                userIds: req.query.userIds,
                courseId: req.query.courseId,
                includeGrades: req.query.includeGrades as IncludeGradeOptions
            }
        });
        next(httpResponse.Ok(null, users));
    }));

router.get('/:id',
    authenticationMiddleware,
    validate(getUserValidation),
    // Parameters complained when the type was provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, GetUserRequest.body, GetUserRequest.query>, _res: Response, next: NextFunction) => {
        const params = req.params as GetUserRequest.params
        const users = await userController.getUser({
            id: params.id,
            courseId: req.query.courseId,
            includeGrades: req.query.includeGrades as IncludeGradeOptions
        });
        next(httpResponse.Ok(null, users));
    }));

router.post('/email',
    authenticationMiddleware,
    validate(emailUsersValidation),
    asyncHandler(async (req: RederlyExpressRequest<EmailUsersRequest.params, unknown, EmailUsersRequest.body, EmailUsersRequest.query>, res: Response, next: NextFunction) => {
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
