import configurations from './configurations';
import logger from './utilities/logger';
import bodyParser = require('body-parser');
import cookieParser = require('cookie-parser');
// Switching to import caused errors
// eslint-disable-next-line @typescript-eslint/no-var-requires
const router = require('./routes');

import express = require('express');
import { Request, Response, NextFunction } from "express";

import morgan = require('morgan');
import passport = require('passport');
import rateLimit = require("express-rate-limit");
import Boom = require('boom');


const { port, basePath } = configurations.server;

const {
    windowLength,
    maxRequests
} = configurations.server.limiter;

const app = express();
app.use(morgan("dev", { stream: { write: (message): void => { logger.info(message) } } }));

const limiter = rateLimit({
    windowMs: windowLength,
    max: maxRequests,
    handler: (req, res, next) => next(Boom.tooManyRequests())
});

app.use(limiter);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));
app.use(cookieParser());

app.use(passport.initialize());

app.use(basePath, router);


//General Exception Handler
// next is a required parameter, without having it requests result in a response of object
// TODO: err is Boom | Error | any, the any is errors that we have to define
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
app.use((obj: any, req: Request, res: Response, next: NextFunction) => {
    if (obj.output) {
        return res.status(obj.output.statusCode).json(obj.output.payload);
    }
    else if (obj.statusCode) {
        return res.status(obj.statusCode).json(obj);
    } else if (obj.status) {
        return res.status(obj.status).json(obj);
    } else {
        logger.error(obj.stack);
        res.status(500).json(obj);
    }
});

export const listen = (): Promise<null> => {
    return new Promise((resolve) => {
        app.listen(port, () => {
            logger.info(`Server started up and listening on port: ${port}`);
            resolve();
        });
    });
}
