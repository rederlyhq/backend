import * as _ from 'lodash';
import { Response } from 'express';
const router = require('express').Router();
import { authenticationMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import * as asyncHandler from 'express-async-handler';
import { RederlyExpressRequest, EmptyExpressParams, EmptyExpressQuery } from '../../extensions/rederly-express-request';
import supportController from './support-controller';
import { Constants } from '../../constants';
import Role from '../permissions/roles';
import { validationMiddleware } from '../../middleware/validation-middleware';
import { TypedNextFunction } from '../../extensions/rederly-express-request';


import { supportPostSupport } from '@rederly/backend-validation';
router.post('/',
    authenticationMiddleware,
    validationMiddleware(supportPostSupport),
    asyncHandler(async (req: RederlyExpressRequest<EmptyExpressParams, unknown, supportPostSupport.IBody, EmptyExpressQuery>, res: Response, next: TypedNextFunction<supportPostSupport.IResponse>) => {
        if(_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = await req.session.getUser();
        const role = await user.getRole();
        const result = await supportController.createIssue({
            description: `
            User name: ${user.firstName} ${user.lastName}
            User id: ${user.id}
            User email: ${user.email}
            User role: ${role.roleName}
            User acting role: ${_.isNil(req.rederlyUserRole) ? 'NA' : Role[req.rederlyUserRole]}
            Frontend version: ${req.body.version}
            Originating URL: ${req.body.url}
            User Agent: ${req.body.userAgent}
            
            Description:
            ${req.body.description}
            `,
            summary: `SUPPORT: ${req.body.summary}`
        });
        next(httpResponse.Ok('Support ticket created successfully', result));
    }));

module.exports = router;
