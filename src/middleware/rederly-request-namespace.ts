import cls = require('cls-hooked');
import express = require('express');
import { RederlyExpressRequest } from '../extensions/rederly-express-request';
import * as core from 'express-serve-static-core';
import * as nodeUrl from 'url';

export enum RederlyRequestNamespaceKey {
    userId = 'userId',
    url = 'url',
    requestId = 'requestId'
}


const rederlyRequestNamespace = cls.createNamespace('rederly-request-namespace');
const rederlyRequestNamespaceInterface = {
    get userId(): number | undefined {
        return rederlyRequestNamespace.get(RederlyRequestNamespaceKey.userId);
    },
    set userId(value: number | undefined) {
        rederlyRequestNamespace.set(RederlyRequestNamespaceKey.userId, value);
    },
    get url(): string | undefined {
        return rederlyRequestNamespace.get(RederlyRequestNamespaceKey.url);
    },
    set url(value: string | undefined) {
        rederlyRequestNamespace.set(RederlyRequestNamespaceKey.url, value);
    },
    get requestId(): string | undefined {
        return rederlyRequestNamespace.get(RederlyRequestNamespaceKey.requestId);
    },
    set requestId(value: string | undefined) {
        rederlyRequestNamespace.set(RederlyRequestNamespaceKey.requestId, value);
    },
};

export const rederlyRequestNamespaceSet = <P extends core.Params = core.ParamsDictionary, ResBody = unknown, ReqBody = unknown, ReqQuery = core.Query>(expressReq: express.Request<P, ResBody, ReqBody, ReqQuery>): void => {
    const req = expressReq as RederlyExpressRequest<P, ResBody, ReqBody, ReqQuery>;
    const url = nodeUrl.format({
        protocol: req.protocol,
        host: req.get('host'),
        pathname: req.originalUrl
    });
    
    rederlyRequestNamespaceInterface.url = url;
    rederlyRequestNamespaceInterface.requestId = req.requestId;

    rederlyRequestNamespaceInterface.userId = req.session?.userId;
};

export const rederlyRequestNamespaceWrapper = <P extends core.Params = core.ParamsDictionary, ResBody = unknown, ReqBody = unknown, ReqQuery = core.Query>(handler: express.RequestHandler<P, ResBody, ReqBody, ReqQuery>): express.RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
    return  (...args): void => {
        rederlyRequestNamespace.run(() => {
            const req: RederlyExpressRequest<P, ResBody, ReqBody, ReqQuery> = args[0];
            rederlyRequestNamespaceSet(req);
            handler(...args);    
        });
    };
};

export const rederlyRequestNamespaceMiddleware = rederlyRequestNamespaceWrapper((_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next();
});

export const rederlyRequestNamespaceDump = (): typeof rederlyRequestNamespaceInterface => {
    // TODO deep copy this so that it cannot be set?
    return rederlyRequestNamespaceInterface;
};
