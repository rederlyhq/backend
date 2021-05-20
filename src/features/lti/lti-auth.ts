import User from '../../database/models/user';
import userController from '../../features/users/user-controller';
import httpResponse from '../../utilities/http-response';
import { Request, Response, NextFunction } from 'express';
import moment = require('moment');
import lti from '../../database/lti-init';
import logger from '../../utilities/logger';
import _ = require('lodash');
import universityController from '../universities/university-controller';
import { updateNilPasswordValidation } from '../users/user-route-validation';
import { RederlyExpressRequest } from '../../extensions/rederly-express-request';
import { UpdatePasswordRequest } from '../users/user-route-request-types';
import * as asyncHandler from 'express-async-handler';
import validate from '../../middleware/joi-validator';
import userRepository from '../users/user-repository';
import { hashPassword } from '../../utilities/encryption-helper';
import configurations from '../../configurations';
import StudentEnrollment from '../../database/models/student-enrollment';
import { LTIKToken } from './lti-types';
import Role from '../permissions/roles';

const autoEnrollOnConnect = async (token: LTIKToken, user: User): Promise<[StudentEnrollment, boolean] | null> => {
    const dest = token.platformContext?.custom?.redirect ?? token?.platformContext?.targetLinkUri;
    const courseToEnrollIn = dest.match(/courses\/(\d+)/)[1];
    const courseId = parseInt(courseToEnrollIn, 10);

    if (courseId <= 0) {
        logger.debug('No course id found in LTI launch request, skipping autoenrollment.');
        return null;
    }

    return await StudentEnrollment.findOrCreate({
        where: {
            courseId: courseId,
            userId: user.id
        },
    });
};

lti.onConnect(async (token: LTIKToken, req: Request, res: Response, _next: NextFunction) => {
    if (_.isNil(token?.userInfo?.email)) {
        return res.send('There is a problem with this LTI connect. No email found.');
    }
    // TODO: Session.email == ltik.email
    // Find the connecting user based on the email address that the institution uses for LTI.
    let user = await User.findOne({
        where: {
            email: token.userInfo.email.toLowerCase()
        }
    });

    // If no user is found, create one and assign it to the correct university.
    if (_.isNil(user)) {
        // TODO: Currently, parsing from the email is still how universities get set.
        // Ideally, when registration occurs, we should associate the Platform ID with a University and use the LTIK to pick the university.
        const universityFromEmail = await universityController.getUniversitiesAssociatedWithEmail({ emailDomain: token.userInfo.email.split('@')[1] });

        // TODO: Send email so actuallyVerified gets set.
        user = await userController.createUser({
            active: true,
            universityId: universityFromEmail.first?.id,
            // TODO: Convert LTI Roles into Rederly Roles.
            roleId: Role.STUDENT,
            firstName: token.userInfo.given_name,
            lastName: token.userInfo.family_name,
            email: token.userInfo.email,
            password: '',
            verified: true,
            actuallyVerified: false,
        });
    }
    
    if (typeof req.query.ltik !== 'string') {
        return res.send('Invalid LTIK.');
    }

    // The ltik on the query is a string representation of the JSON token in scope.
    const newSession = await userController.createSession(user.id, req.query.ltik);
    const cookietoken = `${newSession.uuid}_${newSession.expiresAt.getTime()}`;

    // TODO: Consider moving cookieoptions to a Constant.
    logger.info(`Setting cookie (${cookietoken}) for ${configurations.lti.sameSiteCookiesDomain} that expires at ${moment(newSession.expiresAt).calendar()}`);
    res.cookie('sessionToken', cookietoken, {
        expires: newSession.expiresAt,
        domain: configurations.lti.sameSiteCookiesDomain,
        // Strict can't be used because LMS has a different domain. Lax also seems to fail.
        sameSite: 'none',
    });

    // If LTI allows a student to launch a resource, we are assuming the student should be enrolled in that course.
    if (user.roleId === Role.STUDENT) {
        autoEnrollOnConnect(token, user);
    }

    // TODO: This can be initiated earlier, and it'll be a longer request.
    const response = await lti.NamesAndRoles.getMembers(res.locals.token);
    console.log(response);
    const result = await lti.NamesAndRoles.getMembers(res.locals.token, { resourceLinkId: true, role: 'Learner', limit: 1, pages: 1 });
    console.log(result);

    return lti.redirect(res, token.platformContext?.custom?.redirect ?? token?.platformContext?.targetLinkUri);
  }
);


lti.app.put('/update-nil-password',
validate(updateNilPasswordValidation),
asyncHandler(async (req: RederlyExpressRequest<UpdatePasswordRequest.params, unknown, UpdatePasswordRequest.body, UpdatePasswordRequest.query>, res: Response, next: NextFunction) => {
    const hashedPassword = await hashPassword((req.body as any).newPassword);
    await userRepository.updateUser({
        updates: {
            password: hashedPassword
        },
        where: {
            email: (res.locals.token as LTIKToken).userInfo.email.toLowerCase(),
            password: '',
        }
    });
    next(httpResponse.Ok('Password updated!'));
}));

export default lti;
