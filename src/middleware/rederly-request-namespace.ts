import cls = require('cls-hooked');
import express = require('express');
import { RederlyExpressRequest } from '../extensions/rederly-express-request';
export const rederlyRequestNamespace = cls.createNamespace('rederly-request-namespace');
import * as core from 'express-serve-static-core';
import * as nodeUrl from 'url';
import { EnumDictionary } from '../utilities/typescript-helpers';
import { v4 as uuidv4 } from 'uuid';
import configurations from '../configurations';

export enum RederlyRequestNamespaceKey {
    userId = 'userId',
    url = 'url',
    requestId = 'requestId'
}

type RederlyRequestNamespaceDump = EnumDictionary<RederlyRequestNamespaceKey, unknown>;
export const rederlyRequestNamespaceWrapper = <P extends core.Params = core.ParamsDictionary, ResBody = unknown, ReqBody = unknown, ReqQuery = core.Query>(handler: express.RequestHandler<P, ResBody, ReqBody, ReqQuery>): express.RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
    return  (...args): void => {
        rederlyRequestNamespace.run(() => {
            const req: RederlyExpressRequest<P, ResBody, ReqBody, ReqQuery> = args[0];
            /**
             * You don't need the url since you can filter by the request id and get to the access log
             * However if you either:
             * 1. turn off access logging
             * 2. have logging level too high that you don't keep access logs
             * 3. are streaming logs and want the url kept with the log to show (i.e. only error logs are sent to slack, therefore you want the info there)
             * So if you want to remove bloat set to false, otherwise set to true
             */
            // 
            // however if you turn
            if (configurations.logging.urlInMeta) {
                const url = nodeUrl.format({
                    protocol: req.protocol,
                    host: req.get('host'),
                    pathname: req.originalUrl
                });
                rederlyRequestNamespace.set(RederlyRequestNamespaceKey.url, url);
            }

            rederlyRequestNamespace.set(RederlyRequestNamespaceKey.userId, req.session?.userId);
            rederlyRequestNamespace.set(RederlyRequestNamespaceKey.requestId, uuidv4());
            handler(...args);    
        });
    };
};

export const rederlyRequestNamespaceMiddleware = rederlyRequestNamespaceWrapper((_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next();
});

export const rederlyRequestNamespaceDump = (): RederlyRequestNamespaceDump => {
    const result: RederlyRequestNamespaceDump = {};
    Object.keys(RederlyRequestNamespaceKey).forEach((key: string) => {
        const typedKey = key as RederlyRequestNamespaceKey;
        result[typedKey] = rederlyRequestNamespace.get(key);
    });
    return result;
};
