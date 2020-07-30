
/**
 * THIS FILE IS AUTO GENERATED
 * DO NOT MODIFY!!!
 * TO UPDATE THIS FILE CHANGE THE SCHEMES IN THE `-route-validation.ts` FILES
 * THEN RUN `npm run generate-route-types`
 */

import * as Joi from '@hapi/joi';
import 'joi-extract-type'
import * as validations from './user-route-validation'

export namespace RegisterRequest {
    export type params = Joi.extractType<typeof validations.registerValidation.params>;
    export type query = Joi.extractType<typeof validations.registerValidation.query>;
    export type body = Joi.extractType<typeof validations.registerValidation.body>;
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
