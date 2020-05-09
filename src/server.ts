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
app.use(morgan("combined", { stream: { write: (message): void => { logger.info(message) } } }));

const limiter = rateLimit({
    windowMs: windowLength,
    max: maxRequests,
    handler: (req, res, next) => next(Boom.tooManyRequests())
});

app.use(limiter);

app.use(bodyParser.json());
app.use(cookieParser());

app.use(passport.initialize());

app.use(basePath, router);


//General Exception Handler
// next is a required parameter, without having it requests result in a response of object
// TODO: err is Boom | Error | any, the any is errors that we have to define
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.warn(err.message);
    if (err.output) {
        return res.status(err.output.statusCode).json(err.output.payload);
    }
    else if (err.statusCode) {
        return res.status(err.statusCode).json(err);
    } else if (err.status) {
        return res.status(err.status).json(err);
    } else {
        res.status(500).json(err);
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
