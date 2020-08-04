/* eslint-disable @typescript-eslint/no-namespace */

/**
 * THIS FILE IS AUTO GENERATED
 * DO NOT MODIFY!!!
 * TO UPDATE THIS FILE CHANGE THE SCHEMES IN THE `-route-validation.ts` FILES
 * THEN RUN `npm run generate-route-types`
 */

import * as Joi from '@hapi/joi';
import 'joi-extract-type';
import * as validations from './curriculum-route-validation';

export namespace CreateCurriculumRequest {
    export type params = Joi.extractType<typeof validations.createCurriculumValidation.params>;
    export type query = Joi.extractType<typeof validations.createCurriculumValidation.query>;
    export type body = Joi.extractType<typeof validations.createCurriculumValidation.body>;
};

export namespace CreateCurriculumUnitRequest {
    export type params = Joi.extractType<typeof validations.createCurriculumUnitValidation.params>;
    export type query = Joi.extractType<typeof validations.createCurriculumUnitValidation.query>;
    export type body = Joi.extractType<typeof validations.createCurriculumUnitValidation.body>;
};

export namespace CreateCurriculumTopicRequest {
    export type params = Joi.extractType<typeof validations.createCurriculumTopicValidation.params>;
    export type query = Joi.extractType<typeof validations.createCurriculumTopicValidation.query>;
    export type body = Joi.extractType<typeof validations.createCurriculumTopicValidation.body>;
};

export namespace UpdateCurriculumUnitRequest {
    export type params = Joi.extractType<typeof validations.updateCurriculumUnitValidation.params>;
    export type query = Joi.extractType<typeof validations.updateCurriculumUnitValidation.query>;
    export type body = Joi.extractType<typeof validations.updateCurriculumUnitValidation.body>;
};

export namespace UpdateCurriculumTopicRequest {
    export type params = Joi.extractType<typeof validations.updateCurriculumTopicValidation.params>;
    export type query = Joi.extractType<typeof validations.updateCurriculumTopicValidation.query>;
    export type body = Joi.extractType<typeof validations.updateCurriculumTopicValidation.body>;
};

export namespace CreateCurriculumTopicQuestionRequest {
    export type params = Joi.extractType<typeof validations.createCurriculumTopicQuestionValidation.params>;
    export type query = Joi.extractType<typeof validations.createCurriculumTopicQuestionValidation.query>;
    export type body = Joi.extractType<typeof validations.createCurriculumTopicQuestionValidation.body>;
};

export namespace GetCurriculumRequest {
    export type params = Joi.extractType<typeof validations.getCurriculumValidation.params>;
    export type query = Joi.extractType<typeof validations.getCurriculumValidation.query>;
    export type body = Joi.extractType<typeof validations.getCurriculumValidation.body>;
};

export namespace ListCurriculumRequest {
    export type params = Joi.extractType<typeof validations.listCurriculumValidation.params>;
    export type query = Joi.extractType<typeof validations.listCurriculumValidation.query>;
    export type body = Joi.extractType<typeof validations.listCurriculumValidation.body>;
};
