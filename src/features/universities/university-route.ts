import { Response, NextFunction } from 'express';
const router = require('express').Router();
import validate from '../../middleware/joi-validator';
import httpResponse from '../../utilities/http-response';
import * as asyncHandler from 'express-async-handler';
import { RederlyExpressRequest } from '../../extensions/rederly-express-request';
import { authenticationMiddleware } from '../../middleware/auth';
import { postUniversity } from './university-route-validation';
import University from '../../database/models/university';
import Role from '../permissions/roles';
import ForbiddenError from '../../exceptions/forbidden-error';

router.post('/university',
validate(postUniversity),
authenticationMiddleware,
asyncHandler(async (req: RederlyExpressRequest, _res: Response, next: NextFunction) => {
    const role = req.rederlyUserRole ?? req.rederlyUser?.roleId ?? Role.STUDENT;
    if (role !== Role.SUPERADMIN) {
        throw new ForbiddenError('You do not have access to create universities.');
    }
    const res = await University.create(req.body);
    next(httpResponse.Ok(null, res));
}));

module.exports = router;
