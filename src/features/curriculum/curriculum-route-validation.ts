import * as Joi from '@hapi/joi';

export const createCurriculumValidation = {
    params: {},
    body: {
        name: Joi.string().required(),
        subject: Joi.string().required(),
        comment: Joi.string().required(),
        active: Joi.boolean().optional().default(true),
        public: Joi.boolean().optional().default(true),
        textbooks: Joi.string().required()
        // university is assumed
    },
    query: {}
};

export const createCurriculumUnitValidation = {
    params: {},
    body: {
        name: Joi.string().required(),
        active: Joi.boolean().optional().default(true),
        curriculumId: Joi.number().required(),
        contentOrder: Joi.number().required(),
    },
    query: {}
};

export const createCurriculumTopicValidation = {
    params: {},
    body: {
        name: Joi.string().required(),
        active: Joi.boolean().optional().default(true),
        curriculumUnitContentId: Joi.number().required(),
        contentOrder: Joi.number().required(),
    },
    query: {}
};

export const updateCurriculumUnitValidation = {
    params: {
        id: Joi.number().required()
    },
    body: {
        name: Joi.string().optional(),
        active: Joi.boolean().optional(),
        // curriculumId: Joi.number().optional(),
        contentOrder: Joi.number().optional(),
    },
    query: {}
};

export const updateCurriculumTopicValidation = {
    params: {
        id: Joi.number().required()
    },
    body: {
        name: Joi.string().optional(),
        active: Joi.boolean().optional(),
        // curriculumUnitContentId: Joi.number().optional(),
        contentOrder: Joi.number().optional(),
    },
    query: {}
};

export const createCurriculumTopicQuestionValidation = {
    params: {},
    body: {
        problemNumber: Joi.number().required(),
        webworkQuestionPath: Joi.string().required(),
        curriculumTopicContentId: Joi.number().required(),
    },
    query: {}
};

export const getCurriculumValidation = {
    params: {
        id: Joi.number().required(),
    },
    body: {},
    query: {}
};

export const listCurriculumValidation = {
    params: {},
    body: {},
    query: {}
};
