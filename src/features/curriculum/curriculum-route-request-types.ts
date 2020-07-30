
/**
 * THIS FILE IS AUTO GENERATED
 * DO NOT MODIFY!!!
 * TO UPDATE THIS FILE CHANGE THE SCHEMES IN THE `-route-validation.ts` FILES
 * THEN RUN `npm run generate-route-types`
 */

import * as Joi from '@hapi/joi';
import 'joi-extract-type'
import * as validations from './curriculum-route-validation'

namespace CreateCurriculumRequest {
    export type params = Joi.extractType<typeof validations.createCurriculumValidation.params>;
    export type query = Joi.extractType<typeof validations.createCurriculumValidation.query>;
    export type body = Joi.extractType<typeof validations.createCurriculumValidation.body>;
};

namespace CreateCurriculumUnitRequest {
    export type params = Joi.extractType<typeof validations.createCurriculumUnitValidation.params>;
    export type query = Joi.extractType<typeof validations.createCurriculumUnitValidation.query>;
    export type body = Joi.extractType<typeof validations.createCurriculumUnitValidation.body>;
};

namespace CreateCurriculumTopicRequest {
    export type params = Joi.extractType<typeof validations.createCurriculumTopicValidation.params>;
    export type query = Joi.extractType<typeof validations.createCurriculumTopicValidation.query>;
    export type body = Joi.extractType<typeof validations.createCurriculumTopicValidation.body>;
};

namespace UpdateCurriculumUnitRequest {
    export type params = Joi.extractType<typeof validations.updateCurriculumUnitValidation.params>;
    export type query = Joi.extractType<typeof validations.updateCurriculumUnitValidation.query>;
    export type body = Joi.extractType<typeof validations.updateCurriculumUnitValidation.body>;
};

namespace UpdateCurriculumTopicRequest {
    export type params = Joi.extractType<typeof validations.updateCurriculumTopicValidation.params>;
    export type query = Joi.extractType<typeof validations.updateCurriculumTopicValidation.query>;
    export type body = Joi.extractType<typeof validations.updateCurriculumTopicValidation.body>;
};

namespace CreateCurriculumTopicQuestionRequest {
    export type params = Joi.extractType<typeof validations.createCurriculumTopicQuestionValidation.params>;
    export type query = Joi.extractType<typeof validations.createCurriculumTopicQuestionValidation.query>;
    export type body = Joi.extractType<typeof validations.createCurriculumTopicQuestionValidation.body>;
};

namespace GetCurriculumRequest {
    export type params = Joi.extractType<typeof validations.getCurriculumValidation.params>;
    export type query = Joi.extractType<typeof validations.getCurriculumValidation.query>;
    export type body = Joi.extractType<typeof validations.getCurriculumValidation.body>;
};
