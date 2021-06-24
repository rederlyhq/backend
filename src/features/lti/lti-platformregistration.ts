import { Request, Response, NextFunction } from 'express';
import lti from '../../database/lti-init';
import validate from '../../middleware/joi-validator';
import { postPlaformNew } from './lti-route-validation';
import configurations from '../../configurations';
import { RederlyExpressRequest } from '../../extensions/rederly-express-request';
import { PostPlaformNewRequest } from './lti-route-request-types';

lti.onDynamicRegistration(async (req: Request, res: Response, _next: NextFunction) => {
    try {
        // TODO: Replace with auto-generated security token
        if (!req.query.universityId) {
            return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'You must contact Rederly to get a valid University Id.' } });
        }

        if (!req.query.openid_configuration || typeof req.query.openid_configuration !== 'string') {
            return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Your OpenID Configuration is missing.' } });
        }

        // TODO: This code grabs the issuer from the LTIK. It should be removed when university mapping is integrated into the flow.
        // const openIdConfig = await axios.get(req.query.openid_configuration);
        // const lmsDomain = openIdConfig.data.issuer;

        // if (!lmsDomain) {
        //     return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Your OpenID Configuration is missing an issuer.' } });
        // }

        // TODO: Add an LMS Domain or Platform ID or something to the university to match up LTI requests with.
        // There is a feat request in LTIJS v6 for better linking from .register. https://github.com/Cvmcosta/ltijs/issues/109
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

// This will be an Admin-only route, where university admins can upload their LTI configurations for setup.
lti.whitelist('/platform/new');
lti.app.post('/platform/new', 
    validate(postPlaformNew),
    async (req: RederlyExpressRequest<PostPlaformNewRequest.params, unknown, PostPlaformNewRequest.body, PostPlaformNewRequest.query>, res: Response, _next: NextFunction) => {
        const result = await lti.registerPlatform({
            url: req.body.url,
            name: req.body.name,
            clientId: req.body.clientId,
            authenticationEndpoint: req.body.authenticationEndpoint,
            accesstokenEndpoint: req.body.accesstokenEndpoint,
            authConfig: { 
                method: 'JWK_SET', 
                key: req.body.authConfigKey,
            }
        });

        // TODO: Link to req.user's university

        // This may not be necessary and could be replaced with a 200 OK.
        const json = await result.platformJSON();
        res.json(json);
    }
);


// https://canvas.instructure.com/doc/api/file.tools_variable_substitutions.html
const generateCanvasJSON = (): object => {
    const template = {
        'title': 'Rederly Tool',
        'description': 'Rederly Mathematics.',
        'privacy_level': 'public',
        'oidc_initiation_url': `${configurations.app.baseDomain}/backend-api/lti/login`,
        'target_link_uri': `${configurations.app.baseDomain}/backend-api/lti`,
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
                'domain': `${configurations.app.baseDomain}`,
                'tool_id': 'rederly-tool-0.1',
                // TODO: Is this valid across all Canvas installs?
                'platform': 'canvas.instructure.com',
                'settings': {
                    'text': 'Launch Rederly',
                    'icon_url': `${configurations.app.baseDomain}/rederly-favicon.ico`,
                    'selection_height': 800,
                    'selection_width': 800,
                    'placements': [
                        {
                            'text': 'Select Rederly Topic',
                            'enabled': true,
                            'icon_url': `${configurations.app.baseDomain}/rederly-favicon.ico`,
                            'placement': 'assignment_selection',
                            'message_type': 'LtiDeepLinkingRequest',
                            'target_link_uri': `${configurations.app.baseDomain}/backend-api/lti`,
                            'selection_height': 500,
                            'selection_width': 500
                        }
                    ]
                }
            }
        ],
        'public_jwk_url': `${configurations.app.baseDomain}/backend-api/lti/keys`,
        'custom_fields': {
            'userinfoemail': '$Person.email.primary'
        }
    };

    return template;
};

// This endpoint can be given to Canvas when setting up an LTI Key with the "JSON Url" option.
lti.whitelist('/platform/canvas');
lti.app.all('/platform/canvas', async (_req: Request, res: Response, _next: NextFunction) => {
    res.json(generateCanvasJSON());
});
