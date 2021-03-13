import configurations from '../configurations';
const lti = require('ltijs').Provider;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LTIDatabase = require('ltijs-sequelize');

const {
    host,
    name,
    user,
    password,
} = configurations.db;

const scopedLTIDB = new LTIDatabase(name, user, password, {
    host: host,
    dialect: 'postgresql',
    schema: 'LTI',
    logging: true,
});

lti.setup('GIB_KEY',
    {
        plugin: scopedLTIDB,
    },
    {
        // appRoute: '/lti',
        // loginRoute: '/lti/login',
        cookies: {
            secure: false,
            sameSite: '',
        },
        devMode: true,
        dynReg: {
            url: 'http://localhost:3001/backend-api/lti', // Tool Provider URL. Required field.
            name: 'Rederly Tool', // Tool Provider name. Required field.
            logo: 'http://app.rederly.com/rederly-logo-offwhite.webp', // Tool Provider logo URL.
            description: 'Rederly Description', // Tool Provider description.
            // redirectUris: [''], // Additional redirection URLs. The main URL is added by default.
            // customParameters: { key: 'value' }, // Custom parameters.
            autoActivate: false // Whether or not dynamically registered Platforms should be automatically activated. Defaults to false.
        }
    }
);

// Set lti launch callback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
lti.onConnect((token: any, req: any, res: any) => {
    console.log(token);
    return res.send('It\'s alive!');
});

lti.deploy({serverless: true}).then(async ()=>{
    const platforms = await lti.getAllPlatforms()
    console.log('LTI connected with existing platforms: ', platforms);
});

export default lti;
