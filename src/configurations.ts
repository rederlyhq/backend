export default {
    server: {
        port: process.env.SERVER_PORT || 3000,
        basePath: process.env.SERVER_BASE_PATH || ''
    },
    db: {
        host: process.env.DB_HOST || 'localhost',
        name: process.env.DB_NAME || 'rederly',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        logging: process.env.DB_LOGGING || false,
    }
}