import * as express from 'express';
import * as _  from'lodash';
import { RederlyExpressRequest } from '../../../extensions/rederly-express-request';
import { authenticationMiddleware, paidMiddleware } from '../../../middleware/auth';
import httpResponse from '../../../utilities/http-response';
import enrollmentController from './enrollment-controller';
import { BulkEnrollRequest, GetPendingEnrollmentsRequest, DeletePendingEnrollmentsRequest } from './enrollment-route-request-types';
import * as asyncHandler from 'express-async-handler';
import { bulkEnrollValidation, deletePendingEnrollmentsValidation, getPendingEnrollmentsValidation } from './enrollment-route-validation';
import validate from '../../../middleware/joi-validator';

const router = express.Router();

router.post('/bulk',
    authenticationMiddleware,
    validate(bulkEnrollValidation),
    paidMiddleware('Bulk enrolling student\'s'),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<BulkEnrollRequest.params, unknown, BulkEnrollRequest.body, BulkEnrollRequest.query>, _res: unknown, next: express.NextFunction) => {
        const bulkEnrollResult = await enrollmentController.bulkEnroll({
            courseId: req.body.courseId,
            userEmails: req.body.userEmails
        });
        next(httpResponse.Ok(null, bulkEnrollResult));
    }));

router.get('/pending',
    authenticationMiddleware,
    validate(getPendingEnrollmentsValidation),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<GetPendingEnrollmentsRequest.params, unknown, GetPendingEnrollmentsRequest.body, unknown>, _res: unknown, next: express.NextFunction) => {
        const query = req.query as GetPendingEnrollmentsRequest.query;
        const bulkEnrollResult = await enrollmentController.getPendingEnrollments(query.courseId);
        next(httpResponse.Ok(null, bulkEnrollResult));
    }));

router.delete('/pending',
    authenticationMiddleware,
    validate(deletePendingEnrollmentsValidation),
    // This is due to a typescript issue where the type mismatches extractMap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asyncHandler(async (req: RederlyExpressRequest<DeletePendingEnrollmentsRequest.params, unknown, DeletePendingEnrollmentsRequest.body, unknown>, _res: unknown, next: express.NextFunction) => {
        const result = await enrollmentController.deletePendingEnrollments(req.body.id);
        next(httpResponse.Ok(null, result));
    }));

export default router;
