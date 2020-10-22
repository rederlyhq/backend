import * as Joi from '@hapi/joi';

export const clientLogValidation = {
    params: {},
    query: {},
    body: {
        logs: Joi.array().items(Joi.any()).required()
    },
};
