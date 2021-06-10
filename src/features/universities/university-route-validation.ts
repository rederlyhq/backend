import * as Joi from '@hapi/joi';

export const getUniversity = {
    params: {},
    query: {
        limit: Joi.number().min(1).max(20).default(10),
        offset: Joi.number().default(0),
    },
    body: {},
};

export const postUniversity = {
    params: {},
    query: {},
    body: {
        name: Joi.string().required(),
        professorDomain: Joi.string().required(),
        studentDomain: Joi.string().required(),
        autoVerify: Joi.bool().optional().default(false),
        paidUntil: Joi.date().optional().default(new Date()),
    },
};
