import * as express from 'express';
import courseController from '../course-controller';
import { authenticationMiddleware } from '../../../middleware/auth';
import httpResponse from '../../../utilities/http-response';
import { validationMiddleware } from '../../../middleware/validation-middleware';
import { DeepAddIndexSignature } from '../../../extensions/typescript-utility-extensions';
import attachmentHelper from '../../../utilities/attachments-helper';
import { ProblemAttachmentInterface } from '../../../database/models/problem-attachment';
import configurations from '../../../configurations';
import { stripSequelizeFromUpdateResult } from '../../../generic-interfaces/sequelize-generic-interfaces';

import { RederlyExpressRequest } from '../../../extensions/rederly-express-request';
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
import { coursesPostUploadUrl } from '@rederly/backend-validation';
router.post('/attachments/upload-url',
    authenticationMiddleware,
    validationMiddleware(coursesPostUploadUrl),
    asyncHandler<coursesPostUploadUrl.IParams, coursesPostUploadUrl.IResponse, coursesPostUploadUrl.IBody, coursesPostUploadUrl.IQuery>(async (req, _res, next) => {
        const result = await attachmentHelper.getNewPresignedURL();
        const resp = httpResponse.Ok('Get new presigned url success', result);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesPostAttachments } from '@rederly/backend-validation';
router.post('/attachments',
    authenticationMiddleware,
    validationMiddleware(coursesPostAttachments),
    asyncHandler<coursesPostAttachments.IParams, coursesPostAttachments.IResponse, coursesPostAttachments.IBody, coursesPostAttachments.IQuery>(async (req, _res, next) => {
        // TODO permission to check if user has access to the provided grade or grade instance
        const result = await courseController.createAttachment({
            obj: req.body.attachment,
            studentGradeId: req.body.studentGradeId,
            studentGradeInstanceId: req.body.studentGradeInstanceId,
            studentWorkbookId: req.body.studentWorkbookId
        });
        const resp = httpResponse.Ok('Attachment record created', result.get({plain: true}) as ProblemAttachmentInterface);
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesGetList } from '@rederly/backend-validation';
router.get('/attachments/list',
    authenticationMiddleware,
    validationMiddleware(coursesGetList),
    asyncHandler<coursesGetList.IParams, coursesGetList.IResponse, coursesGetList.IBody, coursesGetList.IQuery>(async (req, _res, next) => {
        // TODO permission to check if user has access to the provided grade or grade instance
        const result = await courseController.listAttachments({
            studentGradeId: req.query.studentGradeId,
            studentGradeInstanceId: req.query.studentGradeInstanceId,
            studentWorkbookId: req.query.studentWorkbookId,
        });

        const resp = httpResponse.Ok('Attachments fetched successfully', {
            attachments: result.map(attachment => attachment.get({plain: true}) as ProblemAttachmentInterface),
            baseUrl: configurations.attachments.baseUrl
        });
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));

import { coursesDeleteAttachmentsById } from '@rederly/backend-validation';
router.delete('/attachments/:id',
    authenticationMiddleware,
    validationMiddleware(coursesDeleteAttachmentsById),
    asyncHandler<coursesDeleteAttachmentsById.IParams, coursesDeleteAttachmentsById.IResponse, coursesDeleteAttachmentsById.IBody, coursesDeleteAttachmentsById.IQuery>(async (req, _res, next) => {
        // TODO permission to check if user has access to the provided grade or grade instance
        const result = await courseController.deleteAttachment({
            problemAttachmentId: req.params.id
        });

        const resp = httpResponse.Ok('Attachment deleted successfully', stripSequelizeFromUpdateResult<ProblemAttachmentInterface>(result));
        next(resp as DeepAddIndexSignature<typeof resp>);
    }));
