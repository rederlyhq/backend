
/**
 * THIS FILE IS AUTO GENERATED
 * DO NOT MODIFY!!!
 * TO UPDATE THIS FILE CHANGE THE SCHEMES IN THE `-route-validation.ts` FILES
 * THEN RUN `npm run generate-route-types`
 */

import * as Joi from '@hapi/joi';
import 'joi-extract-type'
import * as validations from './user-route-validation'

namespace RegisterRequest {
    export type params = Joi.extractType<typeof validations.registerValidation.params>;
    export type query = Joi.extractType<typeof validations.registerValidation.query>;
    export type body = Joi.extractType<typeof validations.registerValidation.body>;
};

namespace LoginRequest {
    export type params = Joi.extractType<typeof validations.loginValidation.params>;
    export type query = Joi.extractType<typeof validations.loginValidation.query>;
    export type body = Joi.extractType<typeof validations.loginValidation.body>;
};

namespace VerifyRequest {
    export type params = Joi.extractType<typeof validations.verifyValidation.params>;
    export type query = Joi.extractType<typeof validations.verifyValidation.query>;
    export type body = Joi.extractType<typeof validations.verifyValidation.body>;
};

namespace ListUsersRequest {
    export type params = Joi.extractType<typeof validations.listUsers.params>;
    export type query = Joi.extractType<typeof validations.listUsers.query>;
    export type body = Joi.extractType<typeof validations.listUsers.body>;
};

namespace GetUserRequest {
    export type params = Joi.extractType<typeof validations.getUser.params>;
    export type query = Joi.extractType<typeof validations.getUser.query>;
    export type body = Joi.extractType<typeof validations.getUser.body>;
};

namespace EmailUsersRequest {
    export type params = Joi.extractType<typeof validations.emailUsers.params>;
    export type query = Joi.extractType<typeof validations.emailUsers.query>;
    export type body = Joi.extractType<typeof validations.emailUsers.body>;
};
