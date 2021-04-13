import * as express from 'express';
import configurations from '../../configurations';
import httpResponse from '../../utilities/http-response';
import { asyncHandler } from '../../extensions/rederly-express-request';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../../utilities/logger';
import { Logger } from 'winston';
import { authenticationMiddleware } from '../../middleware/auth';
import { statusHandler } from '../../middleware/status-handler';
import { validationMiddleware } from '../../middleware/validation-middleware';
import { DeepAddIndexSignature } from '../../extensions/typescript-utility-extensions';

export const router = express.Router();

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

import { utilityGetVersion } from '@rederly/backend-validation';
router.get('/version',
// No validation
// No authentication
asyncHandler<utilityGetVersion.IParams, utilityGetVersion.IResponse, utilityGetVersion.IBody, utilityGetVersion.IQuery>(async (_req, _res, next) => {
    const version = await versionPromise;
    next(httpResponse.Ok('Version fetched', {
        packageJson: version
    }));
}));

// import { utilityGetStatus } from '@rederly/backend-validation';
router.get('/status',
statusHandler({
    versionPromise: versionPromise,
    healthAccessibleOptions: [
        // TODO change to status when available
        {
            name: 'renderer',
            url: `${configurations.renderer.url}/version.txt`,
            crawl: true
        }
    ],
    statusAccessibleOptions: [{
        name: 'bulk-export-pdf',
        url: `${configurations.bulkPdfExport.baseUrl}/export/utility/status`,
        crawl: true
    }]
}));

import { utilityGetSecretToEveryone } from '@rederly/backend-validation';
router.get('/secret-to-everyone',
// No validation
authenticationMiddleware,
asyncHandler<utilityGetSecretToEveryone.IParams, utilityGetSecretToEveryone.IResponse, utilityGetSecretToEveryone.IBody, utilityGetSecretToEveryone.IQuery>((_req, _res, next) => {
    const resp = httpResponse.Ok('Shhh...', configurations.hash);
    next(resp as DeepAddIndexSignature<typeof resp>);
}));

interface ClientLogMessage {
    level?: keyof Logger;
}

import { utilityPostClientLogs } from '@rederly/backend-validation';
router.post('/client-logs',
validationMiddleware(utilityPostClientLogs),
// No authentication
asyncHandler<utilityPostClientLogs.IParams, utilityPostClientLogs.IResponse, utilityPostClientLogs.IBody, utilityPostClientLogs.IQuery>(async (req, _res, next) => {
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
    next(httpResponse.Ok('Logged', null));
}));
