import * as _ from 'lodash';
import * as express from 'express';
import { authenticationMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import curriculumController from './curriculum-controller';
import logger from '../../utilities/logger';
import { asyncHandler } from '../../extensions/rederly-express-request';
import Curriculum, { CurriculumInterface } from '../../database/models/curriculum';
import { Constants } from '../../constants';
import { useDatabaseTransaction } from '../../utilities/database-helper';
import { validationMiddleware, ValidationMiddlewareOptions } from '../../middleware/validation-middleware';
import { DeepAddIndexSignature } from '../../extensions/typescript-utility-extensions';
import { CurriculumUnitContentInterface } from '../../database/models/curriculum-unit-content';
import { CurriculumTopicContentInterface } from '../../database/models/curriculum-topic-content';
import { CurriculumWWTopicQuestionInterface } from '../../database/models/curriculum-ww-topic-question';

export const router = express.Router();

import { curriculumPostCurriculum } from '@rederly/backend-validation';
router.post('/',
    authenticationMiddleware,
    validationMiddleware(curriculumPostCurriculum),
    asyncHandler<curriculumPostCurriculum.IParams, curriculumPostCurriculum.IResponse, curriculumPostCurriculum.IBody, curriculumPostCurriculum.IQuery>(async (req, _res, next) => {
        try {
            if(_.isNil(req.session)) {
                throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
            }

            const session = req.session;
            const user = await session.getUser();
            const university = await user.getUniversity();

            const newCurriculum: Curriculum = await useDatabaseTransaction(async () => {
                const newCurriculum = await curriculumController.createCurriculum({
                    ...req.body,
                    universityId: university.id
                });

                try {
                    await curriculumController.createUniversityCurriculumPermission({
                        curriculumId: newCurriculum.id,
                        universityId: university.id,
                    });
                } catch (e) {
                    logger.error(e);
                }
                return newCurriculum;
            });
            const resp = httpResponse.Created('Curriculum created successfully', newCurriculum.get({plain:true}) as CurriculumInterface);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { curriculumPostUnit } from '@rederly/backend-validation';
router.post('/unit',
    authenticationMiddleware,
    validationMiddleware(curriculumPostUnit),
    asyncHandler<curriculumPostUnit.IParams, curriculumPostUnit.IResponse, curriculumPostUnit.IBody, curriculumPostUnit.IQuery>(async (req, _res, next) => {
        try {
            const newUnit = await curriculumController.createUnit({
                ...req.body
            });
            // TODO handle not found case
            const resp = httpResponse.Created('Unit created successfully', newUnit.get({plain: true}) as CurriculumUnitContentInterface);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { curriculumPostTopic } from '@rederly/backend-validation';
router.post('/topic',
    authenticationMiddleware,
    validationMiddleware(curriculumPostTopic),
    asyncHandler<curriculumPostTopic.IParams, curriculumPostTopic.IResponse, curriculumPostTopic.IBody, curriculumPostTopic.IQuery>(async (req, _res, next) => {
        try {
            const newTopic = await curriculumController.createTopic({
                ...req.body
            });
            // TODO handle not found case
            const resp = httpResponse.Created('Topic created successfully', newTopic.get({plain: true}) as CurriculumTopicContentInterface);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { curriculumPutUnitById } from '@rederly/backend-validation';
router.put('/unit/:id',
    authenticationMiddleware,
    validationMiddleware(curriculumPutUnitById),
    asyncHandler<curriculumPutUnitById.IParams, curriculumPutUnitById.IResponse, curriculumPutUnitById.IBody, curriculumPutUnitById.IQuery>(async (req, _res, next) => {
        try {
            const updates = await curriculumController.updateUnit({
                where: {
                    id: req.params.id
                },
                updates: {
                    ...req.body
                }
            });
            // TODO handle not found case
            const resp = httpResponse.Ok('Updated unit successfully', updates);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { curriculumPutTopicById } from '@rederly/backend-validation';
router.put('/topic/:id',
    authenticationMiddleware,
    validationMiddleware(curriculumPutTopicById),
    asyncHandler<curriculumPutTopicById.IParams, curriculumPutTopicById.IResponse, curriculumPutTopicById.IBody, curriculumPutTopicById.IQuery>(async (req, _res, next) => {
        try {
            const updates = await curriculumController.updateTopic({
                where: {
                    id: req.params.id
                },
                updates: {
                    ...req.body
                }
            });
            // TODO handle not found case
            const resp = httpResponse.Ok('Updated topic successfully', updates);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { curriculumPostQuestion } from '@rederly/backend-validation';
router.post('/question',
    authenticationMiddleware,
    validationMiddleware(curriculumPostQuestion),
    asyncHandler<curriculumPostQuestion.IParams, curriculumPostQuestion.IResponse, curriculumPostQuestion.IBody, curriculumPostQuestion.IQuery>(async (req, res, next) => {
        try {
            const newQuestion = await curriculumController.createQuestion({
                ...req.body
            });
            // TODO handle not found case
            const resp = httpResponse.Created('Question created successfully', newQuestion.get({plain: true}) as CurriculumWWTopicQuestionInterface);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { curriculumGetCurriculum } from '@rederly/backend-validation';
router.get('/',
    authenticationMiddleware,
    validationMiddleware(curriculumGetCurriculum as ValidationMiddlewareOptions),
    asyncHandler<curriculumGetCurriculum.IParams, curriculumGetCurriculum.IResponse, curriculumGetCurriculum.IBody, curriculumGetCurriculum.IQuery>(async (req, res, next) => {
        try {
            if (_.isNil(req.session)) {
                throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
            }

            const user = await req.session.getUser();
            const curriculums = await curriculumController.getCurriculums({user});
            const resp = httpResponse.Ok('Fetched successfully', curriculums.map(curriculum => curriculum.get({plain: true}) as CurriculumInterface));
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

import { curriculumGetCurriculumById } from '@rederly/backend-validation';
router.get('/:id',
    authenticationMiddleware,
    validationMiddleware(curriculumGetCurriculumById),
    asyncHandler<curriculumGetCurriculumById.IParams, curriculumGetCurriculumById.IResponse, curriculumPostCurriculum.IBody, curriculumGetCurriculumById.IQuery>(async (req, res, next) => {
        try {
            const curriculum = await curriculumController.getCurriculumById(req.params.id);
            const resp = httpResponse.Ok('Fetched successfully', curriculum.get({plain: true}) as CurriculumInterface);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));
