// This file is just an aggregation of passing the routes to the router
/* eslint-disable @typescript-eslint/no-var-requires */
import express = require('express');

const router = express.Router();

router.use('/users', require('./features/users/user-route'));
router.use('/courses', require('./features/courses/course-route'));
router.use('/curriculum', require('./features/curriculum/curriculum-route'));

module.exports = router;
