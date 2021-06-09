/* eslint-disable @typescript-eslint/no-namespace */

/**
 * THIS FILE IS AUTO GENERATED
 * DO NOT MODIFY!!!
 * TO UPDATE THIS FILE CHANGE THE SCHEMES IN THE `-route-validation.ts` FILES
 * THEN RUN `npm run generate-route-types`
 */

import * as Joi from '@hapi/joi';
import 'joi-extract-type';
import * as validations from './enrollment-route-validation';

export namespace BulkEnrollRequest {
    export type params = Joi.extractType<typeof validations.bulkEnrollValidation.params>;
    export type query = Joi.extractType<typeof validations.bulkEnrollValidation.query>;
    export type body = Joi.extractType<typeof validations.bulkEnrollValidation.body>;
};

export namespace GetPendingEnrollmentsRequest {
    export type params = Joi.extractType<typeof validations.getPendingEnrollmentsValidation.params>;
    export type query = Joi.extractType<typeof validations.getPendingEnrollmentsValidation.query>;
    export type body = Joi.extractType<typeof validations.getPendingEnrollmentsValidation.body>;
};

export namespace DeletePendingEnrollmentsRequest {
    export type params = Joi.extractType<typeof validations.deletePendingEnrollmentsValidation.params>;
    export type query = Joi.extractType<typeof validations.deletePendingEnrollmentsValidation.query>;
    export type body = Joi.extractType<typeof validations.deletePendingEnrollmentsValidation.body>;
};
