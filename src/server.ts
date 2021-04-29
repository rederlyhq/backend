import configurations from './configurations';
import logger from './utilities/logger';
import bodyParser = require('body-parser');
import cookieParser = require('cookie-parser');
// Switching to import caused errors
// eslint-disable-next-line @typescript-eslint/no-var-requires
const router = require('./routes');

import express = require('express');
import { Request, Response, NextFunction } from 'express';

import morgan = require('morgan');
import passport = require('passport');
import rateLimit = require('express-rate-limit');
import Boom = require('boom');
import AlreadyExistsError from './exceptions/already-exists-error';
import NotFoundError from './exceptions/not-found-error';
import IllegalArgumentException from './exceptions/illegal-argument-exception';
import ForbiddenError from './exceptions/forbidden-error';
import * as _ from 'lodash';
import * as nodeUrl from 'url';
import { rederlyRequestNamespaceMiddleware } from './middleware/rederly-request-namespace';
import { RederlyExpressRequest } from './extensions/rederly-express-request';
import { v4 as uuidv4 } from 'uuid';
import * as fse from 'fs-extra';
import lti from './database/lti-init';
import User from './database/models/user';
import userController from './features/users/user-controller';
import httpResponse from './utilities/http-response';
import moment = require('moment');
import CourseTopicContent from './database/models/course-topic-content';
import CourseUnitContent from './database/models/course-unit-content';
import Course from './database/models/course';

interface ErrorResponse {
    statusCode: number;
    status: string;
    rederlyReference: string;
    error?: unknown;
}

const { port, basePath } = configurations.server;

const {
    windowLength,
    maxRequests
} = configurations.server.limiter;

const app = express();

app.use((req: RederlyExpressRequest, res: unknown, next: NextFunction) => {
    req.requestId = uuidv4();
    next();
});

app.use(morgan((tokens, req, res) => {
    const responseTime = parseInt(tokens['response-time'](req, res) ?? '', 10);
    const shouldWarn = !_.isNumber(responseTime) || responseTime > configurations.server.logAccessSlowRequestThreshold;
    const message = [
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens.res(req, res, 'content-length'), '-',
        responseTime, 'ms'
    ].join(' ');

    return JSON.stringify({
        shouldWarn: shouldWarn,
        responseTime: responseTime,
        message: message
    });
}, {
    stream: {
        write: (message): void => {
            const obj = JSON.parse(message);
            const output = obj.message;
            if (obj.shouldWarn) {
                logger.warn(`Slow request: Access log: ${output}`);
            } else if (configurations.server.logAccess) {
                logger.info(`Access log: ${output}`);
            }
        }
    }
}));

const generatePathRegex = (pathRegex: string): RegExp => new RegExp(`^${basePath}${pathRegex}$`);
const baseUrlRegex = generatePathRegex('.*');

// If these configurations aren't used there is no need to bog down the middlewares
if (configurations.server.logInvalidlyPrefixedRequests || configurations.server.blockInvalidlyPrefixedRequests) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
        const { path: reqPath } = req;
        
        const isInvalid = baseUrlRegex.test(reqPath) === false;

        if (configurations.server.logInvalidlyPrefixedRequests && isInvalid) {
            logger.warn(`A request came in that did not match the baseURL; This could be sign of an intrusion attempt! ${reqPath}`);
        }
    
        if (configurations.server.blockInvalidlyPrefixedRequests && isInvalid) {
            req.socket.end();
        } else {
            next();
        }
    });
}

// Set disable cache headers
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

const rateLimiterWhiteList: Array<RegExp> = [
    // Dev route, comment in if you are using scheduler test routes
    // generatePathRegex('/schedule/hook'),
    generatePathRegex('/courses/assessment/topic/\\d+/submit/\\d+/auto'),
];

const limiter = rateLimit({
    windowMs: windowLength,
    max: maxRequests,
    handler: (_req, _res, next) => next(Boom.tooManyRequests()),
    skip: (req: Request): boolean => {
        const { path: reqPath } = req;

        let result = false;
        rateLimiterWhiteList.some((r: RegExp): boolean => {
            if (r.test(reqPath)) {
                logger.debug(`${reqPath} bypasses rate limiting`);
                result = true;
                // break out of forEach
                return true;
            }
            // keep going
            return false;
        });

        return result;
    }
});

app.use(limiter);

