import { Handler, NextFunction } from 'express';
import _ = require('lodash');
import RederlyError from '../exceptions/rederly-error';
import { RederlyExpressRequest } from '../extensions/rederly-express-request';

/**
 * This middleware provides a sandboxed directory for requests
 * Usage:
 * ```
 * rederlyTempFileWrapper((tmpFilePath: string) => multer({dest: tmpFilePath}).single('file')),
 * ```
 * 
 * This is a function, that takes a function to receive the injected sandboxed file path that will return the desired express middleware
 * so when this express middleware is called that callback is called which in turn provides the target middleware with the injected values and then it is called
 * @param callback 
 */
export const rederlyTempFileWrapper = (callback: (tmpFilePath: string) => Handler): Handler => (...args): void => {
    const req: RederlyExpressRequest = args[0];
    const next: NextFunction = args[2];
    if (_.isNil(req.requestId)) {
        next(new RederlyError('Request is missing request id'));
        return;
    }

    callback(`./tmp/${req.requestId}`)(...args);
};
