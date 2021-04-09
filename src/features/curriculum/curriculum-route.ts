import * as _ from 'lodash';
import { Response } from 'express';
import * as express from 'express';
import { authenticationMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import * as asyncHandler from 'express-async-handler';
import curriculumController from './curriculum-controller';
import logger from '../../utilities/logger';
import { RederlyExpressRequest, TypedNextFunction, EmptyExpressParams, EmptyExpressQuery } from '../../extensions/rederly-express-request';
import Curriculum, { CurriculumInterface } from '../../database/models/curriculum';
import { Constants } from '../../constants';
import { useDatabaseTransaction } from '../../utilities/database-helper';
import { validationMiddleware, ValidationMiddlewareOptions } from '../../middleware/validation-middleware';
import { DeepAddIndexSignature } from '../../extensions/typescript-utility-extensions';
import { CurriculumUnitContentInterface } from '../../database/models/curriculum-unit-content';
import { CurriculumTopicContentInterface } from '../../database/models/curriculum-topic-content';

const router = express.Router();

import { curriculumPostCurriculum } from '@rederly/backend-validation';
router.post('/',
    authenticationMiddleware,
    validationMiddleware(curriculumPostCurriculum),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, curriculumPostCurriculum.IResponse, curriculumPostCurriculum.IBody, EmptyExpressQuery>, _res: Response<curriculumPostCurriculum.IResponse>, next: TypedNextFunction<curriculumPostCurriculum.IResponse>) => {
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, curriculumPostUnit.IResponse, curriculumPostUnit.IBody, EmptyExpressQuery>, _res: Response<curriculumPostUnit.IResponse>, next: TypedNextFunction<curriculumPostUnit.IResponse>) => {
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, curriculumPostTopic.IResponse, curriculumPostTopic.IBody, EmptyExpressQuery>, _res: Response<curriculumPostTopic.IResponse>, next: TypedNextFunction<curriculumPostTopic.IResponse>) => {
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, curriculumPutUnitById.IResponse, curriculumPutUnitById.IBody, EmptyExpressQuery>, res: Response<curriculumPutUnitById.IResponse>, next: TypedNextFunction<curriculumPutUnitById.IResponse>) => {
        try {
            const params = req.params as curriculumPutUnitById.IParams;
            const updates = await curriculumController.updateUnit({
                where: {
                    id: params.id
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, curriculumPutTopicById.IResponse, curriculumPutTopicById.IBody, EmptyExpressQuery>, _res: Response<curriculumPutTopicById.IResponse>, next: TypedNextFunction<curriculumPutTopicById.IResponse>) => {
        try {
            const params = req.params as curriculumPutTopicById.IParams;
            const updates = await curriculumController.updateTopic({
                where: {
                    id: params.id
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, curriculumPostQuestion.IResponse, curriculumPutTopicById.IBody, EmptyExpressQuery>, res: Response<curriculumPostQuestion.IResponse>, next: TypedNextFunction<curriculumPostQuestion.IResponse>) => {
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
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, curriculumGetCurriculum.IResponse, unknown, EmptyExpressQuery>, res: Response<curriculumGetCurriculum.IResponse>, next: TypedNextFunction<curriculumGetCurriculum.IResponse>) => {
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
import { CurriculumWWTopicQuestionInterface } from '../../database/models/curriculum-ww-topic-question';
router.get('/:id',
    authenticationMiddleware,
    validationMiddleware(curriculumGetCurriculumById),
    // This is due to typescript not accepting it as the first parameter
    // We take it as any and then immediately cast it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, curriculumGetCurriculumById.IResponse, unknown, EmptyExpressQuery>, res: Response<curriculumGetCurriculumById.IResponse>, next: TypedNextFunction<curriculumGetCurriculumById.IResponse>) => {
        try {
            const params = req.params as curriculumGetCurriculumById.IParams;
            const curriculum = await curriculumController.getCurriculumById(params.id);
            const resp = httpResponse.Ok('Fetched successfully', curriculum.get({plain: true}) as CurriculumInterface);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

module.exports = router;
