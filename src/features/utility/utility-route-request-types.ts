/* eslint-disable @typescript-eslint/no-namespace */

/**
 * THIS FILE IS AUTO GENERATED
 * DO NOT MODIFY!!!
 * TO UPDATE THIS FILE CHANGE THE SCHEMES IN THE `-route-validation.ts` FILES
 * THEN RUN `npm run generate-route-types`
 */

import * as Joi from '@hapi/joi';
import 'joi-extract-type';
import * as validations from './utility-route-validation';

export namespace ClientLogRequest {
    export type params = Joi.extractType<typeof validations.clientLogValidation.params>;
    export type query = Joi.extractType<typeof validations.clientLogValidation.query>;
    export type body = Joi.extractType<typeof validations.clientLogValidation.body>;
};
