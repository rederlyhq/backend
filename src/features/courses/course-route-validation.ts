import * as Joi from '@hapi/joi';
import { AttachmentType } from '../../utilities/attachments-helper';
import { getEnumValues } from '../../utilities/utilities';

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

export const postImportCourseArchiveValidation = {
    params: {
        courseId: Joi.number().required()
    },
    query: {
        keepBucketsAsTopics: Joi.boolean().optional().default(true)
    },
    body: {}
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
        // Defaults to null
        description: Joi.object().optional().allow(null),
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
        description: Joi.object().optional().allow(null),
        // Deletes cannot be undone, use delete endpoint
        // active: Joi.boolean().optional(),
        // Cannot change which curriculum topic it was created from
        // curriculumTopicContentId: Joi.number().optional(),

        // The following fields are only found on exams.
        topicAssessmentInfo: Joi.object({
            duration: Joi.number().optional().min(2),
            maxGradedAttemptsPerVersion: Joi.number().optional().min(-1),
            maxVersions: Joi.number().optional().min(-1),
            versionDelay: Joi.number().optional().min(0),
            hardCutoff: Joi.boolean().optional(),
            hideHints: Joi.boolean().optional(),
            showItemizedResults: Joi.boolean().optional(),
            showTotalGradeImmediately: Joi.boolean().optional(),
            hideProblemsAfterFinish: Joi.boolean().optional(),
            randomizeOrder: Joi.boolean().optional(),
        }).optional()
    },
    query: {},
};

export const extendCourseTopicForUserValidation = {
    params: {},
    body: {
        extensions: Joi.object({
            startDate: Joi.date().optional(),
            endDate: Joi.date().optional(),
            deadDate: Joi.date().optional()    
        }).optional(),
        studentTopicAssessmentOverride: Joi.object({
            versionDelay: Joi.number(),
            duration: Joi.number(),
            maxVersions: Joi.number(),
            maxGradedAttemptsPerVersion: Joi.number(),
        }).optional()
    },
    query: {
        courseTopicContentId: Joi.number().required(),
        userId: Joi.number().required(),
        topicAssessmentInfoId: Joi.number().optional()
    },
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
        smaEnabled: Joi.boolean().optional(),
        // Deletes are one directional and soft
        // active: Joi.boolean().optional(),
        // You cannot change the curriculum question in which this was derived
        // curriculumQuestionId: Joi.number().optional(),
        // Right now we don't support moving from one topic to another
        // courseTopicContentId: Joi.number().optional(),

        courseQuestionAssessmentInfo: Joi.object({
            randomSeedSet: Joi.array().items(Joi.number().min(0)).optional(),
            additionalProblemPaths: Joi.array().items(Joi.string()).optional()
        }).optional(),
    },
    query: {},
};

export const updateGradeValidation = {
    params: {
        id: Joi.number().required()
    },
    body: {
        locked: Joi.boolean().optional(),
        effectiveScore: Joi.number().optional(),
        currentProblemState: Joi.any().optional()
        // Deletes are one directional and soft
        // active: Joi.boolean().optional(),
    },
    query: {},
};

