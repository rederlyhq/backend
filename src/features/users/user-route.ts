import * as _ from 'lodash';
import { Response, NextFunction } from 'express';
import userController from './user-controller';
const router = require('express').Router();
import validate from '../../middleware/joi-validator';
import { registerValidation, loginValidation, verifyValidation, listUsersValidation, emailUsersValidation, getUserValidation, logoutValidation, forgotPasswordValidation, updatePasswordValidation, updateForgottonPasswordValidation, resendVerificationValidation } from './user-route-validation';
import { RegisterRequest, LoginRequest, VerifyRequest, ListUsersRequest, GetUserRequest, EmailUsersRequest, LogoutRequest, ForgotPasswordRequest, UpdatePasswordRequest, UpdateForgottonPasswordRequest, ResendVerificationRequest } from './user-route-request-types';
import Boom = require('boom');
import passport = require('passport');
import { authenticationMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import * as asyncHandler from 'express-async-handler';
import IncludeGradeOptions from './include-grade-options';
import { RederlyExpressRequest } from '../../extensions/rederly-express-request';
import logger from '../../utilities/logger';

router.post('/login',
    validate(loginValidation),
    passport.authenticate('local'),
    asyncHandler(async (req: RederlyExpressRequest<LoginRequest.params, unknown, LoginRequest.body, LoginRequest.query>, res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new Error('Session is nil even after authentication middleware');
        }
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
    asyncHandler(async (req: RederlyExpressRequest<RegisterRequest.params, unknown, RegisterRequest.body, RegisterRequest.query>, _res: Response, next: NextFunction) => {
        // Typing is incorrect here, even if I specify the header twice it comes back as a string (comma delimeted)
        const baseUrl: string = req.headers.origin as string;
        if (_.isNil(baseUrl)) {
            next(Boom.badRequest('The `origin` header is required!'));
            return;
        }
        const newUser = await userController.registerUser({
            userObject: req.body,
            baseUrl
        });
        next(httpResponse.Created('User registered successfully', newUser));
    }));

router.post('/forgot-password',
    validate(forgotPasswordValidation),
    asyncHandler(async (req: RederlyExpressRequest<ForgotPasswordRequest.params, unknown, ForgotPasswordRequest.body, ForgotPasswordRequest.query>, res: Response, next: NextFunction) => {
        // Typing is incorrect here, even if I specify the header twice it comes back as a string (comma delimeted)
        const baseUrl: string = req.headers.origin as string;
        if (_.isNil(baseUrl)) {
            next(Boom.badRequest('The `origin` header is required!'));
            return;
        }

        await userController.forgotPassword({
            email: req.body.email,
            baseUrl
        });
        next(httpResponse.Ok('Forgot password request successful!'));
    }));

router.put('/update-password',
    authenticationMiddleware,
    validate(updatePasswordValidation),
    asyncHandler(async (req: RederlyExpressRequest<UpdatePasswordRequest.params, unknown, UpdatePasswordRequest.body, UpdatePasswordRequest.query>, res: Response, next: NextFunction) => {
        const user = await req.session?.getUser();
        if(_.isNil(user)) {
            logger.error('Impossible! A user must exist with a session with authentication middleware');
            throw new Error('An error occurred');
        }
        await userController.updatePassword({
            newPassword: req.body.newPassword,
            oldPassword: req.body.oldPassword,
            id: user.id
        });
        next(httpResponse.Ok('Password updated!'));
    }));

router.put('/update-forgotton-password',
    validate(updateForgottonPasswordValidation),
    asyncHandler(async (req: RederlyExpressRequest<UpdateForgottonPasswordRequest.params, unknown, UpdateForgottonPasswordRequest.body, UpdateForgottonPasswordRequest.query>, res: Response, next: NextFunction) => {
        await userController.updateForgottonPassword({
            newPassword: req.body.newPassword,
            email: req.body.email,
            forgotPasswordToken: req.body.forgotPasswordToken
        });
        next(httpResponse.Ok('Forgot password request successful!'));
    }));

router.get('/verify',
    validate(verifyValidation),
    // Query and params are more restrictive types, however with express middlewhere we can and do modify to match our types from validation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<any, unknown, VerifyRequest.body, any>, _res: Response, next: NextFunction) => {
        const query = req.query as VerifyRequest.query;
        const verified = await userController.verifyUser(query.verifyToken);
        if (verified) {
            next(httpResponse.Ok('Verified'));
        } else {
            next(Boom.badRequest('Invalid verification token'));
        }
    }));

router.post('/resend-verification',
    validate(resendVerificationValidation),
    asyncHandler(async (req: RederlyExpressRequest<ResendVerificationRequest.params, unknown, ResendVerificationRequest.body, ResendVerificationRequest.query>, _res: Response, next: NextFunction) => {
        const baseUrl: string = req.headers.origin as string;
        if (_.isNil(baseUrl)) {
            next(Boom.badRequest('The `origin` header is required!'));
            return;
        }
        await userController.setupUserVerification({
            baseUrl,
            refreshVerifyToken: true,
            userEmail: req.body.email
        });

        next(httpResponse.Ok('Verification information updated'));
    }));

router.post('/logout',
    authenticationMiddleware,
    validate(logoutValidation),
    asyncHandler(async (req: RederlyExpressRequest<LogoutRequest.params, unknown, LogoutRequest.body, LogoutRequest.query>, res: Response, next: NextFunction) => {
        if (_.isNil(req.session)) {
            throw new Error('Session is nil even after authentication middleware');
        }
        await userController.logout(req.session.dataValues.uuid);
        res.clearCookie('sessionToken');
        next(httpResponse.Ok('Logged out'));
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
        const params = req.params as GetUserRequest.params;
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
