import * as Joi from 'joi';

export const registerValidation = {
    body: {
        username: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    }
}

export const loginValidation = {
    body: {
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    }
}

export const verifyValidation = {
    query: {
        verifyToken: Joi.string().required()
    }
}