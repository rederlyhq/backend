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
        devMode: true
    }
);

// Set lti launch callback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
lti.onConnect((token: any, req: any, res: any) => {
    console.log(token);
    return res.send('It\'s alive!');
});

lti.deploy({serverless: true}).then(()=>console.log('lti deployed?'));

export default lti;
