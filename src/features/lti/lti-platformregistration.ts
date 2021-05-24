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

// https://canvas.instructure.com/doc/api/file.tools_variable_substitutions.html
const generateCanvasJSON = () => {
    const template = {
        'title': 'Rederly Tool',
        'description': 'Rederly Mathematics.',
        'privacy_level': 'public',
        'oidc_initiation_url': 'http://test.rederly.com:3002/backend-api/lti/login',
        'target_link_uri': 'http://test.rederly.com:3002/backend-api/lti',
        'scopes': [
            'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
            'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
            'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
            'https://purl.imsglobal.org/spec/lti-ags/scope/score',
            'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
            'https://canvas.instructure.com/lti/public_jwk/scope/update',
            'https://canvas.instructure.com/lti/account_lookup/scope/show',
            'https://canvas.instructure.com/lti/data_services/scope/show',
            'https://canvas.instructure.com/lti/data_services/scope/create',
            'https://canvas.instructure.com/lti/data_services/scope/update'
        ],
        'extensions': [
            {
                'domain': 'test.rederly.com:3002',
                'tool_id': 'rederly-tool-0.1',
                'platform': 'canvas.instructure.com',
                'settings': {
                    'text': 'Launch Rederly',
                    'icon_url': 'http://app.rederly.com/rederly-favicon.ico',
                    'selection_height': 800,
                    'selection_width': 800,
                    'placements': [
                        {
                            'text': 'Select Rederly Topic',
                            'enabled': true,
                            'icon_url': 'http://app.rederly.com/rederly-favicon.ico',
                            'placement': 'assignment_selection',
                            'message_type': 'LtiDeepLinkingRequest',
                            'target_link_uri': 'http://test.rederly.com:3002/backend-api/lti',
                            'selection_height': 500,
                            'selection_width': 500
                        }
                    ]
                }
            }
        ],
        'public_jwk_url': 'http://test.rederly.com:3002/backend-api/lti/keys',
        'custom_fields': {
            'userinfoemail': '$Person.email.primary'
        }
    };

    return template;
};

// TODO: This will be an Admin-only route, where university admins can upload their LTI configurations for setup.
lti.whitelist('/platform/new');
lti.app.post('/platform/new', async (_req: Request, res: Response, _next: NextFunction) => {
    const result = await lti.registerPlatform({
        url: 'https://canvas.instructure.com',
        name: 'RedCanvas',
        clientId: '10000000000003',
        authenticationEndpoint:'http://canvas.docker/api/lti/authorize_redirect',
        accesstokenEndpoint:'http://canvas.docker/login/oauth2/token',
        authConfig: { 
          method: 'JWK_SET', 
          key: 'http://canvas.docker/api/lti/security/jwks' }
     });
     console.log(result);
     console.log(result.platformJSON());
     const json = await result.platformJSON();
     console.log(json);

     const canvasJson = generateCanvasJSON();
     res.json(canvasJson);
});

lti.whitelist('/platform/canvas');
lti.app.all('/platform/canvas', async (_req: Request, res: Response, _next: NextFunction) => {
    res.json(generateCanvasJSON());
});
