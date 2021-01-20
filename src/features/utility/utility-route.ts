import { Response, NextFunction } from 'express';
const router = require('express').Router();
import configurations from '../../configurations';
import validate from '../../middleware/joi-validator';
import httpResponse from '../../utilities/http-response';
import * as asyncHandler from 'express-async-handler';
import { RederlyExpressRequest } from '../../extensions/rederly-express-request';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../../utilities/logger';
import { clientLogValidation } from './utility-route-validation';
import { ClientLogRequest } from './utility-route-request-types';
import { Logger } from 'winston';
import { authenticationMiddleware } from '../../middleware/auth';

const packageJSONPath = '../../../package.json';

/**
 * Get the version number at startup, however you'll have to await the result in the callback
 * This should only be called once (same as if it was imported) and awaiting the promise will actually give you the result
 * On error returns null so that the api is indicating that it wasn't just missed but couldn't be retrieved (undefined just doesn't return the key)
 * Can't use import here because the rootDir is jailed to src (which makes sense)
 */
const versionPromise = new Promise<string | null>((resolve, reject) => {
    fs.readFile(path.join(__dirname, packageJSONPath), (err: Error | null, data: Buffer) => {
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

router.use('/version',
// No validation
// No authentication
asyncHandler(async (_req: RederlyExpressRequest, _res: Response, next: NextFunction) => {
    const version = await versionPromise;
    next(httpResponse.Ok(null, {
        packageJson: version
    }));
}));

router.use('/secret-to-everyone',
// No validation
authenticationMiddleware,
(_req: RederlyExpressRequest, _res: Response, next: NextFunction) => {
    next(httpResponse.Ok(null, configurations.hash));
});

interface ClientLogMessage {
    level?: keyof Logger;
}

router.use('/client-logs',
validate(clientLogValidation),
// No authentication
asyncHandler(async (req: RederlyExpressRequest<ClientLogRequest.params, unknown, ClientLogRequest.body, ClientLogRequest.query>, _res: Response, next: NextFunction) => {
    req.body.logs.forEach((log: unknown) => {
        let logLevel: keyof Logger | undefined = (log as ClientLogMessage).level;
        const availableLoggingLevels = Object.keys(logger.levels);
        if(_.isUndefined(logLevel)) {
            logger.warn(`logLevel "${logLevel}" is undefined`);
        } else if (availableLoggingLevels.indexOf(logLevel) < 0) {
            logger.warn(`logLevel "${logLevel}" is not a log level`);
            // Delete the invalid log level so it can be defaulted
            logLevel = undefined;
        } else if (typeof(logger[logLevel]) !== 'function') {
            // This should be impossible to hit since the above else if should handle it, adding it to be extra careful
            logger.warn(`logLevel "${logLevel}" is a log level but not a function on logger`);
            // Delete the invalid log level so it can be defaulted
            logLevel = undefined;
        }
        logLevel = logLevel || 'error';
        logger[logLevel](`Client Log: ${JSON.stringify(log)}`);
    });
    next(httpResponse.Ok('Logged'));
}));

module.exports = router;
