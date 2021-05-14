import User from '../../database/models/user';
import userController from '../../features/users/user-controller';
import httpResponse from '../../utilities/http-response';
import { Request, Response, NextFunction } from 'express';
import moment = require('moment');
import CourseTopicContent from '../../database/models/course-topic-content';
import CourseUnitContent from '../../database/models/course-unit-content';
import Course from '../../database/models/course';
import lti from '../../database/lti-init';
import logger from '../../utilities/logger';
import _ = require('lodash');
import universityController from '../universities/university-controller';
import { authenticationMiddleware } from '../../middleware/auth';
import { updatePasswordValidation, updateNilPasswordValidation } from '../users/user-route-validation';
import { RederlyExpressRequest } from '../../extensions/rederly-express-request';
import { UpdatePasswordRequest } from '../users/user-route-request-types';
import * as asyncHandler from 'express-async-handler';
import validate from '../../middleware/joi-validator';
import userRepository from '../users/user-repository';
import { hashPassword } from '../../utilities/encryption-helper';
import axios from 'axios';
import configurations from '../../configurations';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
lti.onConnect(async (token: any, req: Request, res: Response, _next: NextFunction) => {
    if (_.isNil(token?.userInfo?.email)) {
        return res.send('There is a problem with this LTI connect. No email found.');
    }

    // Find the connecting user based on the email address that the institution uses for LTI.
    let user = await User.findOne({
        where: {
            email: token.userInfo.email
        }
    });

    // If no user is found, create one and assign it to the correct university.
    if (_.isNil(user)) {
        // TODO: Currently, parsing from the email is still how universities get set.
        // Ideally, when registration occurs, we should associate the Platform ID with a University and use the LTIK to pick the university.
        const universityFromEmail = await universityController.getUniversitiesAssociatedWithEmail({ emailDomain: token.userInfo.email.split('@')[1] });

        user = await userController.createUser({
            active: true,
            universityId: universityFromEmail.first?.id,
            // TODO: Convert LTI Roles into Rederly Roles.
            roleId: 0,
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
    logger.info(`Setting cookie (${cookietoken}) that expires at ${moment(newSession.expiresAt).calendar()}`);
    res.cookie('sessionToken', cookietoken, {
        expires: newSession.expiresAt,
        domain: configurations.lti.sameSiteCookiesDomain,
        // Strict can't be used because LMS has a different domain.
        sameSite: 'lax',
    });

    return lti.redirect(res, token.platformContext?.custom?.redirect ?? token?.platformContext?.targetLinkUri);
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
lti.onDeepLinking(async (token: any, _req: Request, res: Response) => {
    const user = await User.findOne({
        where: {
            email: token.userInfo.email
        }
    });

    if (!user) throw new Error('No user found during deep linking');

    const topics = await CourseTopicContent.findAll({
        where: {
            active: true,
        },
        limit: 30,
        include: [{
            model: CourseUnitContent,
            as: 'unit',
            attributes: ['id'],
            required: true,
            where: {
                active: true,
            },
            include: [{
                model: Course,
                as: 'course',
                attributes: ['id'],
                required: true,
                where: {
                    active: true,
                    instructorId: user.id,
                }
            }]
        }]
    });
    
    if (!topics || topics.length < 1) throw new Error('No topics found during deep linking');

    const objs = topics.map((topic) => {
        return ({
            type: 'ltiResourceLink',
            // The URL is supposed to be a fully qualified URL to the resource, but not every route we have is directly accessible via LTI.
            // so instead, we use custom for redirecting.
            // url: `http://test.rederly.com:3002/common/courses/${topic.unit?.course?.id}/topic/${topic.id}`,
            // url: `http://test.rederly.com:3002/backend-api/lti?redir=${encodeURIComponent(`common/courses/${topic.unit?.course?.id}/topic/${topic.id}`)}`,
            url: `http://test.rederly.com:3002/backend-api/lti`,
            custom: {
                redirect: `http://test.rederly.com:3002/common/courses/${topic.unit?.course?.id}/topic/${topic.id}`
            },
            title: topic.name,
            text: topic.description,
            lineItem: {
                scoreMaximum: 100,
                resourceId: topic.id,
            },
            available: {
                startDateTime: topic.startDate.toISOString(),
                // Topics always accessible after end date? Unless exam?
                // endDateTime: topic.endDate.toISOString(),
            },
            submission: {
                startDateTime: topic.startDate.toISOString(),
                endDateTime: topic.endDate.toISOString(),
            }
        });
    });

    const form = await Promise.all(objs.map(async (obj) => `
            <form action="${token.platformContext.deepLinkingSettings.deep_link_return_url}" method="POST">
                <div class="card">
                    <div>${obj.title}</div>
                    <button type="submit" name="JWT" value="${await lti.DeepLinking.createDeepLinkingMessage(token, [obj], { message: `Successfully registered ${obj.title}!` })}" >Select</button>
                </div>
            </form>
        `));

    res.send(`
        <style>
            .cards {
                display: grid;
                grid-template-columns: repeat(auto-fill, 29%);
                grid-auto-rows: auto;
                grid-gap: 1rem;
            }
                
            .card {
                border: 2px solid #e7e7e7;
                border-radius: 4px;
                padding: .5rem;
                text-align: center;
            }
        </style>
        <div class="cards">
            ${form.join('')}
        </div>
    `);
});

lti.onDynamicRegistration(async (req: Request, res: Response, _next: NextFunction) => {
    try {
        if (!req.query.universityId) {
            return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'You must contact Rederly to get a valid University Id.' } });
        }

        if (!req.query.openid_configuration || typeof req.query.openid_configuration !== 'string') {
            return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Your OpenID Configuration is missing.' } });
        }

        const openIdConfig = await axios.get(req.query.openid_configuration);
        const lmsDomain = openIdConfig.data.issuer;

        if (!lmsDomain) {
            return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Your OpenID Configuration is missing an issuer.' } });
        }

        // TODO: Add an LMS Domain or Platform ID or something to the university to match up LTI requests with.
        console.log(lmsDomain);

        const message = await lti.DynamicRegistration.register(req.query.openid_configuration, req.query.registration_token);

        res.setHeader('Content-type', 'text/html');
        res.send(message);
    } catch (err) {
        if (err.message === 'PLATFORM_ALREADY_REGISTERED') {
            return res.status(403).send({ status: 403, error: 'Forbidden', details: { message: 'Platform already registered.' } });
        }
        return res.status(500).send({ status: 500, error: 'Internal Server Error', details: { message: err.message } });
    }
  });

// lti.whitelist('/platform/new');
// lti.app.post('/platform/new', async (_req: Request, res: Response, _next: NextFunction) => {
//     const result = await lti.registerPlatform({
//         url: 'https://canvas.instructure.com',
//         name: 'RedCanvas',
//         clientId: '10000000000002',
//         authenticationEndpoint:'http://localhost:80/api/lti/authorize_redirect',
//         accesstokenEndpoint:'http://localhost:80/login/oauth2/token',
//         authConfig: { 
//           method: 'JWK_SET', 
//           key: 'http://localhost:80/api/lti/security/jwks' }
//      });
//      console.log(result);
//      console.log(result.platformJSON());
//      const json = await result.platformJSON();

//      const registration = {
//         // eslint-disable-next-line @typescript-eslint/camelcase
//         application_type: 'web',
//         // eslint-disable-next-line @typescript-eslint/camelcase
//         response_types: ['id_token'],
//         // eslint-disable-next-line @typescript-eslint/camelcase
//         grant_types: ['implicit', 'client_credentials'],
//         // eslint-disable-next-line @typescript-eslint/camelcase
//         initiate_login_uri: lti.loginRoute(),
//         // eslint-disable-next-line @typescript-eslint/camelcase
//         redirect_uris: [lti.appRoute()],
//         // eslint-disable-next-line @typescript-eslint/camelcase
//         client_name: 'Rederly Tool',
//         // eslint-disable-next-line @typescript-eslint/camelcase
//         jwks_uri: lti.keysetRoute(),
//         // eslint-disable-next-line @typescript-eslint/camelcase
//         logo_uri: 'https://app.rederly.com/rederly-favicon.ico',
//         // eslint-disable-next-line @typescript-eslint/camelcase
//         token_endpoint_auth_method: 'private_key_jwt',
//         scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
//         'https://purl.imsglobal.org/spec/lti-tool-configuration': {
//         domain: 'test.rederly.com',
//         description: 'This is a description, Gib?',
//         // eslint-disable-next-line @typescript-eslint/camelcase
//         target_link_uri: lti.appRoute(),
//         // eslint-disable-next-line @typescript-eslint/camelcase
//         //   custom_parameters: this.#customParameters,
//         // This one seems like OpenID specific stuff.
//         //   claims: configuration.claims_supported,
//           messages: [
//             { type: 'LtiDeepLinkingRequest' },
//             { type: 'LtiResourceLink' }
//           ]
//         }
//       };

//      res.json(registration);
// });


lti.app.put('/update-nil-password',
validate(updateNilPasswordValidation),
asyncHandler(async (req: RederlyExpressRequest<UpdatePasswordRequest.params, unknown, UpdatePasswordRequest.body, UpdatePasswordRequest.query>, res: Response, next: NextFunction) => {
    const hashedPassword = await hashPassword((req.body as any).newPassword);
    await userRepository.updateUser({
        updates: {
            password: hashedPassword
        },
        where: {
            email: res.locals.token.userInfo.email,
            password: '',
        }
    });
    next(httpResponse.Ok('Password updated!'));
}));

export default lti;
