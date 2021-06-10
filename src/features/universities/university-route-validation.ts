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
        universityName: Joi.string().required(),
        profEmailDomain: Joi.string().required(),
        studentEmailDomain: Joi.string().required(),
        verifyInstitutionalEmail: Joi.bool().optional().default(true),
        paidUntil: Joi.date().optional().default(new Date()),
    },
};
