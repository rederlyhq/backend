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
            // This has to be a hoisted URL that handles a /login call from the Platform.
            url: 'http://test.rederly.com:3002/backend-api/lti', // Tool Provider URL. Required field.
            name: 'Rederly Tool', // Tool Provider name. Required field.
            logo: 'https://app.rederly.com/rederly-favicon.ico', // Tool Provider logo URL.
            description: 'Rederly Description', // Tool Provider description.
            // redirectUris: [''], // Additional redirection URLs. The main URL is added by default.
            // customParameters: { key: 'value' }, // Custom parameters.
            autoActivate: true // Whether or not dynamically registered Platforms should be automatically activated. Defaults to false.
        }
    }
);

// Set lti launch callback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// lti.onConnect((token: any, req: any, res: any) => {
//     console.log(token);
//     return res.send('It\'s alive!');
// });

lti.deploy({serverless: true}).then(async ()=>{
    const platforms = await lti.getAllPlatforms()
    console.log('LTI connected with existing platforms: ', platforms);
});

export default lti;
