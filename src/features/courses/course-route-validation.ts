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
        // universityId is assumed
        // userId is assumed
    }
}

export const createCourseUnitValidation = {
    body: {
        name: Joi.string().required(),
        active: Joi.boolean().optional().default(true),
        courseId: Joi.number().required(),
    }
}

export const createCourseTopicValidation = {
    body: {
        courseUnitContentId: Joi.number().required(),
        curriculumTopicContentId: Joi.number().optional(),
        name: Joi.string().required(),
        active: Joi.boolean().optional().default(true),
        topicTypeId: Joi.number().optional().default(1),
        startDate: Joi.date().required(),
        endDate: Joi.date().required(),
        deadDate: Joi.date().required(),
        partialExtend: Joi.boolean().required()
    }
}

export const updateCourseTopicValidation: ValidationObject = {
    params: {
        id: Joi.number().required()
    },
    body: {
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        deadDate: Joi.date().optional(),
        name: Joi.string().optional(),
        active: Joi.boolean().optional(),
        partialExtend: Joi.boolean().optional(),
        // TODO do we support moving topics or changing their type?
        // Omitting foreign key support
        // curriculumTopicContentId: Joi.number().optional(),
        // courseUnitContentId: Joi.number().optional(),
        // topicTypeId: Joi.number().optional(),
      },
    query: {},
}

export const updateUnitTopicValidation: ValidationObject = {
    params: {
        id: Joi.number().required()
    },
    body: {
        name: Joi.string().optional(),
        active: Joi.boolean().optional(),
        // courseId: Joi.number().optional(),
      },
    query: {},
}

export const createCourseTopicQuestionValidation = {
    body: {
        problemNumber: Joi.number().required(),
        webworkQuestionPath: Joi.string().required(),
        courseTopicContentId: Joi.number().required(),
        weight: Joi.number().required(),
        maxAttempts: Joi.number().required(),
        hidden: Joi.boolean().required(),
        optional: Joi.boolean().required(),
        active: Joi.boolean().optional().default(true)
    }
}

export const getQuestionValidation: ValidationObject = {
    params: {
        id: Joi.number().required()
    },
    query: {},
    body: {}
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
        instructorId: Joi.string().optional(),
        enrolledUserId: Joi.string().optional(),
    },
    body: {},
}

export const getGrades = {
    params: {},
    query: {
        courseId: Joi.number().optional(),
        unitId: Joi.number().optional(),
        topicId: Joi.number().optional(),
        questionId: Joi.number().optional(),
    },
    body: {},
}