import * as Joi from '@hapi/joi';

export const createCourseValidation = {
    params: {},
    query: {},
    body: {
        curriculumId: Joi.number().optional(),
        name: Joi.string().required(),
        code: Joi.string().required(),
        start: Joi.date().required(),
        end: Joi.date().required(),
        sectionCode: Joi.string().required(),
        semesterCode: Joi.string().required(),
        textbooks: Joi.string().required()
        // universityId is assumed
        // userId is assumed
    }
}

export const createCourseUnitValidation = {
    params: {},
    body: {
        name: Joi.string().required(),
        active: Joi.boolean().optional().default(true),
        courseId: Joi.number().required(),
        contentOrder: Joi.number().required(),
    },
    query: {}
}

export const createCourseTopicValidation = {
    params: {},
    body: {
        courseUnitContentId: Joi.number().required(),
        curriculumTopicContentId: Joi.number().optional(),
        name: Joi.string().required(),
        active: Joi.boolean().optional().default(true),
        topicTypeId: Joi.number().optional().default(1),
        startDate: Joi.date().required(),
        endDate: Joi.date().required(),
        deadDate: Joi.date().required(),
        partialExtend: Joi.boolean().required(),
        contentOrder: Joi.number().required(),
    },
    query: {}
}

export const updateCourseTopicValidation = {
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
        contentOrder: Joi.number().optional(),
        // TODO do we support moving topics or changing their type?
        // Omitting foreign key support
        // curriculumTopicContentId: Joi.number().optional(),
        // courseUnitContentId: Joi.number().optional(),
        // topicTypeId: Joi.number().optional(),
    },
    query: {},
}

export const updateCourseUnitValidation = {
    params: {
        id: Joi.number().required()
    },
    body: {
        name: Joi.string().optional(),
        active: Joi.boolean().optional(),
        contentOrder: Joi.number().optional(),
        // courseId: Joi.number().optional(),
    },
    query: {},
}

export const createCourseTopicQuestionValidation = {
    params: {},
    body: {
        problemNumber: Joi.number().required(),
        webworkQuestionPath: Joi.string().required(),
        courseTopicContentId: Joi.number().required(),
        weight: Joi.number().required(),
        maxAttempts: Joi.number().required(),
        hidden: Joi.boolean().required(),
        optional: Joi.boolean().required(),
        active: Joi.boolean().optional().default(true)
    },
    query: {}
}

export const getQuestionValidation = {
    params: {
        id: Joi.number().required()
    },
    query: {},
    body: {}
}

export const getQuestionsValidation = {
    params: {},
    query: {
        userId: Joi.alternatives().try(Joi.string().valid('me').optional(), Joi.number().optional()).optional(),
        courseTopicContentId: Joi.number().optional()
    },
    body: {}
}


export const getCourseValidation = {
    params: {
        id: Joi.number().required(),
        query: {},
        body: {},
    },
    body: {},
    query: {}
}

export const getTopicsValidation = {
    params: {},
    query: {
        courseId: Joi.number().optional(),
        isOpen: Joi.boolean().optional()
    },
    body: {},
}

export const enrollInCourseValidation = {
    params: {},
    query: {},
    body: {
        courseId: Joi.number().required(),
        userId: Joi.number().required()
    }
}

export const enrollInCourseByCodeValidation = {
    params: {
        code: Joi.string().required()
    },
    query: {},
    body: {}
}

export const listCoursesValidation = {
    params: {},
    query: {
        instructorId: Joi.number().optional(),
        enrolledUserId: Joi.number().optional(),
    },
    body: {},
}

export const getGradesValidation = {
    params: {},
    query: {
        courseId: Joi.number().optional(),
        unitId: Joi.number().optional(),
        topicId: Joi.number().optional(),
        questionId: Joi.number().optional(),
    },
    body: {},
}

export const getStatisticsOnUnitsValidation = {
    params: {},
    query: {
        courseId: Joi.number().optional(),
    },
    body: {},
}

export const getStatisticsOnTopicsValidation = {
    params: {},
    query: {
        courseUnitContentId: Joi.number().optional(),
        courseId: Joi.number().optional(),
    },
    body: {},
}

export const getStatisticsOnQuestionsValidation = {
    params: {},
    query: {
        courseTopicContentId: Joi.number().optional(),
        courseId: Joi.number().optional(),
    },
    body: {},
}

export const getProblemsValidation = {
    params: {},
    query: {
        courseTopicContentId: Joi.number().optional(),
        userId: Joi.number().optional(),
    },
    body: {},
}
