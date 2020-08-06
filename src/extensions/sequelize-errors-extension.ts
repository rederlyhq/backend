import { BaseError } from 'sequelize';

interface SequelizeError extends Error {
    constraint: string;
}

// https://medium.com/my-coding-life/extension-method-in-typescript-66d801488589
declare module 'sequelize/types/lib/errors' {
    export interface BaseError {
        originalAsSequelizeError: SequelizeError;
    }
  }

// https://stackoverflow.com/a/46002557
Object.defineProperty(BaseError.prototype, 'originalAsSequelizeError', {
    get(this: BaseError) {
        // This is an extension on sequelize "original" error which does not have a type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any).original as SequelizeError;
    },
    enumerable: false,
    configurable: true
});
