import * as Joi from 'joi';
import { ValidationObject } from '../../generic-interfaces/validation-object';

export const createCourseValidation: ValidationObject = {
    params: {},
    query: {},
    body: {
        curriculumId: Joi.number().required(),
        name: Joi.string().required(),
        code: Joi.string().required(),
        start: Joi.date().required(),
        end: Joi.date().required(),
        sectionCode: Joi.string().required(),
        semesterCode: Joi.string().required()
    }
}

export const getCourseValidation = {
    params: {
        id: Joi.number().required(),
        query: {},
        body: {},
    }
}

export const enrollInCourseValidation = {
    params: {},
    query: {},
    body: {
        courseId: Joi.number().required(),
        userId: Joi.number().required()
    }
}

export const listCoursesValidation = {
    params: {},
    query: {
        instructorId: Joi.string().optional()
    },
    body: {},
}