import configurations from './configurations';
const router = require('./routes')

import express = require('express');

const { port, basePath } = configurations.server;

const app = express()

// TODO logger (winston)
// TODO route logger (morgan)
// TODO rate limiter
app.use(basePath, router);

app.listen(port, () => console.log(`Server started up and listening on port: ${port}`))