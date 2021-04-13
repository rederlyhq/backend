import * as express from 'express';
import httpResponse from '../../utilities/http-response';
import { validationMiddleware, ValidationMiddlewareOptions } from '../../middleware/validation-middleware';
import { asyncHandler } from '../../extensions/rederly-express-request';

export const router = express.Router();

import { healthGetHealth } from '@rederly/backend-validation';
router.get('/',
    validationMiddleware(healthGetHealth as ValidationMiddlewareOptions),
    asyncHandler<healthGetHealth.IParams, healthGetHealth.IResponse, healthGetHealth.IBody, healthGetHealth.IParams>(async (_req, _res, next) => {
        const resp = httpResponse.Ok('Health Ok', null);
        next(resp);
    }));