const apiTimeout = configurations.server.requestTimeout;
app.use((req, res, next) => {
    const timeoutHandler = (): void => {
        const url = nodeUrl.format({
            protocol: req.protocol,
            host: req.get('host'),
            pathname: req.originalUrl
        });
        logger.error(`Request timed out ${url}`);
        next(Boom.clientTimeout());
    };

    // Set the timeout for all HTTP requests
    req.setTimeout(apiTimeout, timeoutHandler);
    // Set the server response timeout for all HTTP requests
    res.setTimeout(apiTimeout, timeoutHandler);
    next();
});


app.use(basePath + '/lti', lti.app);

logger.debug(basePath + '/lti');

lti.onConnect(async (token: any, req: any, res: Response, next: any) => {
    console.log(token);
    if (_.isNil(token?.userInfo?.email)) {
        return res.send('There is a problem with this LTI connect. No email found.');
    }

    // return res.send('User connected!');
    const user = await User.findOne({
        where: {
            email: token.userInfo.email
        }
    });
    if (_.isNil(user)) {
        return res.send('You do not have a Rederly account.');
    }
    
    const newSession = await userController.createSession(user.id, req.query.ltik);
    const cookietoken = `${newSession.uuid}_${newSession.expiresAt.getTime()}`;
    logger.info(`Setting cookie (${cookietoken}) that expires at ${moment(newSession.expiresAt).calendar()}`);
    res.cookie('sessionToken', cookietoken, {
        expires: newSession.expiresAt,
        domain: 'test.rederly.com',
        sameSite: 'none',
    });

    return lti.redirect(res, token.platformContext?.custom?.redirect ?? token?.platformContext?.targetLinkUri);
  }
);

lti.onDeepLinking(async (token: any, req: any, res: Response) => {
    const user = await User.findOne({
        where: {
            email: token.userInfo.email
        }
    });

    if (!user) throw new Error('No user found during deep linking');

    const topics = await CourseTopicContent.findAll({
        where: {
            active: true,
        },
        limit: 30,
        include: [{
            model: CourseUnitContent,
            as: 'unit',
            attributes: ['id'],
            required: true,
            where: {
                active: true,
            },
            include: [{
                model: Course,
                as: 'course',
                attributes: ['id'],
                required: true,
                where: {
                    active: true,
                    instructorId: user.id,
                }
            }]
        }]
    });
    
    if (!topics || topics.length < 1) throw new Error('No topics found during deep linking');

    const objs = topics.map((topic) => {
        return ({
            type: 'ltiResourceLink',
            // The URL is supposed to be a fully qualified URL to the resource, but not every route we have is directly accessible via LTI.
            // so instead, we use custom for redirecting.
            // url: `http://test.rederly.com:3002/common/courses/${topic.unit?.course?.id}/topic/${topic.id}`,
            // url: `http://test.rederly.com:3002/backend-api/lti?redir=${encodeURIComponent(`common/courses/${topic.unit?.course?.id}/topic/${topic.id}`)}`,
            url: `http://test.rederly.com:3002/backend-api/lti`,
            custom: {
                redirect: `http://test.rederly.com:3002/common/courses/${topic.unit?.course?.id}/topic/${topic.id}`
            },
            title: topic.name,
            text: topic.description,
            lineItem: {
                scoreMaximum: 100,
                resourceId: topic.id,
            },
            available: {
                startDateTime: topic.startDate.toISOString(),
                // Topics always accessible after end date? Unless exam?
                // endDateTime: topic.endDate.toISOString(),
            },
            submission: {
                startDateTime: topic.startDate.toISOString(),
                endDateTime: topic.endDate.toISOString(),
            }
        });
    });

    const form = await Promise.all(objs.map(async (obj) => `
            <form action="${token.platformContext.deepLinkingSettings.deep_link_return_url}" method="POST">
                <div class="card">
                    <div>${obj.title}</div>
                    <button type="submit" name="JWT" value="${await lti.DeepLinking.createDeepLinkingMessage(token, [obj], { message: `Successfully registered ${obj.title}!` })}" >Select</button>
                </div>
            </form>
        `));

    res.send(`
        <style>
            .cards {
                display: grid;
                grid-template-columns: repeat(auto-fill, 29%);
                grid-auto-rows: auto;
                grid-gap: 1rem;
            }
                
            .card {
                border: 2px solid #e7e7e7;
                border-radius: 4px;
                padding: .5rem;
                text-align: center;
            }
        </style>
        <div class="cards">
            ${form.join('')}
        </div>
    `);

});

// lti.post('/deeplink', async (req: any, res: any, next: any) => {
//     const form = await lti.DeepLinking.createDeepLinkingForm(token, objs, { message: 'Successfully registered resource!' });

