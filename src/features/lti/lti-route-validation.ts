import * as Joi from '@hapi/joi';

export const postPlaformNew = {
    params: {
    },
    query: {},
    body: {
        url: Joi.string().required(),
        name: Joi.string().required(),
        clientId: Joi.string().required(),
        authenticationEndpoint:Joi.string().required(),
        accesstokenEndpoint:Joi.string().required(),
        authConfigKey: Joi.string().required(),
    },
};
