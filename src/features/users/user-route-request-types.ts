/* eslint-disable @typescript-eslint/no-namespace */

/**
 * THIS FILE IS AUTO GENERATED
 * DO NOT MODIFY!!!
 * TO UPDATE THIS FILE CHANGE THE SCHEMES IN THE `-route-validation.ts` FILES
 * THEN RUN `npm run generate-route-types`
 */

import * as Joi from '@hapi/joi';
import 'joi-extract-type';
import * as validations from './user-route-validation';

export namespace ImpersonateRequest {
    export type params = Joi.extractType<typeof validations.impersonateValidation.params>;
    export type query = Joi.extractType<typeof validations.impersonateValidation.query>;
    export type body = Joi.extractType<typeof validations.impersonateValidation.body>;
};

export namespace GetSessionRequest {
    export type params = Joi.extractType<typeof validations.getSessionValidation.params>;
    export type query = Joi.extractType<typeof validations.getSessionValidation.query>;
    export type body = Joi.extractType<typeof validations.getSessionValidation.body>;
};

export namespace ForgotPasswordRequest {
    export type params = Joi.extractType<typeof validations.forgotPasswordValidation.params>;
    export type query = Joi.extractType<typeof validations.forgotPasswordValidation.query>;
    export type body = Joi.extractType<typeof validations.forgotPasswordValidation.body>;
};

export namespace UpdatePasswordRequest {
    export type params = Joi.extractType<typeof validations.updatePasswordValidation.params>;
    export type query = Joi.extractType<typeof validations.updatePasswordValidation.query>;
    export type body = Joi.extractType<typeof validations.updatePasswordValidation.body>;
};

export namespace UpdateNilPasswordRequest {
    export type params = Joi.extractType<typeof validations.updateNilPasswordValidation.params>;
    export type query = Joi.extractType<typeof validations.updateNilPasswordValidation.query>;
    export type body = Joi.extractType<typeof validations.updateNilPasswordValidation.body>;
};

export namespace UpdateForgottonPasswordRequest {
    export type params = Joi.extractType<typeof validations.updateForgottonPasswordValidation.params>;
    export type query = Joi.extractType<typeof validations.updateForgottonPasswordValidation.query>;
    export type body = Joi.extractType<typeof validations.updateForgottonPasswordValidation.body>;
};

export namespace RegisterRequest {
    export type params = Joi.extractType<typeof validations.registerValidation.params>;
    export type query = Joi.extractType<typeof validations.registerValidation.query>;
    export type body = Joi.extractType<typeof validations.registerValidation.body>;
};

export namespace LtikRequest {
    export type params = Joi.extractType<typeof validations.ltikValidation.params>;
    export type query = Joi.extractType<typeof validations.ltikValidation.query>;
    export type body = Joi.extractType<typeof validations.ltikValidation.body>;
};

export namespace LoginRequest {
    export type params = Joi.extractType<typeof validations.loginValidation.params>;
    export type query = Joi.extractType<typeof validations.loginValidation.query>;
    export type body = Joi.extractType<typeof validations.loginValidation.body>;
};

export namespace VerifyRequest {
    export type params = Joi.extractType<typeof validations.verifyValidation.params>;
    export type query = Joi.extractType<typeof validations.verifyValidation.query>;
    export type body = Joi.extractType<typeof validations.verifyValidation.body>;
};

export namespace ResendVerificationRequest {
    export type params = Joi.extractType<typeof validations.resendVerificationValidation.params>;
    export type query = Joi.extractType<typeof validations.resendVerificationValidation.query>;
    export type body = Joi.extractType<typeof validations.resendVerificationValidation.body>;
};

export namespace LogoutRequest {
    export type params = Joi.extractType<typeof validations.logoutValidation.params>;
    export type query = Joi.extractType<typeof validations.logoutValidation.query>;
    export type body = Joi.extractType<typeof validations.logoutValidation.body>;
};

export namespace ListUsersRequest {
    export type params = Joi.extractType<typeof validations.listUsersValidation.params>;
    export type query = Joi.extractType<typeof validations.listUsersValidation.query>;
    export type body = Joi.extractType<typeof validations.listUsersValidation.body>;
};

export namespace GetUserRequest {
    export type params = Joi.extractType<typeof validations.getUserValidation.params>;
    export type query = Joi.extractType<typeof validations.getUserValidation.query>;
    export type body = Joi.extractType<typeof validations.getUserValidation.body>;
};

export namespace EmailUsersRequest {
    export type params = Joi.extractType<typeof validations.emailUsersValidation.params>;
    export type query = Joi.extractType<typeof validations.emailUsersValidation.query>;
    export type body = Joi.extractType<typeof validations.emailUsersValidation.body>;
};

export namespace UserStatusRequest {
    export type params = Joi.extractType<typeof validations.userStatusValidation.params>;
    export type query = Joi.extractType<typeof validations.userStatusValidation.query>;
    export type body = Joi.extractType<typeof validations.userStatusValidation.body>;
};

export namespace GetJWTRequest {
    export type params = Joi.extractType<typeof validations.getJWTValidation.params>;
    export type query = Joi.extractType<typeof validations.getJWTValidation.query>;
    export type body = Joi.extractType<typeof validations.getJWTValidation.body>;
};
