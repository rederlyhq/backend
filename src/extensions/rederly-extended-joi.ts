import * as Joi from '@hapi/joi';
import logger from '../utilities/logger';

// https://github.com/sideway/joi/issues/1442#issuecomment-574915234
export const JoiToStringedStringConvertible = (joi: typeof Joi): unknown => {
    return {
        base: joi.string(),
        name: 'toStringedString',
        // Joi check for an arity of 3
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        coerce(value: unknown, _state: unknown, _option: unknown): unknown {
            if (typeof(value) === 'string') {
                return value;
            }
            // value was not a string so we need to coerce it, this any is to check if it has toString
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            else if (typeof((value as any)?.toString) === 'function') {
                logger.error(`Non string value ${value} provided to toStringedString, calling toString`);
                // value was not a string so we need to coerce it
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (value as any).toString();
            }
            return value;
        }
    };
};

type RederlyExtendedJoi = typeof Joi & {
    toStringedString: typeof Joi.string;
};

export const RederlyExtendedJoi = Joi.extend([
    JoiToStringedStringConvertible
]) as RederlyExtendedJoi;