//     return res.send(form);
// });

// lti.onDeepLinking((token, req, res) => {
//     // Call redirect function to deep linking view
//     lti.redirect(res, '/courses/');
//   })

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// The line: app.use(bodyParser.json()); clears the namespace for some reason :shrug:
app.use(rederlyRequestNamespaceMiddleware);

app.use(passport.initialize());

app.use(basePath, router);

// This is a developer option, it will be logged as a warning if it is on in production
if (configurations.app.autoDeleteTemp) {
    const tmpFolderPath = './tmp';
    const deleteTmpFolder = async (): Promise<void> => {
        logger.debug('Deleting temp file');
        try {
            await fse.promises.access(tmpFolderPath);
            try {
                await fse.remove(tmpFolderPath);
            } catch (rmError) {
                logger.error(`Removing temp files: could not delete  ${tmpFolderPath}`, rmError);
            }
        } catch (accessError) {
            // This only happens on startup and shutdown
            logger.debug(`Removing temp files: could not access ${tmpFolderPath} (may not have been created)`, accessError);
        }
    };
    /**
     * The on exit handler has to be sync otherwise callbacks never get executed
     */
    const deleteTmpFolderSync = (): void => {
        try {
            logger.debug('Deleting temp file sync');
            try {
                fse.accessSync(tmpFolderPath);
            } catch (e) {
                logger.debug(`Removing temp files: could not access ${tmpFolderPath} (may not have been created)`, e);
            }

            try {
                fse.removeSync(tmpFolderPath);
            } catch (e) {
                logger.error(`Removing temp files: could not delete  ${tmpFolderPath}`, e);
            }
        } catch (e) {
            // Everything should be try catched above, adding extra error handling because uncaught error results in the application staying open
            logger.error('TSNH deleteTmpFolderSync failed', e);
        }
    };
    deleteTmpFolder();
    process.on('exit', deleteTmpFolderSync);
    // request temp file cleanup
    app.use(async (obj: unknown, req: RederlyExpressRequest, _res: Response, next: NextFunction) => {
        if (!_.isNil(req.requestId)) {
            const requestTmpPath = `./tmp/${req.requestId}`;
            try {
                await fse.promises.access(requestTmpPath);
                try {
                    await fse.remove(requestTmpPath);
                } catch (rmError) {
                    logger.error(`Removing temp files: could not delete  ${requestTmpPath}`, rmError);
                }
            } catch {
                // This is extremely common so it is a little more verbose then I want to leave in there
                // logger.debug(`Removing temp files: could not access ${requestTmpPath} (may not have been created)`, accessError);
            }
        }
        next(obj);
    });
}

// General Exception Handler
// next is a required parameter, without having it requests result in a response of object
// TODO: err is Boom | Error | any, the any is errors that we have to define
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
app.use((obj: any, req: Request, res: Response, next: NextFunction) => {
    if (obj instanceof AlreadyExistsError || obj instanceof NotFoundError || obj instanceof IllegalArgumentException) {
        next(Boom.badRequest(obj.message, obj.data));
    } else if (obj instanceof ForbiddenError) {
        next(Boom.forbidden(obj.message, obj.data));
    } else {
        next(obj);
    }
});

// General Exception Handler
// next is a required parameter, without having it requests result in a response of object
// TODO: err is Boom | Error | any, the any is errors that we have to define
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
app.use((obj: any, req: Request, res: Response, next: NextFunction) => {
    if (obj.output) {
        return res.status(obj.output.statusCode).json({
            data: obj.data,
            ...obj.output.payload
        });
    }
    else if (obj.statusCode) {
        return res.status(obj.statusCode).json(obj);
    } else if (obj.status) {
        return res.status(obj.status).json(obj);
    } else {
        const rederlyReference = `rederly-reference-${new Date().getTime()}-${Math.floor(Math.random() * 1000000)}`;
        logger.error(`${rederlyReference} - ${obj.stack}`);
        const data: ErrorResponse = {
            statusCode: 500,
            status: 'Internal Server Error',
            rederlyReference
        };

        if (process.env.NODE_ENV !== 'production') {
            data.error = obj;
        }

        return res.status(data.statusCode).json(data);
    }
});

export const listen = (): Promise<null> => {
    return new Promise<null>((resolve) => {
        app.listen(port, () => {
            logger.info(`Server started up and listening on port: ${port}`);
            resolve(null);
        });
    });
};
