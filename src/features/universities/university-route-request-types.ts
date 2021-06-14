/* eslint-disable @typescript-eslint/no-namespace */

/**
 * THIS FILE IS AUTO GENERATED
 * DO NOT MODIFY!!!
 * TO UPDATE THIS FILE CHANGE THE SCHEMES IN THE `-route-validation.ts` FILES
 * THEN RUN `npm run generate-route-types`
 */

import * as Joi from '@hapi/joi';
import 'joi-extract-type';
import * as validations from './university-route-validation';

export namespace GetUniversityRequest {
    export type params = Joi.extractType<typeof validations.getUniversity.params>;
    export type query = Joi.extractType<typeof validations.getUniversity.query>;
    export type body = Joi.extractType<typeof validations.getUniversity.body>;
};

export namespace PostUniversityRequest {
    export type params = Joi.extractType<typeof validations.postUniversity.params>;
    export type query = Joi.extractType<typeof validations.postUniversity.query>;
    export type body = Joi.extractType<typeof validations.postUniversity.body>;
};
