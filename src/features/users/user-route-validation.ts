import * as Joi from '@hapi/joi';
import IncludeGradeOptions from './include-grade-options';

export const forgotPasswordValidation = {
    params: {},
    query: {},
    body: {
        email: Joi.string().email().required(),
    },
};

export const updatePasswordValidation = {
    params: {},
    query: {},
    body: {
        newPassword: Joi.string().required(),
        forgotPasswordToken: Joi.string().optional(),
        oldPassword: Joi.string().optional(),
        email: Joi.string().email().optional(),
        id: Joi.number().optional(),
    },
};

export const registerValidation = {
    params: {},
    query: {},
    body: {
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    },
};

export const loginValidation = {
    params: {},
    query: {},
    body: {
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    },
};

export const verifyValidation = {
    params: {},
    query: {
        verifyToken: Joi.string().required()
    },
    body: {}
};

export const logoutValidation = {
    params: {},
    query: {},
    body: {}
};

export const listUsersValidation = {
    params: {},
    query: {
        userIds: Joi.alternatives().try(Joi.array().items(Joi.number()), Joi.number()).optional(),
        courseId: Joi.number().optional(),
        includeGrades: Joi.string().valid(Object.keys(IncludeGradeOptions)).optional(),
    },
    body: {},
};

export const getUserValidation = {
    params: {
        id: Joi.number().required()
    },
    query: {
        courseId: Joi.number().optional(),
        includeGrades: Joi.string().valid(Object.keys(IncludeGradeOptions)).optional(),
    },
    body: {},
};

export const emailUsersValidation = {
    params: {},
    query: {},
    body: {
        userIds: Joi.array().items(Joi.number()).required(),
        subject: Joi.string().required(),
        content: Joi.string().required(),
    },
};
