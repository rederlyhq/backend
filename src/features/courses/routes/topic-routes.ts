import * as express from 'express';
import courseController from '../course-controller';
import { authenticationMiddleware, paidMiddleware } from '../../../middleware/auth';
import httpResponse from '../../../utilities/http-response';
import { validationMiddleware } from '../../../middleware/validation-middleware';
import { DeepAddIndexSignature } from '../../../extensions/typescript-utility-extensions';
import { stripSequelizeFromUpdateResult, stripSequelizeFromUpsertResult } from '../../../generic-interfaces/sequelize-generic-interfaces';
import CourseTopicContent, { CourseTopicContentInterface } from '../../../database/models/course-topic-content';
import _ = require('lodash');
import NotFoundError from '../../../exceptions/not-found-error';
import logger from '../../../utilities/logger';
import { Constants } from '../../../constants';
import ExportPDFHelper from '../../../utilities/export-pdf-helper';
import { StudentTopicOverrideInterface } from '../../../database/models/student-topic-override';
import { TopicAssessmentInfoInterface } from '../../../database/models/topic-assessment-info';
import Role from '../../permissions/roles';
import { asyncHandler } from '../../../extensions/rederly-express-request';
import { StudentTopicAssessmentOverrideInterface } from '../../../database/models/student-topic-assessment-override';
import ForbiddenError from '../../../exceptions/forbidden-error';

export const router = express.Router();

