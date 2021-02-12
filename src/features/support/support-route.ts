import * as _ from 'lodash';
import { Response, NextFunction } from 'express';
const router = require('express').Router();
import validate from '../../middleware/joi-validator';
import { authenticationMiddleware } from '../../middleware/auth';
import httpResponse from '../../utilities/http-response';
import * as asyncHandler from 'express-async-handler';
import { RederlyExpressRequest } from '../../extensions/rederly-express-request';
import { feedbackValidation } from './support-route-validation';
import { FeedbackRequest } from './support-route-request-types';
import supportController from './support-controller';
import { Constants } from '../../constants';
import Role from '../permissions/roles';

router.post('/',
    authenticationMiddleware,
    validate(feedbackValidation),
    asyncHandler(async (req: RederlyExpressRequest<FeedbackRequest.params, unknown, FeedbackRequest.body, FeedbackRequest.query>, res: Response, next: NextFunction) => {
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
