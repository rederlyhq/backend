import * as Joi from '@hapi/joi';

export const feedbackValidation = {
    params: {},
    query: {},
    body: {
        summary: Joi.string().required(),
        description: Joi.string().required(),
    },
};
