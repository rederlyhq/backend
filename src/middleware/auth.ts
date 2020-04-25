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
        res.clearCookie('sessionToken');
        return res.redirect(parseInt(err.output.statusCode), '/');
    }
};


export const validateSession = async (uuid: string) => {
    try {
        let session = await userController.getSession(uuid);
        if (!session) {
            let response = 'Invalid session';
            logger.warn(response);
            throw Boom.unauthorized(response);
        } else {
            let timeNow = moment();
            let expiresAt = moment(session.expires_at);
            if (timeNow.isAfter(expiresAt)) {
                const response = 'Session expired';
                logger.warn(response);
                throw Boom.unauthorized(response);
            } else {
                return session;
            }
        }
    } catch (err) {
        if(err.isBoom !== true) {
            logger.error(err);
            throw Boom.internal();    
        } else {
            throw err;
        }
    }
};

passport.serializeUser(async (session: any, done) => {
    return done(null, session);
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
