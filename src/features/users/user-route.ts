import * as _ from 'lodash';
import * as express from 'express';
import userController from './user-controller';
import passport = require('passport');
import { authenticationMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import IncludeGradeOptions from './include-grade-options';
import { asyncHandler } from '../../extensions/rederly-express-request';
import logger from '../../utilities/logger';
import { Constants } from '../../constants';
import { DeepAddIndexSignature } from '../../extensions/typescript-utility-extensions';
import { UserInterface } from '../../database/models/user';

import { validationMiddleware, ValidationMiddlewareOptions } from '../../middleware/validation-middleware';

const router = express.Router();

import { usersGetCheckIn } from '@rederly/backend-validation';
router.all('/check-in',
    // No validation
    authenticationMiddleware,
    validationMiddleware(usersGetCheckIn as ValidationMiddlewareOptions),
    asyncHandler<usersGetCheckIn.IParams, usersGetCheckIn.IResponse, usersGetCheckIn.IBody, usersGetCheckIn.IQuery>((_req, _res, next) => {
        next(httpResponse.Ok('Checked in', null));
    }));

import { usersPostImpersonate } from '@rederly/backend-validation';
router.post('/impersonate',
    validationMiddleware(usersPostImpersonate),
    authenticationMiddleware,
    asyncHandler<usersPostImpersonate.IParams, usersPostImpersonate.IResponse, usersPostImpersonate.IBody, usersPostImpersonate.IQuery>((req, res, next) => {
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
    }));

import { usersPostLogin } from '@rederly/backend-validation';
router.post('/login',
validationMiddleware(usersPostLogin),
    passport.authenticate('local'),
    asyncHandler<usersPostLogin.IParams, usersPostLogin.IResponse , usersPostLogin.IBody, usersPostLogin.IQuery>(async (req, res, next) => {
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
    asyncHandler<usersPostRegister.IParams, usersPostRegister.IResponse, usersPostRegister.IBody, usersPostRegister.IQuery>(async (req, _res, next) => {
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
    asyncHandler<usersPostForgotPassword.IParams, usersPostForgotPassword.IResponse, usersPostForgotPassword.IBody, usersPostForgotPassword.IQuery>(async (req, _res, next) => {
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
    asyncHandler<usersPutUpdatePassword.IParams, usersPutUpdatePassword.IResponse, usersPutUpdatePassword.IBody, usersPutUpdatePassword.IQuery>(async (req, _res, next) => {
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
    asyncHandler<usersPutUpdateForgottonPassword.IParams, usersPutUpdateForgottonPassword.IResponse, usersPutUpdateForgottonPassword.IBody, usersPutUpdateForgottonPassword.IQuery>(async (req, _res, next) => {
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
    asyncHandler<usersGetVerify.IParams, usersGetVerify.IResponse, usersGetVerify.IBody, usersGetVerify.IQuery>(async (req, _res, next) => {
        const verified = await userController.verifyUser(req.query.verifyToken, req.query.confirmEmail);
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
        asyncHandler<usersPostResendVerification.IParams, usersPostResendVerification.IResponse, usersPostResendVerification.IBody, usersPostResendVerification.IQuery>(async (req, _res, next) => {
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
    asyncHandler<usersPostLogout.IParams, usersPostLogout.IResponse, usersPostLogout.IBody, usersPostLogout.IQuery>(async (req, res, next) => {
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
    asyncHandler<usersGetUsers.IParams, usersGetUsers.IResponse, usersGetUsers.IBody, usersGetUsers.IQuery>(async (req, _res, next) => {
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
    asyncHandler<usersGetStatus.IParams, usersGetStatus.IResponse, usersGetStatus.IBody, usersGetStatus.IQuery>(async (req, _res, next) => {
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
    asyncHandler<usersGetUsersById.IParams, usersGetUsersById.IResponse, usersGetUsersById.IBody, usersGetUsersById.IQuery>(async (req, _res, next) => {
        const users = await userController.getUser({
            id: req.params.id,
            courseId: req.query.courseId,
            includeGrades: req.query.includeGrades as IncludeGradeOptions
        });
        const resp = httpResponse.Ok('Fetched user', users.get({plain: true}) as UserInterface);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { usersPostEmail } from '@rederly/backend-validation';
router.post('/email',
    authenticationMiddleware,
    validationMiddleware(usersPostEmail),
    asyncHandler<usersPostEmail.IParams, usersPostEmail.IResponse, usersPostEmail.IBody, usersPostEmail.IQuery>(async (req, _res, next) => {
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
