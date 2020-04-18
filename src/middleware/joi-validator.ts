import * as Joi from "joi"
import Boom = require("boom");
import Extend = require("extend");

export default function validate(schema: any, options: any = {}) {
    options.abortEarly = false;

    // Using Request from express I get typescript errors
    return function validateRequest(req: any, res: Response, next: any) {
        let toValidate: any = {};
        if (!schema) {
            next();
        }

        ['params', 'body', 'query'].forEach(function (key: string) {
            if (schema[key]) {
                toValidate[key] = req[key];
            }
        });

        return Joi.validate(toValidate, schema, options, onValidationComplete);

        function onValidationComplete(err: any, validated: any) {
            if (err) {
                return next(Boom.badRequest(err.message, err.details));
            }

            // copy the validated data to the req object
            Extend(req, validated);

            return next();
        }

    };
}
