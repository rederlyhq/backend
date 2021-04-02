import { Request, Response } from 'express';
const router = require('express').Router();
import * as asyncHandler from 'express-async-handler';
import httpResponse from '../../utilities/http-response';
import { validationMiddleware, ValidationMiddlewareOptions } from '../../middleware/validation-middleware';
import { TypedNextFunction } from '../../extensions/rederly-express-request';

import { healthGetHealth } from '@rederly/backend-validation';
router.get('/',
    validationMiddleware(healthGetHealth as ValidationMiddlewareOptions),
    asyncHandler(async (_req: Request, _res: Response<healthGetHealth.IResponse>, next: TypedNextFunction<healthGetHealth.IResponse>) => {
        const resp = httpResponse.Ok('Health Ok', null);
        next(resp);
    }));

module.exports = router;
