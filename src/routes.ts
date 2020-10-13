// This file is just an aggregation of passing the routes to the router
/* eslint-disable @typescript-eslint/no-var-requires */
import express = require('express');
const router = express.Router();
// import { version } from '../package.json';
import httpResponse from './utilities/http-response';

router.use('/users', require('./features/users/user-route'));
router.use('/courses', require('./features/courses/course-route'));
router.use('/health', require('./features/health/health-route'));
router.use('/curriculum', require('./features/curriculum/curriculum-route'));
router.use('/support', require('./features/support/support-route'));
router.use('/version', (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    // TODO should we add git version here too?
    next(httpResponse.Ok(null, {
        // packageJson: version
    }));
});
module.exports = router;
