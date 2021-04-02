import { Request } from 'express';
import * as core from 'express-serve-static-core';
import Course from '../database/models/course';
import Session from '../database/models/session';
import User from '../database/models/user';
import Role from '../features/permissions/roles';

export type DefaultExpressParams = core.ParamsDictionary;
export type DefaultExpressQuery = core.Query;
// This is the default typing in express which we are extending
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RederlyExpressRequest<P extends core.Params = DefaultExpressParams, ResBody = any, ReqBody = any, ReqQuery = DefaultExpressQuery, MetaType = any> extends Request<P, ResBody, ReqBody, ReqQuery> {
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