import { courseTopicPostTopic } from '@rederly/backend-validation';
router.post('/topic',
    authenticationMiddleware,
    validationMiddleware(courseTopicPostTopic),
    paidMiddleware('Adding topics'),
    asyncHandler<courseTopicPostTopic.IParams, courseTopicPostTopic.IResponse, courseTopicPostTopic.IBody, courseTopicPostTopic.IQuery>(async (req, _res, next) => {
        const newTopic = await courseController.createTopic({
            ...req.body
        });

        const resp = httpResponse.Created('Course Topic created successfully', newTopic.get({plain: true}) as CourseTopicContentInterface);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

    import { courseTopicGetVersionByUserId } from '@rederly/backend-validation';
    router.get('/topic/:topicId/version/:userId',
        authenticationMiddleware,
        validationMiddleware(courseTopicGetVersionByUserId),
        asyncHandler<courseTopicGetVersionByUserId.IParams, courseTopicGetVersionByUserId.IResponse, courseTopicGetVersionByUserId.IBody, courseTopicGetVersionByUserId.IQuery>(async (req, _res, next) => {
            const result = await courseController.getAllContentForVersion({topicId: req.params.topicId, userId: req.params.userId});
            const resp = httpResponse.Ok('Fetched successfully', result);
            next(resp as DeepAddIndexSignature<typeof resp>);
        })
    );
    
    import { courseTopicPutEndExport } from '@rederly/backend-validation';
    router.put('/topic/:topicId/endExport', 
        // this call is expected from a microservice, so doesn't go through authentication
        validationMiddleware(courseTopicPutEndExport),
        asyncHandler<courseTopicPutEndExport.IParams, courseTopicPutEndExport.IResponse, courseTopicPutEndExport.IBody, courseTopicPutEndExport.IQuery>(async (req, _res, next) => {
            const topic = await CourseTopicContent.findOne({
                where: {
                    id: req.params.id,
                    active: true,
                },
            });
    
            if (_.isNil(topic)) {
                throw new NotFoundError('A endExport PUT was received for a non-existant topic. Was it deleted?');
            }
    
            if (_.isNil(req.body.exportUrl)) {
                logger.error('The Exporter failed to successfully export a topic.');
                topic.exportUrl = null;
                topic.lastExported = null;
            } else {
                topic.exportUrl = req.body.exportUrl;
            }
            await topic.save();
    
            const resp = httpResponse.Ok('Got it!', null);
            next(resp as DeepAddIndexSignature<typeof resp>);
        })
    );
    
    import { courseTopicPostStartExport } from '@rederly/backend-validation';
    router.post('/topic/:topicId/startExport',
        authenticationMiddleware,
        validationMiddleware(courseTopicPostStartExport),
        asyncHandler<courseTopicPostStartExport.IParams, courseTopicPostStartExport.IResponse, courseTopicPostStartExport.IBody, courseTopicPostStartExport.IQuery>(async (req, _res, next) => {
            if (_.isNil(req.session)) {
                throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
            }
            
            const professor = await req.session.getUser();
    
            const topic = await CourseTopicContent.findOne({
                where: {
                    id: req.params.id,
                    active: true,
                },
            });
    
            if (_.isNil(topic)) {
                throw new NotFoundError('No such topic was found.');
            }
    
            // Since this is a job, we'll always have this by here.
            const exportDetails = {lastExported: topic.lastExported, exportUrl: topic.exportUrl};
    
            const helper = new ExportPDFHelper();
    
            // If we're just checking, return what's already here.
            if (req.query.force === false) {
                next(httpResponse.Ok('Details', exportDetails));
            } else {
                helper.start({
                    topic, 
                    professorUUID: professor.uuid,
                    showSolutions: req.query.showSolutions ?? false,
                })
                .then(() => logger.info(`Finished uploading ${topic.id}.`))
                .catch((e) => {
                    logger.error('Failed to export', e);
                    topic.lastExported = null;
                    topic.save();
                });
                
                const resp = httpResponse.Ok('Loading', exportDetails);
                next(resp as DeepAddIndexSignature<typeof resp>);
            }
        })
    );
    
    import { courseTopicPutExtend } from '@rederly/backend-validation';
    router.put('/topic/extend',
        authenticationMiddleware,
        validationMiddleware(courseTopicPutExtend),
        paidMiddleware('Modifying topic settings'),
        asyncHandler<courseTopicPutExtend.IParams, courseTopicPutExtend.IResponse, courseTopicPutExtend.IBody, courseTopicPutExtend.IQuery>(
            async (req, _res, next) => {
                if (_.isNil(req.rederlyUser)) {
                    throw new ForbiddenError('You must be logged in to access grades.');
                }
        
                const updatesResult = await courseController.extendTopicForUser({
                    where: {
                        courseTopicContentId: req.query.courseTopicContentId,
                        userId: req.query.userId === 'me' ? req.rederlyUser.id : req.query.userId,
                    },
                    assessmentWhere: {
                        topicAssessmentInfoId: req.query.topicAssessmentInfoId
                    },
                    updates: req.body,
                });
                // TODO handle not found case
                const resp = httpResponse.Ok('Extended topic successfully', {
                    extendTopicResult: stripSequelizeFromUpsertResult<StudentTopicOverrideInterface>(updatesResult.extendTopicResult),
                    extendTopicAssessmentResult: stripSequelizeFromUpsertResult<StudentTopicAssessmentOverrideInterface & {
                        student_topic_assessment_override_max_graded_attempts_per_versi: number;
                    }>(updatesResult.extendTopicAssessmentResult)
                });
                next(resp as DeepAddIndexSignature<typeof resp>);
            }));
    
    import { courseTopicPutTopicById } from '@rederly/backend-validation';
    router.put('/topic/:id',
        authenticationMiddleware,
        validationMiddleware(courseTopicPutTopicById),
        paidMiddleware('Modifying topic settings'),
        asyncHandler<courseTopicPutTopicById.IParams, courseTopicPutTopicById.IResponse, courseTopicPutTopicById.IBody, courseTopicPutTopicById.IQuery>(async (req, _res, next) => {
            const updatesResult = await courseController.updateTopic({
                where: {
                    id: req.params.id
                },
                updates: {
                    ...req.body
                }
            });
            // TODO handle not found case
            const resp = httpResponse.Ok('Updated topic successfully', {
                updatedRecords: updatesResult.map(result => ({
                    ...result.get({ plain: true }) as CourseTopicContentInterface,
                    topicAssessmentInfo: result.topicAssessmentInfo as TopicAssessmentInfoInterface
                })),
                updatedCount: updatesResult.length
            });
            next(resp as DeepAddIndexSignature<typeof resp>);
        }));


        import { courseTopicDeleteTopicById } from '@rederly/backend-validation';
router.delete('/topic/:id',
    authenticationMiddleware,
    validationMiddleware(courseTopicDeleteTopicById),
    paidMiddleware('Deleting topics'),
    asyncHandler<courseTopicDeleteTopicById.IParams, courseTopicDeleteTopicById.IResponse, courseTopicDeleteTopicById.IBody, courseTopicDeleteTopicById.IQuery>(async (req, _res, next) => {
        try {
            const updatesResult = await courseController.softDeleteTopics({
                id: req.params.id
            });
            // TODO handle not found case
            const resp = httpResponse.Ok('Deleted topics and subobjects successfully', stripSequelizeFromUpdateResult<Omit<CourseTopicContentInterface, 'studentTopicOverride'> & {
                studentTopicOverride: StudentTopicOverrideInterface[];
            }>(updatesResult));
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));


    import { courseTopicGetTopicById } from '@rederly/backend-validation';
// This returns information about a specific topic. Currently, it only
// returns extension information if a specific user is passed.
router.get('/topic/:id',
    authenticationMiddleware,
    validationMiddleware(courseTopicGetTopicById),
    asyncHandler<courseTopicGetTopicById.IParams, courseTopicGetTopicById.IResponse, courseTopicGetTopicById.IBody, courseTopicGetTopicById.IQuery>(async (req, _res, next) => {
        const result = await courseController.getTopicById({
            id: req.params.id, 
            userId: req.query.userId, 
            includeQuestions: req.query.includeQuestions,
            includeWorkbookCount: req.query.includeWorkbookCount,
        });

        if (req.query.includeWorkbookCount) {
            result.calculateWorkbookCount();
        }

        const resp = httpResponse.Ok('Fetched successfully', result.get({plain: true}) as Omit<CourseTopicContentInterface, 'topicAssessmentInfo' | 'studentTopicOverride'> & {
            topicAssessmentInfo: TopicAssessmentInfoInterface | null;
            studentTopicOverride: StudentTopicOverrideInterface[];
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesGetTopics } from '@rederly/backend-validation';
router.get('/topics',
    authenticationMiddleware,
    validationMiddleware(coursesGetTopics),
    asyncHandler<coursesGetTopics.IParams, coursesGetTopics.IResponse, coursesGetTopics.IBody, coursesGetTopics.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const user = req.rederlyUser ?? await req.session.getUser();
        const rederlyUserRole = req.rederlyUserRole ?? user.roleId;
        const userId = (rederlyUserRole === Role.STUDENT) ? user.id : undefined;

        const result = await courseController.getTopics({
            courseId: req.query.courseId,
            isOpen: req.query.isOpen,
            userId
        });
        const resp = httpResponse.Ok('Fetched successfully', result.map(topic => topic.get({plain: true}) as Omit<CourseTopicContentInterface, 'studentTopicOverride'> & {
            studentTopicOverride: StudentTopicOverrideInterface[];
        }));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));
