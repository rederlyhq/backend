import * as Joi from '@hapi/joi';

export const createCourseValidation = {
    params: {},
    query: {
        useCurriculum: Joi.boolean().optional().default(false)
    },
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
};

export const createQuestionsForTopicFromDefFileValidation = {
    params: {},
    query: {
        courseTopicId: Joi.number().required()
    },
    body: {}
};

export const createCourseUnitValidation = {
    params: {},
    body: {
        name: Joi.string().optional(),
        courseId: Joi.number().required(),
        contentOrder: Joi.number().optional(),
        // Deletes are one directional and soft
        // active: Joi.boolean().optional().default(true),
    },
    query: {}
};

export const createCourseTopicValidation = {
    params: {},
    body: {
        courseUnitContentId: Joi.number().required(),
        // TODO - I don't think this should be allowed
        curriculumTopicContentId: Joi.number().optional(),
        // Default to `Topic #n`
        name: Joi.string().optional(),
        // TODO use enum
        topicTypeId: Joi.number().optional().default(1),
        // Default to course end date
        startDate: Joi.date().optional(),
        // Default to course end date
        endDate: Joi.date().optional(),
        // Default to course end date
        deadDate: Joi.date().optional(),
        partialExtend: Joi.boolean().optional().default(false),
        // Default to next in line
        contentOrder: Joi.number().optional(),
        // Deletes are one directional and soft
        // active: Joi.boolean().optional().default(true),
    },
    query: {}
};

export const updateCourseTopicValidation = {
    params: {
        id: Joi.number().required()
    },
    body: {
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        deadDate: Joi.date().optional(),
        name: Joi.string().optional(),
        partialExtend: Joi.boolean().optional(),
        contentOrder: Joi.number().optional(),
        courseUnitContentId: Joi.number().optional(),
        topicTypeId: Joi.number().optional(),
        // Deletes cannot be undone, use delete endpoint
        // active: Joi.boolean().optional(),
        // Cannot change which curriculum topic it was created from
        // curriculumTopicContentId: Joi.number().optional(),
    },
    query: {},
};

export const deleteCourseUnitValidation = {
    params: {
        id: Joi.number().required()
    },
    body: {},
    query: {},
};

export const deleteCourseTopicValidation = {
    params: {
        id: Joi.number().required()
    },
    body: {},
    query: {},
};

export const deleteCourseQuestionValidation = {
    params: {
        id: Joi.number().required()
    },
    body: {},
    query: {},
};

export const updateCourseUnitValidation = {
    params: {
        id: Joi.number().required()
    },
    body: {
        name: Joi.string().optional(),
        contentOrder: Joi.number().optional(),
        // Deletes are soft and one directional
        // active: Joi.boolean().optional(),
        // Cannot move to another course
        // courseId: Joi.number().optional(),
        // Cannot change which curriculum unit it was created from
        // curriculumUnitId: Joi.number().optional(),
    },
    query: {},
};

export const updateCourseValidation = {
    params: {
        id: Joi.number().required()
    },
    body: {
        name: Joi.string().optional(),
        code: Joi.string().optional(),
        start: Joi.date().optional(),
        end: Joi.date().optional(),
        sectionCode: Joi.string().optional(),
        semesterCode: Joi.string().optional(),
        textbooks: Joi.string().optional(),
        // Cannot change curriculum it was created from
        // curriculumId: Joi.number().optional(),
        // Cannot change which instructor owns the course
        // instructorId: Joi.number().optional(),
        // cannot change university ownership
        // universityId: Joi.number().optional(),
    },
    query: {},
};

export const updateCourseTopicQuestionValidation = {
    params: {
        id: Joi.number().required()
    },
    body: {
        problemNumber: Joi.number().optional(),
        webworkQuestionPath: Joi.string().optional(),
        weight: Joi.number().optional(),
        maxAttempts: Joi.number().optional(),
        hidden: Joi.boolean().optional(),
        optional: Joi.boolean().optional(),
        // Deletes are one directional and soft
        // active: Joi.boolean().optional(),
        // You cannot change the curriculum question in which this was derived
        // curriculumQuestionId: Joi.number().optional(),
        // Right now we don't support moving from one topic to another
        // courseTopicContentId: Joi.number().optional(),
    },
    query: {},
};

export const createCourseTopicQuestionValidation = {
    params: {},
    body: {
        // Can be defined in business logic
        problemNumber: Joi.number().optional(),
        webworkQuestionPath: Joi.string().optional().default('private/templates/barebones.pg'),
        courseTopicContentId: Joi.number().required(),
        weight: Joi.number().optional().default(1),
        maxAttempts: Joi.number().optional().default(-1),
        hidden: Joi.boolean().optional().default(false),
        optional: Joi.boolean().optional().default(false),
        // Deletes are one directional and soft
        // active: Joi.boolean().optional().default(true)
    },
    query: {}
};

export const getQuestionValidation = {
    params: {
        id: Joi.number().required()
    },
    query: {
        workbookId: Joi.number().optional(),
        readonly: Joi.boolean().optional()
    },
    body: {}
};

export const getQuestionsValidation = {
    params: {},
    query: {
        userId: Joi.alternatives().try(Joi.string().valid('me').optional(), Joi.number().optional()).optional(),
        courseTopicContentId: Joi.number().optional()
    },
    body: {}
};


export const getCourseValidation = {
    params: {
        id: Joi.number().required(),
    },
    body: {},
    query: {}
};

export const getTopicsValidation = {
    params: {},
    query: {
        courseId: Joi.number().optional(),
        isOpen: Joi.boolean().optional()
    },
    body: {},
};

export const enrollInCourseValidation = {
    params: {},
    query: {},
    body: {
        courseId: Joi.number().required(),
        userId: Joi.number().required()
    }
};

export const enrollInCourseByCodeValidation = {
    params: {
        code: Joi.string().required()
    },
    query: {},
    body: {}
};

export const listCoursesValidation = {
    params: {},
    query: {
        instructorId: Joi.number().optional(),
        enrolledUserId: Joi.number().optional(),
    },
    body: {},
};

export const getGradesValidation = {
    params: {},
    query: {
        courseId: Joi.number().optional(),
        unitId: Joi.number().optional(),
        topicId: Joi.number().optional(),
        questionId: Joi.number().optional(),
        userId: Joi.number().optional(),
    },
    body: {},
};

export const getStatisticsOnUnitsValidation = {
    params: {},
    query: {
        courseId: Joi.number().optional(),
        userId: Joi.number().optional(),
    },
    body: {},
};

export const getStatisticsOnTopicsValidation = {
    params: {},
    query: {
        courseUnitContentId: Joi.number().optional(),
        courseId: Joi.number().optional(),
        userId: Joi.number().optional(),
    },
    body: {},
};

export const getStatisticsOnQuestionsValidation = {
    params: {},
    query: {
        courseTopicContentId: Joi.number().optional(),
        courseId: Joi.number().optional(),
        userId: Joi.number().optional(),
    },
    body: {},
};

export const getProblemsValidation = {
    params: {},
    query: {
        courseTopicContentId: Joi.number().optional(),
        userId: Joi.number().optional(),
    },
    body: {},
};
