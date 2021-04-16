import * as express from 'express';
import courseController from '../course-controller';
import { authenticationMiddleware } from '../../../middleware/auth';
import httpResponse from '../../../utilities/http-response';
import * as _ from 'lodash';
import { validationMiddleware } from '../../../middleware/validation-middleware';
import { DeepAddIndexSignature } from '../../../extensions/typescript-utility-extensions';
import { Constants } from '../../../constants';
import ForbiddenError from '../../../exceptions/forbidden-error';
import { CourseWWTopicQuestionInterface } from '../../../database/models/course-ww-topic-question';
import { CourseTopicContentInterface } from '../../../database/models/course-topic-content';
import IllegalArgumentException from '../../../exceptions/illegal-argument-exception';
import { StudentTopicAssessmentInfoInterface } from '../../../database/models/student-topic-assessment-info';
import AttemptsExceededException from '../../../exceptions/attempts-exceeded-exception';
import logger from '../../../utilities/logger';
import { asyncHandler } from '../../../extensions/rederly-express-request';

export const router = express.Router();

import { coursesGetGradeById } from '@rederly/backend-validation';
router.get('/assessment/topic/grade/:id',
    authenticationMiddleware,
    validationMiddleware(coursesGetGradeById),
    asyncHandler<coursesGetGradeById.IParams, coursesGetGradeById.IResponse, coursesGetGradeById.IBody, coursesGetGradeById.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();
        if (await courseController.canUserGradeAssessment({user, topicId: req.params.id}) === false) {
            throw new ForbiddenError('You are not allowed to grade this assessment.');
        }

        const {problems, topic} = await courseController.getAssessmentForGrading({topicId: req.params.id});
        const resp = httpResponse.Ok('Fetched problems + workbooks successfully', {
            problems: problems.map(problem => problem.get({plain: true}) as CourseWWTopicQuestionInterface),
            topic: topic.get({plain: true}) as CourseTopicContentInterface
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesGetEndById } from '@rederly/backend-validation';
router.get('/assessment/topic/end/:id',
    authenticationMiddleware,
    validationMiddleware(coursesGetEndById),
    asyncHandler<coursesGetEndById.IParams, coursesGetEndById.IResponse, coursesGetEndById.IBody, coursesGetEndById.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const user = req.rederlyUser ?? await req.session.getUser();
        const version = await courseController.getStudentTopicAssessmentInfoById(req.params.id);

        if (version.userId !== user.id) {
            throw new ForbiddenError('You may not end an exam that does not belong to you.');
        }

        if (version.numAttempts === 0) {
            throw new ForbiddenError('You cannot end an exam without making at least one attempt.');
        }

        await courseController.endAssessmentEarly(version, true);

        const resp = httpResponse.Ok('Assessment version has been closed.', null);
        next(resp);
    }));

import { coursesGetStart } from '@rederly/backend-validation';
router.get('/assessment/topic/:id/start',
    authenticationMiddleware,
    validationMiddleware(coursesGetStart),
    asyncHandler<coursesGetStart.IParams, coursesGetStart.IResponse, coursesGetStart.IBody, coursesGetStart.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const user = req.rederlyUser ?? await req.session.getUser();
        const rederlyUserRole = req.rederlyUserRole ?? user.roleId;

        // function returns boolean and IF the user is not allowed to start a new version, a reason is included
        const { userCanStartNewVersion, message, data } = await courseController.canUserStartNewVersion({ user, topicId: req.params.id, role: rederlyUserRole });

        // will never have true + message
        if (userCanStartNewVersion === false && !_.isNil(message)) {
            throw new IllegalArgumentException(message, data);
        }

        const versionInfo = await courseController.createGradeInstancesForAssessment({
            topicId: req.params.id,
            userId: user.id,
            requestURL: req.headers['rederly-origin'] as string | undefined // need this because it incorrectly thinks it can be an array
        });

        const resp = httpResponse.Ok('New version of this assessment created successfully', versionInfo.get({plain: true}) as StudentTopicAssessmentInfoInterface);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

    import { coursesPostAuto } from '@rederly/backend-validation';
    router.post('/assessment/topic/:id/submit/:version/auto',
        validationMiddleware(coursesPostAuto),
        asyncHandler<coursesPostAuto.IParams, coursesPostAuto.IResponse, coursesPostAuto.IBody, coursesPostAuto.IQuery>(async (req, _res, next) => {
            try {
                const assessmentResult = await courseController.submitAssessmentAnswers(req.params.version, true); // false: wasAutoSubmitted
                const resp = httpResponse.Ok('Assessment submitted successfully', assessmentResult);
                next(resp as DeepAddIndexSignature<typeof resp>);
            } catch (e) {
                if (e instanceof AttemptsExceededException) {
                    logger.warn('This assessment version has no attempts remaining but was auto submitted.', JSON.stringify({
                        assessmentVersionId: req.params.version,
                        topicId: req.params.id
                    }));
                    const resp = httpResponse.Ok('Attempts exceeded skipping auto submit', null);
                    next(resp as DeepAddIndexSignature<typeof resp>);    
                } else {
                    logger.error('Auto submit ran into uncaught error', e);
                    throw e;
                }
            }
        }));

import { coursesPostSubmitByVersion } from '@rederly/backend-validation';
router.post('/assessment/topic/:id/submit/:version',
    authenticationMiddleware,
    validationMiddleware(coursesPostSubmitByVersion),
    asyncHandler<coursesPostSubmitByVersion.IParams, coursesPostSubmitByVersion.IResponse, coursesPostSubmitByVersion.IBody, coursesPostSubmitByVersion.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();


        const studentTopicAssessmentInfo = await courseController.getStudentTopicAssessmentInfoById(req.params.version);
        if (user.id != studentTopicAssessmentInfo.userId) {
            throw new Error('You cannot submit an assessment that does not belong to you.');
        }

        if (studentTopicAssessmentInfo.maxAttempts > 0 && studentTopicAssessmentInfo.numAttempts >= studentTopicAssessmentInfo.maxAttempts) {
            throw new IllegalArgumentException('This assessment version has no attempts remaining.');
        }

        const assessmentResult = await courseController.submitAssessmentAnswers(req.params.version, false); // false: wasAutoSubmitted
        const resp = httpResponse.Ok('Assessment submitted successfully', assessmentResult);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));
