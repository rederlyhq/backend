// This file is just an aggregation of passing the routes to the router
/* eslint-disable @typescript-eslint/no-var-requires */
import express = require('express');
const router = express.Router();
import httpResponse from './utilities/http-response';
import * as fs from 'fs';
import * as path from 'path';
import expressAsyncHandler = require('express-async-handler');
import logger from './utilities/logger';

/**
 * Get the version number at startup, however you'll have to await the result in the callback
 * This should only be called once (same as if it was imported) and awaiting the promise will actually give you the result
 * On error returns null so that the api is indicating that it wasn't just missed but couldn't be retrieved (undefined just doesn't return the key)
 * Can't use import here because the rootDir is jailed to src (which makes sense)
 */
const versionPromise = new Promise<string | null>((resolve, reject) => {
    fs.readFile(path.join(__dirname, '../package.json'), (err: Error | null, data: Buffer) => {
        if (err) {
            reject(err);
        } else {
            try {
                // returns version string
                resolve(JSON.parse(data.toString()).version);
            } catch (e) {
                reject(e);
            }
        }
    });
})
.catch((err: Error) => {
    logger.error(err);
    return null;
});

router.use('/users', require('./features/users/user-route'));
router.use('/courses', require('./features/courses/course-route'));
router.use('/health', require('./features/health/health-route'));
router.use('/curriculum', require('./features/curriculum/curriculum-route'));
router.use('/support', require('./features/support/support-route'));
router.use('/version', expressAsyncHandler(async (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const version = await versionPromise;
    next(httpResponse.Ok(null, {
        packageJson: version
    }));
}));
// Dev routes for testing the scheduler, if your using this remember to uncomment the white lister for it as well in server.ts limiter
// router.use('/schedule', require('./scheduler-routes'));

module.exports = router;
