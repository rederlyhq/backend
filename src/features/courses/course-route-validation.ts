// Allowing camel case for db fields
/* eslint-disable @typescript-eslint/camelcase */
import * as Joi from 'joi';

export const createCourseValidation = {
    body: {
        curriculum_id: Joi.number().required(),
        instructor_id: Joi.number().required(),
        university_id: Joi.number().required(),
        course_name: Joi.string().required(),
        course_code: Joi.string().required(),
        course_start: Joi.date().required(),
        course_end: Joi.date().required(),
        section_code: Joi.string().required(),
        semester_code: Joi.string().required()
    }
}

export const getCourseValidation = {
    params: {
        id: Joi.number().required(),
    }
}