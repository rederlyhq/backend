import { Request, Response } from "express";
import configurations from '../../configurations';
import userController from "./user-controller";
const router = require('express').Router();
import validate from '../../middleware/joi-validator'
import { registerValidation, loginValidation, verifyValidation } from "./user-route-validation";
import Boom = require("boom");
import passport = require("passport");
import { authenticationMiddleware } from "../../middleware/auth";

router.post('/login',
    validate(loginValidation),
    passport.authenticate('local'),
    async (req: Request, res: Response, next: any) => {
        const newSession = await userController.login(req.body.email, req.body.password);
        if (newSession) {
            const MILLIS_PER_HOUR = 3600000;
            const cookieOptions = {
                maxAge: MILLIS_PER_HOUR // TODO add a configuration for session life
            };
            res.cookie('sessionToken', newSession.uuid, cookieOptions);
            return res.status(200).send(); // TODO create a response    

        } else {
            next(Boom.badRequest('Invalid login'));
        }
    });

router.post('/register',
    validate(registerValidation),
    async (req: Request, res: Response, next: any) => {
        const baseUrl = `${req.protocol}://${req.get('host')}/${configurations.server.basePath}`;
        const newUser = await userController.registerUser({
            userObject: req.body,
            baseUrl
        });
        return res.status(200).json(newUser); // TODO create a response
    });

router.get('/verify',
    validate(verifyValidation),
    (req: Request, res: Response) => {
        return res.status(200).send(); // TODO create a response
    });

router.post('/logout',
    authenticationMiddleware,
    async (req: any, res: Response) => {
        await userController.logout(req.session.dataValues.uuid);
        res.clearCookie('sessionToken');
        return res.status(200).send(); // TODO create a response
    });

module.exports = router;