import Boom = require("boom");
import userController from "../features/users/user-controller";
import logger from "../utilities/logger";
import moment = require("moment");
import passport = require("passport");
import Session from "../database/models/session";
const LocalStrategy = require('passport-local').Strategy;

export const authenticationMiddleware = async (req: any, res: any, next: any) => {
    if (!req.cookies || !req.cookies.sessionToken) {
        return next(Boom.unauthorized());
    }
    //authenticate cookie
    try {
        let session = await validateSession(req.cookies.sessionToken);
        //Successful, add the user id to the session
        req.session = session;
        return next();
    } catch (err) {
        res.clearCookie('sessionId');
        return res.redirect(parseInt(err.statusCode), '/');
        // //if the session is invalid clear the cookie and redirect to login
        // if (err.statusCode === 401) {
        //     res.clearCookie('sessionId');
        //     return res.redirect(parseInt(err.statusCode), '/');
        // } else {
        //     return res.status(err.statusCode).json(err);
        // }
    }
};


export const validateSession = async (uuid: string) => {
    try {
        let session = await userController.getSession(uuid);
        if (!session) {
            let response = 'Invalid session';
            logger.warn(response);
            return Promise.reject(Boom.unauthorized('Invalid session'));
        } else {
            let timeNow = moment();
            let expiresAt = moment(session.expires_at);
            if (timeNow.isAfter(expiresAt)) {
                const response = 'Session expired';
                logger.warn(response);
                return Promise.reject(response);
            } else {
                return Promise.resolve(session);
            }
        }
    } catch (err) {
        return Promise.reject(err);
    }
};

passport.serializeUser(async (user: any, done) => {
    try {
        const session = await userController.createSession(user.id);
        return done(null, session);
    } catch (err) {
        return done(err, null);
    }
});

passport.deserializeUser(async (id: number, done) => {
    try {
        let user = userController.getUserById(id);
        return done(null, user);
    } catch (err) {
        return done(err);
    }
});


passport.use(new LocalStrategy({ usernameField: "email" }, async (email: string, password: string, done: any) => {
    // TODO track ip?
    const session: Session = await userController.login(email, password);
    if (session) {
        done(null, session)
    } else {
        done('error')
    }
}));
