/**
 * This file is just an aggregation of passing the routes to the router
 */
import * as express from 'express';
import { router as userRouter } from './features/users/user-route';
import { router as courseRouter } from './features/courses/course-route';
import { router as healthRouter } from './features/health/health-route';
import { router as curriculumRouter } from './features/curriculum/curriculum-route';
import { router as supportRouter } from './features/support/support-route';
import { router as utilityRouter } from './features/utility/utility-route';

export const router = express.Router();

router.use('/users', userRouter);
router.use('/courses', courseRouter);
router.use('/health', healthRouter);
router.use('/curriculum', curriculumRouter);
router.use('/support', supportRouter);
router.use('/utility', utilityRouter);
