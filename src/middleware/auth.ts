import Boom = require("boom");
import userController from "../features/users/user-controller";
import logger from "../utilities/logger";
import moment = require("moment");
import passport = require("passport");
import Session from "../database/models/session";
import { Request, Response, NextFunction } from "express";
const LocalStrategy = require('passport-local').Strategy;

export const validateSession = async (uuid: string): Promise<Session> => {
    try {
        const session = await userController.getSession(uuid);
        if (!session) {
            const response = 'Invalid session';
            logger.warn(response);
            throw Boom.unauthorized(response);
        } else {
            const timeNow = moment();
            const expiresAt = moment(session.expires_at);
            if (timeNow.isAfter(expiresAt)) {
                const response = 'Session expired';
                logger.warn(response);
                throw Boom.unauthorized(response);
            } else {
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
        const session = await validateSession(req.cookies.sessionToken);
        //Successful, add the user id to the session
        // TODO figure out session with request
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).session = session;
        return next();
    } catch (err) {
        res.clearCookie('sessionToken');
        return res.redirect(parseInt(err.output.statusCode), '/');
    }
};

passport.serializeUser(async (session: Session, done) => {
    return done(null, session);
});

passport.deserializeUser(async (id: number, done: (err: Boom<null>, user?: unknown) => void): Promise<void> => {
    try {
        const user = userController.getUserById(id);
        return done(null, user);
    } catch (err) {
        return done(err);
    }
});


passport.use(new LocalStrategy({ usernameField: "email" }, async (email: string, password: string, done: (err: Boom<null>, user?: unknown) => void) => {
    // TODO track ip?
    try {
        const session: Session = await userController.login(email, password);
        if (session) {
            done(null, session)
        } else {
            // This could be invalid credentials, not verified, or user not found
            done(Boom.unauthorized('Invalid login'))
        }
    } catch (e) {
        logger.error(e);
        done(Boom.internal());
    }
}));
