import configurations from './configurations';
import logger from './utilities/logger';
import bodyParser = require('body-parser');
const router = require('./routes')

import express = require('express');
import morgan = require('morgan');

const { port, basePath } = configurations.server;

const app = express();
app.use(morgan("combined", { stream: { write: message => logger.info(message) } }));

app.use(bodyParser.json());

// TODO logger (winston)
// TODO route logger (morgan)
// TODO rate limiter
app.use(basePath, router);


//General Exception Handler
app.use((err: any, req: any, res: any, next: any) => {
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

app.listen(port, () => logger.info(`Server started up and listening on port: ${port}`))