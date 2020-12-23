import Boom = require('boom');
import userController from '../features/users/user-controller';
import logger from '../utilities/logger';
import moment = require('moment');
import passport = require('passport');
import Session from '../database/models/session';
import { Request, Response, NextFunction } from 'express';
import configurations from '../configurations';
import * as _ from 'lodash';
import RederlyError from '../exceptions/rederly-error';
import { rederlyRequestNamespaceSet } from './rederly-request-namespace';
import { RederlyExpressRequest } from '../extensions/rederly-express-request';
import Role from '../features/permissions/roles';
import ForbiddenError from '../exceptions/forbidden-error';
import { Constants } from '../constants';

const LocalStrategy = require('passport-local').Strategy;

const {
    sessionLife
} = configurations.auth;

export const validateSession = async (token: string, res: Response): Promise<Session> => {
    try {
        const splitToken = token.split('_');
        if(_.isNil(splitToken.first)) {
            throw new RederlyError('TSNH: parsing token failed. string.split returned an empty array');
        }
        const uuid = splitToken.first;
        const session = await userController.getSession(uuid);
        if (!session) {
            const response = 'Invalid session';
            logger.warn(response);
            throw Boom.unauthorized(response);
        } else {
            const timeNow = moment();
            const expiresAt = moment(session.expiresAt);
            if (timeNow.isAfter(expiresAt)) {
                const response = 'Session expired';
                logger.warn(response);
                throw Boom.unauthorized(response);
            } else {
                // Convert to millis (since moment diff returns millis) and divide by 2
                // This is so that we don't update the session on every request, it gets refreshed half way through the session period
                // if a request comes through
                const newSessionDiffThreshold = (sessionLife * 1000 * 60) / 2;
                const timeDiff = expiresAt.diff(moment());
                if (timeDiff < newSessionDiffThreshold) {
                    session.expiresAt = moment().add(sessionLife, 'minute').toDate();
                    await session.save();
                    const cookieOptions = {
                        expires: session.expiresAt
                    };
                    const token = `${session.uuid}_${session.expiresAt.getTime()}`;
                    res.cookie('sessionToken', token, cookieOptions);
                    logger.debug('validateSession: Extended session token');
                } else {
                    logger.debug('validateSession: session token did not need refresh');
                }
                return session;
            }
        }
    } catch (err) {
        if (err.isBoom !== true) {
            logger.error(err);
            throw Boom.internal();
        } else {
            throw err;
        }
    }
};

export const authenticationMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.cookies || !req.cookies.sessionToken) {
        return next(Boom.unauthorized());
    }
    //authenticate cookie
    try {
        const session = await validateSession(req.cookies.sessionToken, res);
        //Successful, add the user id to the session
        // TODO figure out session with request
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).session = session;
        rederlyRequestNamespaceSet(req);
        return next();
    } catch (err) {
        res.clearCookie('sessionToken');
        return res.redirect(parseInt(err.output.statusCode), '/');
    }
};

export const paidMiddleware = (action?: string) => async (req: RederlyExpressRequest, res: unknown, next: NextFunction): Promise<void> => {
    if (_.isNil(req.session)) {
        throw new RederlyError(Constants.ErrorMessage.NIL_SESSION_MESSAGE);
    }
    const triggeringAction = action ?? 'That action';
    const user = req.rederlyUser ?? await req.session.getUser();
    req.rederlyUser = user;
    if (user.roleId === Role.STUDENT || user.paidUntil.toMoment().isAfter(moment())) {
        next();
    } else {
        next(new ForbiddenError(`${triggeringAction} requires a paid account.`));
    }
};

passport.serializeUser(async (session: Session, done) => {
    return done(null, session);
});

passport.deserializeUser(async (id: number, done: (err?: Boom<null> | null, user?: unknown) => void): Promise<void> => {
    try {
        const user = userController.getUser({
            id,
            includeSensitive: true
        });
        return done(null, user);
    } catch (err) {
        return done(err);
    }
});


passport.use(new LocalStrategy({ usernameField: 'email' }, async (email: string, password: string, done: (err?: Boom<null> | null, user?: unknown) => void) => {
    // TODO track ip?
    try {
        const session: Session | null = await userController.login(email, password);
        if (session) {
            done(null, session);
        } else {
            // This could be invalid credentials, not verified, or user not found
            done(Boom.unauthorized('Invalid login'));
        }
    } catch (e) {
        done(e);
    }
}));
