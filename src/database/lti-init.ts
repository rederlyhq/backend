import configurations from '../configurations';
import logger from '../utilities/logger';
const lti = require('ltijs').Provider;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LTIDatabase = require('ltijs-sequelize');

const {
    host,
    name,
    user,
    password,
    logging
} = configurations.db;

const scopedLTIDB = new LTIDatabase(name, user, password, {
    host: host,
    dialect: 'postgresql',
    schema: configurations.lti.schema,
    logging: logging,
});

lti.setup(configurations.lti.secret,
    {
        plugin: scopedLTIDB,
    },
    {
        cookies: {
            secure: configurations.lti.useSecureCookies,
            sameSite: 'none',
        },
        devMode: configurations.lti.devMode,
        dynReg: {
            // This has to be a hoisted URL that handles a /login call from the Platform.
            url: configurations.lti.dynUrl, // Tool Provider URL. Required field.
            name: configurations.lti.dynName, // Tool Provider name. Required field.
            logo: configurations.lti.dynLogo, // Tool Provider logo URL.
            description: configurations.lti.dynDescription, // Tool Provider description.
            // redirectUris: [''], // Additional redirection URLs. The main URL is added by default.
            // customParameters: { key: 'value' }, // Custom parameters.
            autoActivate: configurations.lti.dynAutoActivate // Whether or not dynamically registered Platforms should be automatically activated. Defaults to false.
        }
    }
);

lti.deploy({serverless: true}).then(async ()=>{
    if (configurations.lti.devMode) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const platforms: any[] = await lti.getAllPlatforms();

        platforms.asyncForEach(async (platform) => {
            logger.info(`${await platform.platformUrl()} (${await platform.platformName()})`);
        });
    }
});

export default lti;
