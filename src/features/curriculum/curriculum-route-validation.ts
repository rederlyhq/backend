// Allowing camel case for db fields
/* eslint-disable @typescript-eslint/camelcase */
import * as Joi from 'joi';

export const createCurriculumValidation = {
    body: {
        university_id: Joi.number().required(),
        curriculum_name: Joi.string().required(),
        active: Joi.boolean().required(),
        public: Joi.boolean().required(),
    }
}

export const getCurriculumValidation = {
    params: {
        id: Joi.number().required(),
    }
}