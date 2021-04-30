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

lti.onConnect(async (token: any, req: any, res: Response, next: NextFunction) => {
    console.log(token);
    if (_.isNil(token?.userInfo?.email)) {
        return res.send('There is a problem with this LTI connect. No email found.');
    }

    // return res.send('User connected!');
    const user = await User.findOne({
        where: {
            email: token.userInfo.email
        }
    });
    if (_.isNil(user)) {
        return res.send('You do not have a Rederly account.');
    }
    
    const newSession = await userController.createSession(user.id, req.query.ltik);
    const cookietoken = `${newSession.uuid}_${newSession.expiresAt.getTime()}`;
    logger.info(`Setting cookie (${cookietoken}) that expires at ${moment(newSession.expiresAt).calendar()}`);
    res.cookie('sessionToken', cookietoken, {
        expires: newSession.expiresAt,
        domain: 'test.rederly.com',
        sameSite: 'none',
    });

    return lti.redirect(res, token.platformContext?.custom?.redirect ?? token?.platformContext?.targetLinkUri);
  }
);

lti.onDeepLinking(async (token: any, req: any, res: Response) => {
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

lti.whitelist('/platform/new');
lti.app.post('/platform/new', async (req: Request, res: Response, next: any) => {
    const result = await lti.registerPlatform({
        url: 'https://canvas.instructure.com',
        name: 'RedCanvas',
        clientId: '10000000000002',
        authenticationEndpoint:'http://localhost:80/api/lti/authorize_redirect',
        accesstokenEndpoint:'http://localhost:80/login/oauth2/token',
        authConfig: { 
          method: 'JWK_SET', 
          key: 'http://localhost:80/api/lti/security/jwks' }
     });
     console.log(result);
     console.log(result.platformJSON());
     const json = await result.platformJSON();

     const registration = {
        // eslint-disable-next-line @typescript-eslint/camelcase
        application_type: 'web',
        // eslint-disable-next-line @typescript-eslint/camelcase
        response_types: ['id_token'],
        // eslint-disable-next-line @typescript-eslint/camelcase
        grant_types: ['implicit', 'client_credentials'],
        // eslint-disable-next-line @typescript-eslint/camelcase
        initiate_login_uri: lti.loginRoute(),
        // eslint-disable-next-line @typescript-eslint/camelcase
        redirect_uris: [lti.appRoute()],
        // eslint-disable-next-line @typescript-eslint/camelcase
        client_name: 'Rederly Tool',
        // eslint-disable-next-line @typescript-eslint/camelcase
        jwks_uri: lti.keysetRoute(),
        // eslint-disable-next-line @typescript-eslint/camelcase
        logo_uri: 'https://app.rederly.com/rederly-favicon.ico',
        // eslint-disable-next-line @typescript-eslint/camelcase
        token_endpoint_auth_method: 'private_key_jwt',
        scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
        'https://purl.imsglobal.org/spec/lti-tool-configuration': {
        domain: 'test.rederly.com',
        description: 'This is a description, Gib?',
        // eslint-disable-next-line @typescript-eslint/camelcase
        target_link_uri: lti.appRoute(),
        // eslint-disable-next-line @typescript-eslint/camelcase
        //   custom_parameters: this.#customParameters,
        // This one seems like OpenID specific stuff.
        //   claims: configuration.claims_supported,
          messages: [
            { type: 'LtiDeepLinkingRequest' },
            { type: 'LtiResourceLink' }
          ]
        }
      };

     res.json(registration);
});

export default lti;
