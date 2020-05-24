import * as Joi from 'joi';

export const createCurriculumValidation = {
    body: {
        name: Joi.string().required(),
        subject: Joi.string().required(),
        comment: Joi.string().required(),
        active: Joi.boolean().optional().default(true),
        public: Joi.boolean().optional().default(true),
        // university is assumed
    }
}

export const getCurriculumValidation = {
    params: {
        id: Joi.number().required(),
    }
}