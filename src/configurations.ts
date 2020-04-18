function fromBooleanField(value: string): boolean {
    return value ? value.toLowerCase() === 'true' : null
}

export default {
    server: {
        port: process.env.SERVER_PORT || '3000',
        basePath: process.env.SERVER_BASE_PATH || ''
    },
    db: {
        host: process.env.DB_HOST || 'localhost',
        name: process.env.DB_NAME || 'rederly',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        logging: fromBooleanField(process.env.DB_LOGGING) || false,
    },
    email: {
        enabled: fromBooleanField(process.env.EMAIL_ENABLED) || false,
        user: process.env.EMAIL_USER || '',
        key: process.env.EMAIL_KEY || '',
        from: process.env.EMAIL_FROM || ''
    }
}