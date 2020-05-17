import * as Joi from 'joi';

export const createCurriculumValidation = {
    body: {
        name: Joi.string().required(),
        active: Joi.boolean().required(),
        public: Joi.boolean().required(),
    }
}

export const getCurriculumValidation = {
    params: {
        id: Joi.number().required(),
    }
}