export const updateGradeInstanceValidation = {
    params: {
        id: Joi.number().required()
    },
    body: {
        locked: Joi.boolean().optional(), // removable?
        currentProblemState: Joi.any().optional()
        // Deletes are one directional and soft
        // active: Joi.boolean().optional(),
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

export const extendCourseTopicQuestionValidation = {
    params: {
    },
    body: {
        maxAttempts: Joi.number().optional(),
        // weight: Joi.number().optional().default(1),
        // hidden: Joi.boolean().optional().default(false),
        // optional: Joi.boolean().optional().default(false),
    },
    query: {
        courseTopicQuestionId: Joi.number().required(),
        userId: Joi.number().required()
    },
};

export const getQuestionGradeValidation = {
    params: {
        id: Joi.number().required(),
    },
    query: {
        userId: Joi.alternatives(Joi.number(), Joi.string().valid('me')).required(),
        topicAssessmentInfoId: Joi.number().optional(),
        includeWorkbooks: Joi.boolean().optional(),
    },
    body: {}
};

export const getQuestionRawValidation = {
    params: {
        id: Joi.number().required(),
    },
    query: {
        userId: Joi.number().required(),
    },
    body: {}
};

export const getQuestionOpenLabValidation = {
    params: {
        id: Joi.number().required(),
    },
    query: {},
    body: {}
};

export const getQuestionShowMeAnotherValidation = {
    params: {
        id: Joi.number().required(),
    },
    query: {},
    body: {}
};

export const getQuestionValidation = {
    params: {
        id: Joi.number().required()
    },
    query: {
        workbookId: Joi.number().optional(),
        readonly: Joi.boolean().optional(),
        userId: Joi.number().optional(),
        studentTopicAssessmentInfoId: Joi.number().optional(),
        showCorrectAnswers: Joi.boolean().optional(),
    },
    body: {}
};

export const previewQuestionValidation = {
    params: {},
    query: {
        webworkQuestionPath: Joi.string().optional(),
        problemSeed: Joi.number().min(0).optional(),
        showAnswersUpfront: Joi.boolean().optional().default(false),
    },
    body: null,
};

export const getQuestionsValidation = {
    params: {},
    query: {
        userId: Joi.alternatives().try(Joi.string().valid('me').optional(), Joi.number().optional()).optional(),
        courseTopicContentId: Joi.number().optional(),
        studentTopicAssessmentInfoId: Joi.number().optional(),
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

export const getTopicValidation = {
    params: {
        id: Joi.number().required(),
    },
    query: {
        userId: Joi.number().optional(),
        includeQuestions: Joi.boolean().optional(),
        includeWorkbookCount: Joi.boolean().optional(),
    },
    body: {},
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
        // TODO figure out alternatives
        userId: Joi.number().optional(),
        studentEmail: Joi.string().email().optional(),
    }
};

export const enrollInCourseByCodeValidation = {
    params: {
        code: Joi.string().required()
    },
    query: {},
    body: {}
};

export const deleteEnrollmentValidation = {
    params: {},
    query: {},
    body: {
        courseId: Joi.number().required(),
        userId: Joi.number().required()
    }
};

export const listCoursesValidation = {
    params: {},
    query: {
        instructorId: Joi.number().optional(),
        enrolledUserId: Joi.number().optional(),
    },
    body: {},
};

export const browseProblemsCourseListValidation = {
    params: {},
    query: {
        instructorId: Joi.alternatives(Joi.number(), Joi.string().valid('me')).optional(),
    },
    body: {},
};

export const browseProblemsUnitListValidation = {
    params: {},
    query: {
        courseId: Joi.number().optional(),
    },
    body: {},
};

export const browseProblemsTopicListValidation = {
    params: {},
    query: {
        unitId: Joi.number().optional(),
    },
    body: {},
};

export const browseProblemsSearchValidation = {
    params: {},
    query: {
        instructorId: Joi.alternatives(Joi.number(), Joi.string().valid('me')).optional(),
        courseId: Joi.number().optional(),
        unitId: Joi.number().optional(),
        topicId: Joi.number().optional(),
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
        userId: Joi.alternatives(Joi.number(), Joi.string().valid('me')).optional(),
    },
    body: {},
};

export const getGradesForTopicsByCourseValidation = {
    params: {
        courseId: Joi.number().required(),
    },
    query: {},
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

export const createAssessmentVersionValidation = {
    params: {
        id: Joi.number().required(),
    },
    query: {},
    body: {},
};

export const endAssessmentVersionValidation = {
    params: {
        id: Joi.number().required(),
    },
    query: {},
    body: {},
};

export const submitAssessmentVersionValidation = {
    params: {
        id: Joi.number().required(),
        version: Joi.number().required(),
    },
    query: {},
    body: {},
};

export const gradeAssessmentValidation = {
    params: {
        id: Joi.number().required(),
    },
    query: {},
    body: {},
};

export const getAttachmentPresignedURLValidation = {
    params: {},
    query: {
        cacheBuster: Joi.any().optional(),
        type: Joi.string().valid(...getEnumValues(AttachmentType))
    },
    body: {},
};

export const postAttachmentValidation = {
    params: {},
    query: {},
    body: {
        attachment: Joi.object({
            cloudFilename: Joi.string().required(),
            userLocalFilename: Joi.string().required(),    
        }). required(),
        studentGradeId: Joi.number().optional(),
        studentGradeInstanceId: Joi.number().optional(),
        studentWorkbookId: Joi.number().optional(),
    },
};

export const listAttachmentsValidation = {
    params: {},
    query: {
        studentGradeId: Joi.number().optional(),
        studentGradeInstanceId: Joi.number().optional(),
        studentWorkbookId: Joi.number().optional(),
    },
    body: {},
};

export const deleteAttachmentValidation = {
    params: {
        id: Joi.number().required()
    },
    query: {},
    body: {},
};

export const emailProfValidation = {
    params: {
        id: Joi.number().required(),
    },
    query: {},
    body: {
        content: Joi.string().required(),
        question: Joi.object({
            id: Joi.number().required(),
        }).required(),
    },
};

export const readQuestionValidation = {
    params: {},
    query: {},
    body: {
        filePath: Joi.string().required(),
    },
};

export const saveQuestionValidation = {
    params: {},
    query: {},
    body: {
        problemSource: Joi.string().required(),
        relativePath: Joi.string().required(),
    },
};

export const uploadAssetValidation = {
    params: {},
    query: {},
    body: {
        relativePath: Joi.string().required(),
    },
};

export const catalogValidation = {
    params: {},
    query: {},
    body: {},
};

export const getVersionValidation = {
    params: {
        userId: Joi.number().required(),
        topicId: Joi.number().required(),
    },
    query: {},
    body: {},
};

export const bulkExportValidation = {
    params: {
        topicId: Joi.number().required(),
    },
    query: {
        showSolutions: Joi.boolean().optional().default(false),
        force: Joi.boolean().optional(),
    },
    body: {},
};

export const endBulkExportValidation = {
    params: {
        topicId: Joi.number().required(),
    },
    query: {},
    body: {
        exportUrl: Joi.string().optional(),
    },
};

export const postFeedbackValidation = {
    params: {
        workbookId: Joi.number().required(),
    },
    query: {
    },
    body: {
        content: Joi.object().optional().allow(null),
    },
};

export const postUploadWorkbookFeedbackValidation = {
    params: {
        workbookId: Joi.number().required(),
    },
    query: {},
    body: {
        attachment: Joi.object({
            cloudFilename: Joi.string().required(),
            userLocalFilename: Joi.string().required(),    
        }). required(),
    },
};

export const postUploadTopicFeedbackValidation = {
    params: {
        topicId: Joi.number().required(),
    },
    query: {},
    body: {
        attachment: Joi.object({
            cloudFilename: Joi.string().required(),
            userLocalFilename: Joi.string().required(),    
        }). required(),
        studentId: Joi.number().required(),
    },
};

export const postUploadTopicDescriptionValidation = {
    params: {
        topicId: Joi.number().required(),
    },
    query: {},
    body: {
        attachment: Joi.object({
            cloudFilename: Joi.string().required(),
            userLocalFilename: Joi.string().required(),    
        }). required(),
    },
};
