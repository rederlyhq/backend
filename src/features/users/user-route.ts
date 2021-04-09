import * as _ from 'lodash';
import { Response } from 'express';
import userController from './user-controller';
const router = require('express').Router();
import passport = require('passport');
import { authenticationMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import * as asyncHandler from 'express-async-handler';
import IncludeGradeOptions from './include-grade-options';
import { RederlyExpressRequest, TypedNextFunction, EmptyExpressParams, EmptyExpressQuery } from '../../extensions/rederly-express-request';
import logger from '../../utilities/logger';
import { Constants } from '../../constants';
import { DeepAddIndexSignature } from '../../extensions/typescript-utility-extensions';

import { validationMiddleware, ValidationMiddlewareOptions } from '../../middleware/validation-middleware';

import { usersGetCheckIn } from '@rederly/backend-validation';
router.all('/check-in',
    // No validation
    authenticationMiddleware,
    validationMiddleware(usersGetCheckIn as ValidationMiddlewareOptions),
    (_req: RederlyExpressRequest<EmptyExpressParams, unknown, never, EmptyExpressQuery>, _res: Response, next: TypedNextFunction<usersGetCheckIn.IResponse>) => {
        next(httpResponse.Ok('Checked in', null));
    });

    import { usersPostImpersonate } from '@rederly/backend-validation';
    router.post('/impersonate',
    validationMiddleware(usersPostImpersonate),
    authenticationMiddleware,
    (req: RederlyExpressRequest<EmptyExpressParams, never, usersPostImpersonate.IBody, EmptyExpressQuery>, res: Response, next: TypedNextFunction<usersPostImpersonate.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        
        let token = `${req.session.uuid}_${req.session.expiresAt.getTime()}`;
        if (req.body.role) {
            token += '_' + req.body.role;
        }
        const cookieOptions = {
            expires: req.session.expiresAt
        };
        res.cookie('sessionToken', token, cookieOptions);
        next(httpResponse.Ok('Impersonated', null));
    });

import { usersPostLogin } from '@rederly/backend-validation';
router.post('/login',
validationMiddleware(usersPostLogin),
    passport.authenticate('local'),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, usersPostLogin.IResponse , usersPostLogin.IBody, EmptyExpressQuery>, res: Response, next: TypedNextFunction<usersPostLogin.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const newSession = req.session.passport.user;
        const user = await newSession.getUser();
        const role = await user.getRole();
        if (newSession) {
            const cookieOptions = {
                expires: newSession.expiresAt
            };
            const token = `${newSession.uuid}_${newSession.expiresAt.getTime()}`;
            res.cookie('sessionToken', token, cookieOptions);
            const resp = httpResponse.Ok('Logged in', {
                roleId: role.id as Role,
                firstName: user.firstName,
                lastName: user.lastName,
                userId: user.id,
                uuid: user.uuid
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        } else {
            const resp = httpResponse.BadRequest('Invalid login', null);
            next(resp as DeepAddIndexSignature<typeof resp>);
        }
    }));

import { usersPostRegister } from '@rederly/backend-validation';
router.post('/register',
    validationMiddleware(usersPostRegister),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, unknown, usersPostRegister.IBody, EmptyExpressQuery>, _res: Response, next: TypedNextFunction<usersPostRegister.IResponse>) => {
        // Typing is incorrect here, even if I specify the header twice it comes back as a string (comma delimeted)
        const baseUrl: string = req.headers.origin as string;
        if (_.isNil(baseUrl)) {
            const resp = httpResponse.BadRequest('The `origin` header is required!', null);
            next(resp as DeepAddIndexSignature<typeof resp>);
            return;
        }
        const newUser = await userController.registerUser({
            userObject: req.body,
            baseUrl
        });
        const resp = httpResponse.Created('User registered successfully', newUser);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { usersPostForgotPassword } from '@rederly/backend-validation';
import Role from '../permissions/roles';
router.post('/forgot-password',
    validationMiddleware(usersPostForgotPassword),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, usersPostForgotPassword.IResponse, usersPostForgotPassword.IBody, EmptyExpressQuery>, res: Response, next: TypedNextFunction<usersPostForgotPassword.IResponse>) => {
        // Typing is incorrect here, even if I specify the header twice it comes back as a string (comma delimeted)
        const baseUrl: string = req.headers.origin as string;
        if (_.isNil(baseUrl)) {
            const resp = httpResponse.BadRequest('The `origin` header is required!', null);
            next(resp as DeepAddIndexSignature<typeof resp>);
            return;
        }

        await userController.forgotPassword({
            email: req.body.email,
            baseUrl
        });
        const resp = httpResponse.Ok('Forgot password request successful!', null);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { usersPutUpdatePassword } from '@rederly/backend-validation';
router.put('/update-password',
    authenticationMiddleware,
    validationMiddleware(usersPutUpdatePassword),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, usersPutUpdatePassword.IResponse, usersPutUpdatePassword.IBody, EmptyExpressQuery>, res: Response, next: TypedNextFunction<usersPutUpdatePassword.IResponse>) => {
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
        const resp = httpResponse.Ok('Password updated!', null);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { usersPutUpdateForgottonPassword } from '@rederly/backend-validation';
router.put('/update-forgotton-password',
    validationMiddleware(usersPutUpdateForgottonPassword),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, usersPutUpdateForgottonPassword.IResponse, usersPutUpdateForgottonPassword.IBody, EmptyExpressQuery>, res: Response, next: TypedNextFunction<usersPutUpdateForgottonPassword.IResponse>) => {
        await userController.updateForgottonPassword({
            newPassword: req.body.newPassword,
            email: req.body.email,
            forgotPasswordToken: req.body.forgotPasswordToken
        });
        const resp = httpResponse.Ok('Forgot password request successful!', null);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { usersGetVerify } from '@rederly/backend-validation';
router.get('/verify',
    validationMiddleware(usersGetVerify),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, usersGetVerify.IResponse, unknown, EmptyExpressQuery>, _res: Response<usersGetVerify.IResponse>, next: TypedNextFunction<usersGetVerify.IResponse>) => {
        const query = req.query as unknown as usersGetVerify.IQuery;
        const verified = await userController.verifyUser(query.verifyToken, query.confirmEmail);
        if (verified) {
            const resp = httpResponse.Ok('Verified', null);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } else {
            const resp = httpResponse.BadRequest('Invalid verification token', null);
            next(resp as DeepAddIndexSignature<typeof resp>);
        }
    }));

import { usersPostResendVerification } from '@rederly/backend-validation';
router.post('/resend-verification',
        validationMiddleware(usersPostResendVerification),
        asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, usersPostResendVerification.IResponse, usersPostResendVerification.IBody, EmptyExpressQuery>, _res: Response, next: TypedNextFunction<usersPostResendVerification.IResponse>) => {
        const baseUrl: string = req.headers.origin as string;
        if (_.isNil(baseUrl)) {
            const resp = httpResponse.BadRequest('The `origin` header is required!', null);
            next(resp as DeepAddIndexSignature<typeof resp>);
            return;
        }
        await userController.setupUserVerification({
            baseUrl,
            refreshVerifyToken: true,
            userEmail: req.body.email
        });
        const resp = httpResponse.Ok('Verification information updated', null);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { usersPostLogout } from '@rederly/backend-validation';
router.post('/logout',
    authenticationMiddleware,
    validationMiddleware(usersPostLogout),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, usersPostLogout.IResponse, usersPostLogout.IBody, EmptyExpressQuery>, res: Response<usersPostLogout.IResponse>, next: TypedNextFunction<usersPostLogout.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error('Session is nil even after authentication middleware');
        }
        await userController.logout(req.session.dataValues.uuid);
        res.clearCookie('sessionToken');
        const resp = httpResponse.Ok('Logged out', null);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { usersGetUsers } from '@rederly/backend-validation';
router.get('/',
    authenticationMiddleware,
    validationMiddleware(usersGetUsers),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, usersGetUsers.IResponse, unknown, usersGetUsers.IQuery>, _res: Response<usersGetUsers.IResponse>, next: TypedNextFunction<usersGetUsers.IResponse>) => {
        const users = await userController.list({
            filters: {
                userIds: req.query.userIds,
                courseId: req.query.courseId,
                includeGrades: req.query.includeGrades as IncludeGradeOptions
            }
        });
        const resp = httpResponse.Ok('Fetched users', users.map(user => user.get({plain: true}) as UserInterface));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { usersGetStatus } from '@rederly/backend-validation';
router.get('/status',
    authenticationMiddleware,
    validationMiddleware(usersGetStatus as ValidationMiddlewareOptions),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, usersGetStatus.IResponse, unknown, EmptyExpressQuery>, _res: Response<usersGetStatus.IResponse>, next: TypedNextFunction<usersGetStatus.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = await req.session.getUser();
        const university = await user.getUniversity();
        const response = {
            userPaidUntil: user.paidUntil,
            universityPaidUntil: university.paidUntil,
        };

        const resp = httpResponse.Ok('fetched user status', response);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { usersGetUsersById } from '@rederly/backend-validation';
router.get('/:id',
    authenticationMiddleware,
    validationMiddleware(usersGetUsersById),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, usersGetUsersById.IResponse, unknown, usersGetUsersById.IQuery>, _res: Response<usersGetUsersById.IResponse>, next: TypedNextFunction<usersGetUsersById.IResponse>) => {
        const params = req.params as unknown as usersGetUsersById.IParams;
        const users = await userController.getUser({
            id: params.id,
            courseId: req.query.courseId,
            includeGrades: req.query.includeGrades as IncludeGradeOptions
        });
        const resp = httpResponse.Ok('Fetched user', users.get({plain: true}) as UserInterface);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { usersPostEmail } from '@rederly/backend-validation';
import { UserInterface } from '../../database/models/user';
router.post('/email',
    authenticationMiddleware,
    validationMiddleware(usersPostEmail),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, unknown, usersPostEmail.IBody, EmptyExpressQuery>, res: Response<usersPostEmail.IResponse>, next: TypedNextFunction<usersPostEmail.IResponse>) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = await req.session.getUser();

        const result = await userController.email({
            listUsersFilter: {
                userIds: req.body.userIds
            },
            content: req.body.content,
            subject: req.body.subject,
            replyTo: user.email,
        });
        const resp = httpResponse.Ok('Email sent', result);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

module.exports = router;
