import * as express from 'express';
import courseController from '../course-controller';
import { authenticationMiddleware } from '../../../middleware/auth';
import httpResponse from '../../../utilities/http-response';
import * as _ from 'lodash';
import { Constants } from '../../../constants';
import { CourseTopicContentInterface } from '../../../database/models/course-topic-content';
import { validationMiddleware } from '../../../middleware/validation-middleware';
import { DeepAddIndexSignature } from '../../../extensions/typescript-utility-extensions';
import { CourseUnitContentInterface } from '../../../database/models/course-unit-content';
import { CourseWWTopicQuestionInterface } from '../../../database/models/course-ww-topic-question';
import { CourseInterface } from '../../../database/models/course';
import { asyncHandler } from '../../../extensions/rederly-express-request';
import { CourseQuestionAssessmentInfoInterface } from '../../../database/models/course-question-assessment-info';

export const router = express.Router();


import { coursesGetCourseList } from '@rederly/backend-validation';
router.get('/browse-problems/course-list',
    authenticationMiddleware,
    validationMiddleware(coursesGetCourseList),
    asyncHandler<coursesGetCourseList.IParams, coursesGetCourseList.IResponse, coursesGetCourseList.IBody, coursesGetCourseList.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const instructorId = req.query.instructorId === 'me' ? req.session.userId : req.query.instructorId;
        try {
            const courses = await courseController.browseProblemsCourseList({
                filter: {
                    instructorId: instructorId,
                }
            });
            const resp = httpResponse.Ok('Fetched successfully', {
                courses: courses.map(course => course.get({plain: true}) as CourseInterface)
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { coursesGetUnitList } from '@rederly/backend-validation';
router.get('/browse-problems/unit-list',
    authenticationMiddleware,
    validationMiddleware(coursesGetUnitList),
    asyncHandler<coursesGetUnitList.IParams, coursesGetUnitList.IResponse, coursesGetUnitList.IBody, coursesGetUnitList.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        try {
            const units = await courseController.browseProblemsUnitList({
                filter: {
                    courseId: req.query.courseId,
                }
            });
            const resp = httpResponse.Ok('Fetched successfully', {
                units: units.map(unit => unit.get({plain: true}) as CourseUnitContentInterface)
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { coursesGetTopicList } from '@rederly/backend-validation';
router.get('/browse-problems/topic-list',
    authenticationMiddleware,
    validationMiddleware(coursesGetTopicList),
    asyncHandler<coursesGetTopicList.IParams, coursesGetTopicList.IResponse, coursesGetTopicList.IBody, coursesGetTopicList.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        try {
            const topics = await courseController.browseProblemsTopicList({
                filter: {
                    unitId: req.query.unitId,
                }
            });
            const resp = httpResponse.Ok('Fetched successfully', {
                topics: topics.map(topic => topic.get({plain: true}) as CourseTopicContentInterface)
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { coursesGetSearch } from '@rederly/backend-validation';
router.get('/browse-problems/search',
    authenticationMiddleware,
    validationMiddleware(coursesGetSearch),
    asyncHandler<coursesGetSearch.IParams, coursesGetSearch.IResponse, coursesGetSearch.IBody, coursesGetSearch.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const instructorId = req.query.instructorId === 'me' ? req.session.userId : req.query.instructorId;
        try {
            const problems = await courseController.browseProblemsSearch({
                filter: {
                    instructorId: instructorId,
                    courseId: req.query.courseId,
                    unitId: req.query.unitId,
                    topicId: req.query.topicId,
                }
            });
            const resp = httpResponse.Ok('Fetched successfully', {
                problems: problems.map(problem => problem.get({plain: true}) as Omit<CourseWWTopicQuestionInterface, 'courseQuestionAssessmentInfo' | 'topic'> & { 
                    courseQuestionAssessmentInfo: CourseQuestionAssessmentInfoInterface;
                    topic: Omit<CourseTopicContentInterface, 'unit'> & { 
                        courseQuestionAssessmentInfo: CourseQuestionAssessmentInfoInterface;
                        unit: Omit<CourseUnitContentInterface, 'course'> & {
                            course: CourseInterface;
                        };
                    };
                })
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));
