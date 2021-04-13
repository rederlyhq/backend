import * as _ from 'lodash';
import ForbiddenError from '../../exceptions/forbidden-error';
import RederlyError from '../../exceptions/rederly-error';
import { asyncHandler } from '../../extensions/rederly-express-request';
import courseController from '../../features/courses/course-controller';

export const canUserViewCourse = asyncHandler(async (req, _res, next) => {
    if(_.isNil(req.session) || _.isNil(req.rederlyUser)) {
        throw new ForbiddenError('Viewing a course requires authentication');
    }

    if(_.isNil(req.course)) {
        throw new RederlyError('Middleware requires the course to already have been fetched');
    }

    await courseController.canUserViewCourse({
        course: req.course,
        user: req.rederlyUser,
        rederlyUserRole: req.rederlyUserRole
    });
    
    next(undefined);
});
