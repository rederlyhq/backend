import { Response, NextFunction } from 'express';
const router = require('express').Router();
import validate from '../../middleware/joi-validator';
import httpResponse from '../../utilities/http-response';
import * as asyncHandler from 'express-async-handler';
import { RederlyExpressRequest } from '../../extensions/rederly-express-request';

import * as fs from 'fs';
import * as path from 'path';
import logger from '../../utilities/logger';
import { clientLogValidation } from './utility-route-validation';
import { ClientLogRequest } from './utility-route-request-types';

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

// TODO should we make a utility routes file
router.use('/version',
asyncHandler(async (_req: RederlyExpressRequest, _res: Response, next: NextFunction) => {
    const version = await versionPromise;
    next(httpResponse.Ok(null, {
        packageJson: version
    }));
}));

router.use('/client-logs',
validate(clientLogValidation),
asyncHandler(async (req: RederlyExpressRequest<ClientLogRequest.params, unknown, ClientLogRequest.body, ClientLogRequest.query>, _res: Response, next: NextFunction) => {
    req.body.logs.forEach((log: unknown) => {
        // TODO grab the log level from the object?
        // Should not bloat this with anything but errors
        logger.error(`Client Log: ${JSON.stringify(log)}`);
    });
    next(httpResponse.Ok('Logged'));
}));

module.exports = router;
