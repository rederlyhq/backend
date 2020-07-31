import { Request } from "express";
import * as core from "express-serve-static-core";
import Session from "../database/models/session";

export interface RederlyExpressRequest<P extends core.Params = core.ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = core.Query> extends Request<P , ResBody, ReqBody, ReqQuery> {
    session?: Session & {
        passport: {
            user: Session;
        };
        dataValues: Session;
    };
}
