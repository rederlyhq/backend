import * as Joi from "joi"
import Boom = require("boom");
import Extend = require("extend");
import { NextFunction, Response } from "express";

export default function validate(schema: Joi.SchemaLike, options: Joi.ValidationOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
    options.abortEarly = false;

    // Using Request from express I get typescript errors
    return function validateRequest(req: Request, res: Response, next: NextFunction): void {
        // This is a generic callback which can be used for any object, thus this can be any as well
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toValidate: any = {};
        if (!schema) {
            next();
        }

        ['params', 'body', 'query'].forEach((key: string) => {
            // Schemas are generic and thus can be treated as anys
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((schema as any)[key]) {
                // params, body and query exist for req, but generic for each cannot tell
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                toValidate[key] = (req as any)[key];
            }
        });

        // Again this function is generic, validated can be any object based on the arguements
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onValidationComplete = (err: Joi.ValidationError, validated: any): void => {
            if (err) {
                return next(Boom.badRequest(err.message, err.details));
            }

            // copy the validated data to the req object
            Extend(req, validated);

            return next();
        }

        return Joi.validate(toValidate, schema, options, onValidationComplete);
    };
}
