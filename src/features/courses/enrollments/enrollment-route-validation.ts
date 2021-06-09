import * as Joi from '@hapi/joi';

export const bulkEnrollValidation = {
    params: {},
    query: {},
    body: {
        userEmails: Joi.array().items(Joi.string().email()).required(),
        courseId: Joi.number().required()
    }
};

export const getPendingEnrollmentsValidation = {
    params: {},
    query: {
        courseId: Joi.number().required()
    },
    body: {}
};

export const deletePendingEnrollmentsValidation = {
    params: {},
    query: {},
    body: {
        id: Joi.number().required()
    }
};
