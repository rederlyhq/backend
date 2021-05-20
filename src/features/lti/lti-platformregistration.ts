import { Request, Response, NextFunction } from 'express';
import lti from '../../database/lti-init';
import axios from 'axios';

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
        // There is a feat request n LTIJS v6 for better linking from .register. https://github.com/Cvmcosta/ltijs/issues/109
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

// TODO: This will be an Admin-only route, where university admins can upload their LTI configurations for setup.
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
