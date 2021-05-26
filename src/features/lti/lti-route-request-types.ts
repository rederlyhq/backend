/* eslint-disable @typescript-eslint/no-namespace */

/**
 * THIS FILE IS AUTO GENERATED
 * DO NOT MODIFY!!!
 * TO UPDATE THIS FILE CHANGE THE SCHEMES IN THE `-route-validation.ts` FILES
 * THEN RUN `npm run generate-route-types`
 */

import * as Joi from '@hapi/joi';
import 'joi-extract-type';
import * as validations from './lti-route-validation';

export namespace PostPlaformNewRequest {
    export type params = Joi.extractType<typeof validations.postPlaformNew.params>;
    export type query = Joi.extractType<typeof validations.postPlaformNew.query>;
    export type body = Joi.extractType<typeof validations.postPlaformNew.body>;
};
