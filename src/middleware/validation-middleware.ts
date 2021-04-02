import * as Boom from 'boom';
import { Request, Response, NextFunction, Handler } from 'express';
import { RederlyValidationError, AJVSchema, validate } from '@rederly/backend-validation/lib/rederly-ajv-wrapper';
import * as _ from 'lodash';
import logger from '../utilities/logger';

export interface ValidationMiddlewareOptions {
    bodySchema?: AJVSchema | null;
    querySchema?: AJVSchema | null;
    paramsSchema?: AJVSchema | null;
}

export const validationMiddleware = ({ bodySchema, querySchema, paramsSchema }: ValidationMiddlewareOptions): Handler => (req: Request, _res: Response, next: NextFunction): void => {
    const validationObject = {
        body: bodySchema,
        query: querySchema,
        params: paramsSchema
    };

    let success = true;
    Object.entries(validationObject).some((entry) => {
        const [key, schema] = entry;
        const typedKey = key as 'query' | 'body' | 'params';
        const toValidate = req[typedKey];
        if (schema) {
            try {
                validate({
                    schema: schema,
                    data: toValidate,
                    clone: false
                });

                // don't return so it will continue to test (could return false)
            } catch (e) {
                if (RederlyValidationError.isRederlyValidationError(e)) {
                    console.log(e.validate.errors);
                    const firstError = e.validate.errors?.[0];
                    next(Boom.badRequest(`Backend validation failed for "${firstError?.dataPath}" ${firstError?.message ?? 'unknown'}`, {
                        key: key,
                        errors: e.validate.errors
                    }));
                } else {
                    const message = `Error validating "${key}"`;
                    logger.error(message, e.message);
                    next(Boom.internal('Error validating', message));
                }
                // in either case it failed and no reason to go on
                success = false;
                return true;
            }
        } else if (!_.isEmpty(toValidate)) {
            next(Boom.badRequest(`Request "${key}" is not allowed for this request`));
            success = false;
            return true;
        }
        // at this point it succeeded validation
        // or there was no data to validate and no schema to validate it
    });

    if (success) {
        next();
    }
};
