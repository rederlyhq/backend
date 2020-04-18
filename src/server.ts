import configurations from './configurations';
import bodyParser = require('body-parser');
const router = require('./routes')

import express = require('express');

const { port, basePath } = configurations.server;

const app = express()

app.use(bodyParser.json());

// TODO logger (winston)
// TODO route logger (morgan)
// TODO rate limiter
app.use(basePath, router);

app.listen(port, () => console.log(`Server started up and listening on port: ${port}`))