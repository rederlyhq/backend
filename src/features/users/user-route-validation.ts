import * as Joi from '@hapi/joi';
import IncludeGradeOptions from './include-grade-options';
import { Constants } from '../../constants';

export const impersonateValidation = {
    params: {},
    query: {},
    body: {
        role: Joi.string().allow(null).optional(),
    },
};

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
        newPassword: Joi.string().min(Constants.Application.MIN_PASSWORD_LENGTH).max(Constants.Application.MAX_PASSWORD_LENGTH).required(),
        oldPassword: Joi.string().required(),
    },
};

export const updateForgottonPasswordValidation = {
    params: {},
    query: {},
    body: {
        newPassword: Joi.string().min(Constants.Application.MIN_PASSWORD_LENGTH).max(Constants.Application.MAX_PASSWORD_LENGTH).required(),
        forgotPasswordToken: Joi.string().required(),
        email: Joi.string().email().required(),
    },
};

export const registerValidation = {
    params: {},
    query: {},
    body: {
        firstName: Joi.string().trim().required(),
        lastName: Joi.string().trim().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(Constants.Application.MIN_PASSWORD_LENGTH).max(Constants.Application.MAX_PASSWORD_LENGTH).required(),
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
        verifyToken: Joi.string().required(),
        confirmEmail: Joi.string().required(),
    },
    body: {}
};

export const resendVerificationValidation = {
    params: {},
    query: {},
    body: {
        email: Joi.string().email().required()
    }
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

export const userStatusValidation = {
    params: {},
    query: {},
    body: {},
};

export const setPaidUntilValidation = {
    params: {},
    query: {},
    body: {
        email: Joi.string().email().required(),
        paidUntil: Joi.date().required(),
    },
};

export const forceVerifyValidation = {
    params: {},
    query: {},
    body: {
        email: Joi.string().email().required(),
    },
};
