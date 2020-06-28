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

export const createCurriculumUnitValidation = {
    body: {
        name: Joi.string().required(),
        active: Joi.boolean().optional().default(true),
        curriculumId: Joi.number().required(),
        contentOrder: Joi.number().required(),
    }
}

export const createCurriculumTopicValidation = {
    body: {
        name: Joi.string().required(),
        active: Joi.boolean().optional().default(true),
        curriculumUnitContentId: Joi.number().required(),
        contentOrder: Joi.number().required(),
    }
}

export const updateCurriculumUnitValidation = {
    body: {
        name: Joi.string().optional(),
        active: Joi.boolean().optional(),
        // curriculumId: Joi.number().optional(),
        contentOrder: Joi.number().optional(),
    }
}

export const updateCurriculumTopicValidation = {
    body: {
        name: Joi.string().optional(),
        active: Joi.boolean().optional(),
        // curriculumUnitContentId: Joi.number().optional(),
        contentOrder: Joi.number().optional(),
    }
}

export const createCurriculumTopicQuestionValidation = {
    body: {
        problemNumber: Joi.number().required(),
        webworkQuestionPath: Joi.string().required(),
        curriculumTopicContentId: Joi.number().required(),
    }
}

export const getCurriculumValidation = {
    params: {
        id: Joi.number().required(),
    }
}