// This file is just an aggregation of passing the routes to the router
/* eslint-disable @typescript-eslint/no-var-requires */
import express = require('express');
const router = express.Router();

router.use('/users', require('./features/users/user-route'));
router.use('/courses', require('./features/courses/course-route'));
router.use('/health', require('./features/health/health-route'));
router.use('/curriculum', require('./features/curriculum/curriculum-route'));
router.use('/support', require('./features/support/support-route'));
router.use('/utility', require('./features/utility/utility-route'));
router.use('/universities', require('./features/universities/university-route'));
// Dev routes for testing the scheduler, if your using this remember to uncomment the white lister for it as well in server.ts limiter
// router.use('/schedule', require('./scheduler-routes'));

module.exports = router;
