import * as Joi from 'joi';

export const createCourseValidation = {
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
    }
}

export const enrollInCourseValidation = {
    body: {
        courseId: Joi.number().required(),
        userId: Joi.number().required()
    }
}