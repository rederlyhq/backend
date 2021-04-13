import * as _ from 'lodash';
import * as express from 'express';
import { authenticationMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import { asyncHandler } from '../../extensions/rederly-express-request';
import supportController from './support-controller';
import { Constants } from '../../constants';
import Role from '../permissions/roles';
import { validationMiddleware } from '../../middleware/validation-middleware';

const router = express.Router();

import { supportPostSupport } from '@rederly/backend-validation';
router.post('/',
    authenticationMiddleware,
    validationMiddleware(supportPostSupport),
    asyncHandler<supportPostSupport.IParams, supportPostSupport.IResponse, supportPostSupport.IBody, supportPostSupport.IQuery>(async (req, _res, next) => {
        if(_.isNil(req.session)) {
            throw new Error(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
        }

        const user = await req.session.getUser();
        const role = await user.getRole();
        await supportController.createIssue({
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
        // JiraApi.JsonResponse is not currently defined
        // in the future it might make sense to pull out the information from the result of the previous method
        // this might include the ticket number
        next(httpResponse.Ok('Support ticket created successfully', null));
    }));

module.exports = router;
