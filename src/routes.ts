// This file is just an aggregation of passing the routes to the router
/* eslint-disable @typescript-eslint/no-var-requires */
import express = require('express');
const router = express.Router();

router.use('/users', require('./features/users/user-route'));
router.use('/courses', require('./features/courses/course-route'));
router.use('/health', require('./features/health/health-route'));
router.use('/curriculum', require('./features/curriculum/curriculum-route'));
router.use('/support', require('./features/support/support-route'));

module.exports = router;
