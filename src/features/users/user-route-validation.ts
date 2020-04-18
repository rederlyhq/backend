import * as Joi from 'joi';

export const registerValidation = {
    body: {
        username: Joi.string().required(),
        email: Joi.string().required(),
        password: Joi.string().required(),    
    }
}