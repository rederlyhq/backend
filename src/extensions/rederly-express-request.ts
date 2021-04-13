import { RequestHandler, Request, Response } from 'express';
import * as core from 'express-serve-static-core';
import Course from '../database/models/course';
import Session from '../database/models/session';
import User from '../database/models/user';
import Role from '../features/permissions/roles';

export interface TypedNextFunction<ArgumentType = unknown> {
    (arg: ArgumentType): void;
}

export type DefaultExpressParams = core.ParamsDictionary;
export type DefaultExpressQuery = core.Query;

// There is a constraint on the types that they have 
export type EmptyExpressParams = {};
export type EmptyExpressQuery = {};

type DictionaryDefault = {} | unknown | never;

// This is the default typing in express which we are extending
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RederlyExpressRequest<P extends DictionaryDefault = DictionaryDefault, ResBody = any, ReqBody = any, ReqQuery extends DictionaryDefault = DictionaryDefault, MetaType = any> extends Request<P, ResBody, ReqBody, ReqQuery> {
    session?: Session & {
        passport: {
            user: Session;
        };
        dataValues: Session;
    };
    rederlyUser?: User;
    rederlyUserRole?: Role;
    // Any information already defined in the request
    meta?: MetaType;
    requestId?: string;
    course?: Course;
}

// export const asyncHandler = <P extends {} = {}, ResBody = unknown, ReqBody = unknown, ReqQuery extends {} = {}>(requestHandler: RequestHandler<P, ResBody, ReqBody, ReqQuery>): RequestHandler<P, ResBody, ReqBody, ReqQuery> => async (...args): Promise<void> => {
//     const next = args[2];
//     try {
//         await requestHandler(...args);
//     } catch (e) {
//         next(e);
//     }
// };

// export const asyncHandler = <P extends {} = {}, ResBody = unknown, ReqBody = unknown, ReqQuery extends {} = {}>(requestHandler: RequestHandler<P, ResBody, ReqBody, ReqQuery>): RequestHandler<P, ResBody, ReqBody, ReqQuery> => async (...args): Promise<void> => {
//     const next = args[2];
//     try {
//         await requestHandler(...args);
//     } catch (e) {
//         next(e);
//     }
// };

export interface RederlyRequestHandler<P extends {} = {}, ResBody = unknown, ReqBody = unknown, ReqQuery extends {} = {}> {
    // tslint:disable-next-line callable-types (This is extended from and can't extend from a type alias in ts<2.2)
    (req: RederlyExpressRequest<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: TypedNextFunction<ResBody>): void;
}

export const asyncHandler = <P extends {} = {}, ResBody = unknown, ReqBody = unknown, ReqQuery extends {} = {}>(requestHandler: RederlyRequestHandler<P, ResBody, ReqBody, ReqQuery>): RequestHandler => async (req, res, next): Promise<void> => {
    try {
        await requestHandler(req as any, res, next);
    } catch (e) {
        next(e);
    }
};
