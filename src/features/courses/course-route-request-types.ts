
/**
 * THIS FILE IS AUTO GENERATED
 * DO NOT MODIFY!!!
 * TO UPDATE THIS FILE CHANGE THE SCHEMES IN THE `-route-validation.ts` FILES
 * THEN RUN `npm run generate-route-types`
 */

import * as Joi from '@hapi/joi';
import 'joi-extract-type'
import * as validations from './course-route-validation'

namespace CreateCourseRequest {
    export type params = Joi.extractType<typeof validations.createCourseValidation.params>;
    export type query = Joi.extractType<typeof validations.createCourseValidation.query>;
    export type body = Joi.extractType<typeof validations.createCourseValidation.body>;
};

namespace CreateCourseUnitRequest {
    export type params = Joi.extractType<typeof validations.createCourseUnitValidation.params>;
    export type query = Joi.extractType<typeof validations.createCourseUnitValidation.query>;
    export type body = Joi.extractType<typeof validations.createCourseUnitValidation.body>;
};

namespace CreateCourseTopicRequest {
    export type params = Joi.extractType<typeof validations.createCourseTopicValidation.params>;
    export type query = Joi.extractType<typeof validations.createCourseTopicValidation.query>;
    export type body = Joi.extractType<typeof validations.createCourseTopicValidation.body>;
};

namespace UpdateCourseTopicRequest {
    export type params = Joi.extractType<typeof validations.updateCourseTopicValidation.params>;
    export type query = Joi.extractType<typeof validations.updateCourseTopicValidation.query>;
    export type body = Joi.extractType<typeof validations.updateCourseTopicValidation.body>;
};

namespace UpdateCourseUnitRequest {
    export type params = Joi.extractType<typeof validations.updateCourseUnitValidation.params>;
    export type query = Joi.extractType<typeof validations.updateCourseUnitValidation.query>;
    export type body = Joi.extractType<typeof validations.updateCourseUnitValidation.body>;
};

namespace CreateCourseTopicQuestionRequest {
    export type params = Joi.extractType<typeof validations.createCourseTopicQuestionValidation.params>;
    export type query = Joi.extractType<typeof validations.createCourseTopicQuestionValidation.query>;
    export type body = Joi.extractType<typeof validations.createCourseTopicQuestionValidation.body>;
};

namespace GetQuestionRequest {
    export type params = Joi.extractType<typeof validations.getQuestionValidation.params>;
    export type query = Joi.extractType<typeof validations.getQuestionValidation.query>;
    export type body = Joi.extractType<typeof validations.getQuestionValidation.body>;
};

namespace GetQuestionsRequest {
    export type params = Joi.extractType<typeof validations.getQuestionsValidation.params>;
    export type query = Joi.extractType<typeof validations.getQuestionsValidation.query>;
    export type body = Joi.extractType<typeof validations.getQuestionsValidation.body>;
};

namespace GetCourseRequest {
    export type params = Joi.extractType<typeof validations.getCourseValidation.params>;
    export type query = Joi.extractType<typeof validations.getCourseValidation.query>;
    export type body = Joi.extractType<typeof validations.getCourseValidation.body>;
};

namespace GetTopicsRequest {
    export type params = Joi.extractType<typeof validations.getTopicsValidation.params>;
    export type query = Joi.extractType<typeof validations.getTopicsValidation.query>;
    export type body = Joi.extractType<typeof validations.getTopicsValidation.body>;
};

namespace EnrollInCourseRequest {
    export type params = Joi.extractType<typeof validations.enrollInCourseValidation.params>;
    export type query = Joi.extractType<typeof validations.enrollInCourseValidation.query>;
    export type body = Joi.extractType<typeof validations.enrollInCourseValidation.body>;
};

namespace ListCoursesRequest {
    export type params = Joi.extractType<typeof validations.listCoursesValidation.params>;
    export type query = Joi.extractType<typeof validations.listCoursesValidation.query>;
    export type body = Joi.extractType<typeof validations.listCoursesValidation.body>;
};

namespace GetGradesRequest {
    export type params = Joi.extractType<typeof validations.getGrades.params>;
    export type query = Joi.extractType<typeof validations.getGrades.query>;
    export type body = Joi.extractType<typeof validations.getGrades.body>;
};

namespace GetStatisticsOnUnitsRequest {
    export type params = Joi.extractType<typeof validations.getStatisticsOnUnitsValidation.params>;
    export type query = Joi.extractType<typeof validations.getStatisticsOnUnitsValidation.query>;
    export type body = Joi.extractType<typeof validations.getStatisticsOnUnitsValidation.body>;
};

namespace GetStatisticsOnTopicsRequest {
    export type params = Joi.extractType<typeof validations.getStatisticsOnTopicsValidation.params>;
    export type query = Joi.extractType<typeof validations.getStatisticsOnTopicsValidation.query>;
    export type body = Joi.extractType<typeof validations.getStatisticsOnTopicsValidation.body>;
};

namespace GetStatisticsOnQuestionsRequest {
    export type params = Joi.extractType<typeof validations.getStatisticsOnQuestionsValidation.params>;
    export type query = Joi.extractType<typeof validations.getStatisticsOnQuestionsValidation.query>;
    export type body = Joi.extractType<typeof validations.getStatisticsOnQuestionsValidation.body>;
};

namespace GetProblemsRequest {
    export type params = Joi.extractType<typeof validations.getProblems.params>;
    export type query = Joi.extractType<typeof validations.getProblems.query>;
    export type body = Joi.extractType<typeof validations.getProblems.body>;
};
