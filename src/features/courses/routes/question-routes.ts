import * as express from 'express';
import { authenticationMiddleware, paidMiddleware } from '../../../middleware/auth';
import httpResponse from '../../../utilities/http-response';
import * as _ from 'lodash';
import { validationMiddleware, ValidationMiddlewareOptions } from '../../../middleware/validation-middleware';
import { DeepAddIndexSignature } from '../../../extensions/typescript-utility-extensions';
import { Constants } from '../../../constants';
import IllegalArgumentException from '../../../exceptions/illegal-argument-exception';

import urljoin = require('url-join');
import rendererHelper, { GetProblemParameters, RENDERER_ENDPOINT, RendererResponse } from '../../../utilities/renderer-helper';
import { rederlyTempFileWrapper } from '../../../middleware/rederly-temp-file-wrapper';
import multer = require('multer');

import WrappedError from '../../../exceptions/wrapped-error';
import Role from '../../permissions/roles';
import courseController from '../course-controller';
import { CourseWWTopicQuestionInterface } from '../../../database/models/course-ww-topic-question';
import { CourseTopicContentInterface } from '../../../database/models/course-topic-content';
import { stripSequelizeFromUpdateResult, stripSequelizeFromUpsertResult } from '../../../generic-interfaces/sequelize-generic-interfaces';
import StudentGrade, { StudentGradeInterface } from '../../../database/models/student-grade';
import { StudentGradeInstanceInterface } from '../../../database/models/student-grade-instance';
import { StudentTopicQuestionOverrideInterface } from '../../../database/models/student-topic-question-override';
import RederlyError from '../../../exceptions/rederly-error';
import openLabHelper from '../../../utilities/openlab-helper';
import bodyParser = require('body-parser');
import { PostQuestionMeta } from '../course-types';
import proxy = require('express-http-proxy');
import configurations from '../../../configurations';
import qs = require('qs');

import { RederlyExpressRequest, EmptyExpressParams, EmptyExpressQuery } from '../../../extensions/rederly-express-request';
// TODO temporary, for development so the backend will still build
export interface RederlyRequestHandler<P extends {} = {}, ResBody = unknown, ReqBody = unknown, ReqQuery extends {} = {}, MetaType = never> {
    // tslint:disable-next-line callable-types (This is extended from and can't extend from a type alias in ts<2.2)
    // temporary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req: RederlyExpressRequest<P, ResBody, ReqBody, ReqQuery, MetaType>, res: express.Response<ResBody>, next: (arg?: any) => void): void;
}

export const asyncHandler = <P extends {} = {}, ResBody = unknown, ReqBody = unknown, ReqQuery extends {} = {}, MetaType = never>(requestHandler: RederlyRequestHandler<P, ResBody, ReqBody, ReqQuery, MetaType>): express.RequestHandler => async (req, res, next): Promise<void> => {
    try {
        // temporary
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await requestHandler(req as any, res, next);
    } catch (e) {
        next(e);
    }
};

export const router = express.Router();

