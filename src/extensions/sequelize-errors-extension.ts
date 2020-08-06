import { BaseError } from 'sequelize';

interface SequelizeOriginalError extends Error {
    constraint: string;
}

// https://medium.com/my-coding-life/extension-method-in-typescript-66d801488589
declare module 'sequelize/types/lib/errors' {
    export interface BaseError {
        originalAsSequelizeError: SequelizeOriginalError;
        fields?: { [fieldName: string]: string};
        original?: Error;
    }
  }

// https://stackoverflow.com/a/46002557
Object.defineProperty(BaseError.prototype, 'originalAsSequelizeError', {
    get(this: BaseError) {
        return this.original as SequelizeOriginalError;
    },
    enumerable: false,
    configurable: true
});
