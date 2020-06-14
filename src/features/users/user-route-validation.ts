import * as Joi from 'joi';
import { ValidationObject } from '../../generic-interfaces/validation-object';
import IncludeGradeOptions from './include-grade-options';

export const registerValidation: ValidationObject = {
    params: {},
    query: {},
    body: {
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    },
}

export const loginValidation: ValidationObject = {
    params: {},
    query: {},
    body: {
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    },
}

export const verifyValidation: ValidationObject = {
    params: {},
    query: {
        verifyToken: Joi.string().required()
    },
    body: {}
}

export const listUsers: ValidationObject = {
    params: {},
    query: {
        userIds: Joi.alternatives().try(Joi.array().items(Joi.number()), Joi.number()).optional(),
        courseId: Joi.number().optional(),
        includeGrades: Joi.string().valid(Object.keys(IncludeGradeOptions)).optional(),
    },
    body: {},
}

export const getUser: ValidationObject = {
    params: {
        id: Joi.number().required()
    },
    query: {
        courseId: Joi.number().optional(),
        includeGrades: Joi.string().valid(Object.keys(IncludeGradeOptions)).optional(),
    },
    body: {},
}

export const emailUsers: ValidationObject = {
    params: {},
    query: {},
    body: {
        userIds: Joi.array().items(Joi.number()).required(),
        subject: Joi.string().required(),
        content: Joi.string().required(),
    },
}