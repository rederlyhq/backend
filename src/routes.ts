// This file is just an aggregation of passing the routes to the router
/* eslint-disable @typescript-eslint/no-var-requires */
import express = require('express');
import * as proxy from 'express-http-proxy';
import configurations from './configurations';

const router = express.Router();

router.use('/users', require('./features/users/user-route'));
router.use('/courses', require('./features/courses/course-route'));
router.use('/curriculum', require('./features/curriculum/curriculum-route'));

router.use('/webwork2_files', proxy(configurations.renderer.url));

module.exports = router;