import { courseQuestionPostSave } from '@rederly/backend-validation';
router.post('/question/editor/save',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPostSave),
    asyncHandler<courseQuestionPostSave.IParams, courseQuestionPostSave.IResponse, courseQuestionPostSave.IBody, courseQuestionPostSave.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser({
            where: {
                active: true
            }
        });

        const writeFilePath = urljoin(`private/my/${user.uuid}`, req.body.relativePath);
        const result = await rendererHelper.saveProblemSource({
            problemSource: req.body.problemSource,
            writeFilePath: writeFilePath,
        });

        const resp = httpResponse.Ok('Saved', {
            filePath: result
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPostUploadAsset } from '@rederly/backend-validation';
router.post('/question/editor/upload-asset',
    authenticationMiddleware,
    rederlyTempFileWrapper((tmpFilePath: string) => multer({dest: tmpFilePath}).single('asset-file')),
    validationMiddleware(courseQuestionPostUploadAsset),
    asyncHandler<courseQuestionPostUploadAsset.IParams, courseQuestionPostUploadAsset.IResponse, courseQuestionPostUploadAsset.IBody, courseQuestionPostUploadAsset.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser({
            where: {
                active: true
            }
        });

        const writeFilePath = urljoin(`private/my/${user.uuid}`, req.body.relativePath);
        const result = await rendererHelper.uploadAsset({
            filePath: req.file.path,
            rendererPath: writeFilePath
        });

        const resp = httpResponse.Ok('Uploaded', {
            filePath: result
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPostRead } from '@rederly/backend-validation';
router.post('/question/editor/read',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPostRead),
    asyncHandler<courseQuestionPostRead.IParams, courseQuestionPostRead.IResponse, courseQuestionPostRead.IBody, courseQuestionPostRead.IQuery>(async (req, _res, next) => {
        const sourceFilePath = req.body.filePath;
        // TODO if we use this regex elsewhere we should centralize
        // This should also be in the joi validation but due to time putting it here to handle the frontend
        if (!/^(:?private\/|Contrib\/|webwork-open-problem-library\/Contrib\/|Library\/|webwork-open-problem-library\/OpenProblemLibrary\/)\S+\.pg$/.test(sourceFilePath)) {
            throw new IllegalArgumentException('Invalid problem path; Problem paths must begin with private, Contrib or Library and end with a pg extension.');
        }
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const result = await rendererHelper.readProblemSource({
            sourceFilePath: sourceFilePath
        });

        const resp = httpResponse.Ok('Loaded', {
            problemSource: result
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPostCatalog } from '@rederly/backend-validation';
router.post('/question/editor/catalog',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPostCatalog as ValidationMiddlewareOptions),
    asyncHandler<courseQuestionPostCatalog.IParams, courseQuestionPostCatalog.IResponse, courseQuestionPostCatalog.IBody, courseQuestionPostCatalog.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser({
            where: {
                active: true
            }
        });

        const basePath = `private/my/${user.uuid}`;
        const result = await rendererHelper.catalog({
            basePath: basePath,
            // TODO what should the depth be?
            // -1 did not do all
            maxDepth: 100,
        });

        const resp = httpResponse.Ok('Loaded', {
            problems: Object.keys(result).filter(elm => elm.endsWith('.pg'))
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesGetQuestions } from '@rederly/backend-validation';
router.get('/questions',
    authenticationMiddleware,
    validationMiddleware(coursesGetQuestions),
    asyncHandler<coursesGetQuestions.IParams, coursesGetQuestions.IResponse, coursesGetQuestions.IBody, coursesGetQuestions.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const userIdInput = req.query.userId;
        let userId: number | undefined;
        if (typeof userIdInput === 'string') {
            if (userIdInput === 'me') {
                const session = req.session;
                userId = session.userId;
            } else {
                throw new IllegalArgumentException('userIdInput as a string must be the value `me`');
            }
        } else if (typeof userIdInput === 'number') {
            userId = userIdInput;
        }

        if (_.isNil(userId)) {
            throw new WrappedError('It is impossible for userId to still be undefined here.');
        }

        // This should not happen anyway, need to do a more in depth change in the future
        const rederlyUserRole = req.rederlyUserRole ?? Role.STUDENT;

        const {
            message,
            userCanGetQuestions,
            topic,
            version
        } = await courseController.canUserGetQuestions({
            userId,
            courseTopicContentId: req.query.courseTopicContentId,
            studentTopicAssessmentInfoId: req.query.studentTopicAssessmentInfoId,
            role: rederlyUserRole
        });

        // TODO fix frontend error handling around assessments when canGetQuestions is false
        if (userCanGetQuestions === false) {
            if (_.isNil(topic)){
                throw new IllegalArgumentException(message);
            } else {
                next(httpResponse.Ok(message, {topic}));
            }
            return;
        }

        const questions = await courseController.getQuestions({
            userId: userId,
            courseTopicContentId: req.query.courseTopicContentId,
            studentTopicAssessmentInfoId: req.query.studentTopicAssessmentInfoId ?? version?.id,
        });

        const resp = httpResponse.Ok('Got questions', {
            questions: questions.map(question => question.get({plain: true}) as CourseWWTopicQuestionInterface),
            topic: topic?.get({plain: true}) as CourseTopicContentInterface
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

    import { courseQuestionDeleteQuestionById } from '@rederly/backend-validation';
router.delete('/question/:id',
    authenticationMiddleware,
    validationMiddleware(courseQuestionDeleteQuestionById),
    paidMiddleware('Deleting questions'),
    asyncHandler<courseQuestionDeleteQuestionById.IParams, courseQuestionDeleteQuestionById.IResponse, courseQuestionDeleteQuestionById.IBody, courseQuestionDeleteQuestionById.IQuery>(async (req, _res, next) => {
        try {
            const updatesResult = await courseController.softDeleteQuestions({
                id: req.params.id
            });
            // TODO handle not found case
            const resp = httpResponse.Ok('Deleted questions and subobjects successfully', stripSequelizeFromUpdateResult<CourseWWTopicQuestionInterface>(updatesResult));
            next(resp as DeepAddIndexSignature<typeof resp>);
        } catch (e) {
            next(e);
        }
    }));

    import { courseQuestionPutGradeById } from '@rederly/backend-validation';
router.put('/question/grade/:id',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPutGradeById),
    asyncHandler<courseQuestionPutGradeById.IParams, courseQuestionPutGradeById.IResponse, courseQuestionPutGradeById.IBody, courseQuestionPutGradeById.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const updatedRecords = await courseController.updateGrade({
            where: {
                id: req.params.id
            },
            updates: {
                ...req.body
            },
            initiatingUserId: req.session.userId
        });
        const resp = httpResponse.Ok('Updated grade successfully', stripSequelizeFromUpdateResult<StudentGradeInterface>(updatedRecords));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPutInstanceById } from '@rederly/backend-validation';
router.put('/question/grade/instance/:id',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPutInstanceById),
    asyncHandler<courseQuestionPutInstanceById.IParams, courseQuestionPutInstanceById.IResponse, courseQuestionPutInstanceById.IBody, courseQuestionPutInstanceById.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const updatesResult = await courseController.updateGradeInstance({
            where: {
                id: req.params.id
            },
            updates: {
                ...req.body
            },
            initiatingUserId: req.session.userId
        });
        const resp = httpResponse.Ok('Updated grade successfully', stripSequelizeFromUpdateResult<StudentGradeInstanceInterface>(updatesResult));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPutExtend } from '@rederly/backend-validation';
router.put('/question/extend',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPutExtend),
    paidMiddleware('Modifying questions'),
    asyncHandler<courseQuestionPutExtend.IParams, courseQuestionPutExtend.IResponse, courseQuestionPutExtend.IBody, courseQuestionPutExtend.IQuery>(async (req, _res, next) => {
        const extensions = await courseController.extendQuestionForUser({
            where: {
                ...req.query
            },
            updates: {
                ...req.body
            }
        });
        const resp = httpResponse.Ok('Extended topic successfully', stripSequelizeFromUpsertResult<StudentTopicQuestionOverrideInterface>(extensions));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionPutQuestionById } from '@rederly/backend-validation';
router.put('/question/:id',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPutQuestionById),
    paidMiddleware('Modifying questions'),
    asyncHandler<courseQuestionPutQuestionById.IParams, courseQuestionPutQuestionById.IResponse, courseQuestionPutQuestionById.IBody, courseQuestionPutQuestionById.IQuery>(async (req, _res, next) => {
        const updatesResult = await courseController.updateQuestion({
            where: {
                id: req.params.id
            },
            updates: {
                ...req.body
            }
        });
        const resp = httpResponse.Ok('Updated question successfully', stripSequelizeFromUpdateResult<CourseWWTopicQuestionInterface>({
            updatedRecords: updatesResult,
            updatedCount: updatesResult.length
        }));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

    import { courseQuestionPostQuestion } from '@rederly/backend-validation';
router.post('/question',
    authenticationMiddleware,
    validationMiddleware(courseQuestionPostQuestion),
    paidMiddleware('Adding questions'),
    asyncHandler<courseQuestionPostQuestion.IParams, courseQuestionPostQuestion.IResponse, courseQuestionPostQuestion.IBody, courseQuestionPostQuestion.IQuery>(async (req, _res, next) => {
        const newQuestion = await courseController.addQuestion({
            question: {
                ...req.body
            }
        });
        // TODO handle not found case
        const resp = httpResponse.Created('Course Question created successfully', newQuestion.get({plain: true}) as CourseWWTopicQuestionInterface);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionGetRaw } from '@rederly/backend-validation';
router.get('/question/:id/raw',
    authenticationMiddleware,
    validationMiddleware(courseQuestionGetRaw),
    asyncHandler<courseQuestionGetRaw.IParams, courseQuestionGetRaw.IResponse, courseQuestionGetRaw.IBody, courseQuestionGetRaw.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const { id: questionId } = req.params;
        const { userId } = req.query;

        const question = await courseController.getQuestionWithoutRenderer({
                id: questionId,
                userId,
            });
        const resp = httpResponse.Ok('Fetched question successfully', question.get({plain: true}) as CourseWWTopicQuestionInterface);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionGetGrade } from '@rederly/backend-validation';
router.get('/question/:id/grade',
    authenticationMiddleware,
    validationMiddleware(courseQuestionGetGrade),
    asyncHandler<courseQuestionGetGrade.IParams, courseQuestionGetGrade.IResponse, courseQuestionGetGrade.IBody, courseQuestionGetGrade.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }
        const { userId, includeWorkbooks } = req.query;
        const { id: questionId } = req.params;

        const grade = await courseController.getGradeForQuestion({
            questionId,
            userId,
            includeWorkbooks
        });

        const resp = httpResponse.Ok('Fetched question grade successfully', (grade?.get({plain: true}) as StudentGradeInterface) ?? null);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionGetOpenlab } from '@rederly/backend-validation';
router.get('/question/:id/openlab',
    authenticationMiddleware,
    validationMiddleware(courseQuestionGetOpenlab),
    asyncHandler<courseQuestionGetOpenlab.IParams, courseQuestionGetOpenlab.IResponse, courseQuestionGetOpenlab.IBody, courseQuestionGetOpenlab.IQuery>(async (req, res, next) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();
        const { id: questionId } = req.params;
        const baseURL = req.headers['rederly-origin'] as string | undefined; // need this because it incorrectly thinks it can be an array
        if (_.isNil(baseURL)) {
            throw new RederlyError('Could not determine the base URL from the ask for help request');
        }

        const openLabRedirectInfo = await courseController.prepareOpenLabRedirect({user, questionId, baseURL});
        const openLabResponse = await openLabHelper.askForHelp(openLabRedirectInfo);

        const resp = httpResponse.Ok('Data sent to OpenLab successfully', openLabResponse);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { courseQuestionGetSma } from '@rederly/backend-validation';
router.get('/question/:id/sma',
    authenticationMiddleware,
    validationMiddleware(courseQuestionGetSma),
    asyncHandler<courseQuestionGetSma.IParams, courseQuestionGetSma.IResponse, courseQuestionGetSma.IBody, courseQuestionGetSma.IQuery>(async (req, res, next) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const userId = await req.session.userId;
        const { id: questionId } = req.params;

        const updatedGrade = await courseController.requestProblemNewVersion({questionId, userId}); 
        if (_.isNil(updatedGrade)) {
            const resp = httpResponse.Ok('No new versions of this problem could be found.', null);
            next(resp as DeepAddIndexSignature<typeof resp>);
        } else {
            const resp = httpResponse.Ok('New version found!', updatedGrade.get({plain: true}) as StudentGradeInterface);
            next(resp as DeepAddIndexSignature<typeof resp>);
        }
    }));

import { courseQuestionGetQuestionById } from '@rederly/backend-validation';
router.get('/question/:id',
    authenticationMiddleware,
    validationMiddleware(courseQuestionGetQuestionById),
    asyncHandler<courseQuestionGetQuestionById.IParams, courseQuestionGetQuestionById.IResponse, courseQuestionGetQuestionById.IBody, courseQuestionGetQuestionById.IQuery>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const requestingUser = req.rederlyUser ?? await req.session.getUser();
        const rederlyUserRole = req.rederlyUserRole ?? requestingUser.roleId;

        const { id: questionId } = req.params;
        const { readonly, workbookId, userId: requestedUserId, studentTopicAssessmentInfoId, showCorrectAnswers } = req.query;
        try {
            // check to see if we should allow this question to be viewed
            const {
                userCanViewQuestion,
                message
            } = await courseController.canUserViewQuestionId({
                user: requestingUser,
                questionId,
                studentTopicAssessmentInfoId,
                role: rederlyUserRole
            });

            if (userCanViewQuestion === false) throw new IllegalArgumentException(message);

            const question = await courseController.getQuestion({
                questionId,
                userId: requestedUserId ?? requestingUser.id,
                formURL: req.originalUrl,
                role: rederlyUserRole,
                readonly,
                workbookId,
                studentTopicAssessmentInfoId,
                showCorrectAnswers,
            });
            const resp = httpResponse.Ok('Fetched question successfully', question);
            next(resp as DeepAddIndexSignature<typeof resp>);

            // If testing renderer integration from the browser without the front end simply return the rendered html
            // To do so first uncomment the below res.send and comment out the above next
            // Also when in the browser console add your auth token (`document.cookie = "sessionToken=UUID;`)
            // Don't forget to do this in post as well
            // res.send(question.rendererData.renderedHTML);
        } catch (e) {
            next(e);
        }
    }));


    import { courseQuestionPostQuestionById } from '@rederly/backend-validation';
router.post('/question/:id',
    authenticationMiddleware,
    // TODO investigate if this is a problem
    // if the body were to be consumed it should hang here
    bodyParser.raw({
        type: '*/*'
    }),
    asyncHandler<courseQuestionPostQuestionById.IParams, courseQuestionPostQuestionById.IResponse, courseQuestionPostQuestionById.IBody, courseQuestionPostQuestionById.IQuery, PostQuestionMeta>(async (req, _res, next) => {
        if (_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = req.rederlyUser ?? await req.session.getUser();
        const rederlyUserRole = req.rederlyUserRole ?? user.roleId;

        const question = await courseController.getQuestionRecord(req.params.id);

        const rendererParams = await courseController.getCalculatedRendererParams({
            courseQuestion: question,
            role: rederlyUserRole,
            userId: user.id
        });

        const studentGrade = await StudentGrade.findOne({
            where: {
                userId: user.id,
                courseWWTopicQuestionId: req.params.id
            }
        });

        req.meta = {
            rendererParams,
            // TODO investigate why having full sequelize model causes proxy to hang
            // maybe meta is a reserved field?
            studentGrade: studentGrade?.get({ plain: true }) as StudentGrade,
            courseQuestion: question
        };
        next(undefined);
    }),
    proxy(configurations.renderer.url, {
        proxyReqPathResolver: (req: RederlyExpressRequest<EmptyExpressParams, courseQuestionPostQuestionById.IResponse, courseQuestionPostQuestionById.IBody, EmptyExpressQuery, PostQuestionMeta>) => {
            if (_.isNil(req.meta)) {
                throw new Error('Previously fetched metadata is nil');
            }
            const rendererParams: GetProblemParameters = {
                format: 'json',
                formURL: req.originalUrl,
                baseURL: '/',
                ...req.meta?.rendererParams,
                numIncorrect: req.meta.studentGrade?.numAttempts
            };
            return `${RENDERER_ENDPOINT}?${qs.stringify(rendererParams)}`;
        },
        userResDecorator: async (proxyRes, proxyResData, userReq: RederlyExpressRequest<EmptyExpressParams, courseQuestionPostQuestionById.IResponse, courseQuestionPostQuestionById.IBody, EmptyExpressQuery, PostQuestionMeta>) => {
            // Async handler can't be used here since this is part of the proxy
            const params = userReq.params as courseQuestionPostQuestionById.IParams;
            if (_.isNil(userReq.session)) {
                throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
            }

            if (_.isNil(userReq.meta)) {
                throw new Error('Previously fetched metadata is nil');
            }


            let rendererResponse: RendererResponse | null = null;
            const data = proxyResData.toString('utf8');
            if (proxyRes.statusCode >= 400) {
                throw new RederlyError(`Renderer submit question responded with error ${proxyRes.statusCode}: ${data}`);
            }
            try {
                rendererResponse = await rendererHelper.parseRendererResponse(data, {
                    questionPath: userReq.meta.courseQuestion.webworkQuestionPath,
                    questionRandomSeed: userReq.meta.studentGrade?.randomSeed
                });
            } catch (e) {
                throw new WrappedError(`Error parsing data response from renderer on question ${userReq.meta?.studentGrade?.courseWWTopicQuestionId} for grade ${userReq.meta?.studentGrade?.id}`, e);
            }

            const result = await courseController.submitAnswer({
                userId: userReq.session.userId,
                questionId: params.id,
                score: rendererResponse.problem_result.score,
                submitted: rendererResponse,
            });

            const resp = httpResponse.Ok('Answer submitted for question', {
                rendererData: rendererHelper.cleanRendererResponseForTheResponse(rendererResponse),
                ...result
            });
            // next(resp as DeepAddIndexSignature<typeof resp>);
            // There is no way to get next callback, however anything thrown will get sent to next
            // Using the below line will responde with a 201 the way we do in our routes
            throw resp;

            // If testing renderer integration from the browser without the front end simply return the rendered html
            // To do so first uncomment the below return and comment out the above throw
            // Also when in the browser console add your auth token (`document.cookie = "sessionToken=UUID;`)
            // Don't forget to do this in get as well
            // TODO switch back to json response, right now we don't use the extra data and the iframe implementation requires html passed back
            // return data.renderedHTML;
        }
    }));
