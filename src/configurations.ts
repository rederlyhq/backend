const fromBooleanField = (value: string): boolean => {
    return value ? value.toLowerCase() === 'true' : null
}

const fromIntValue = (value: string, defaultValue: number): number => {
    const result = parseInt(value);
    if(isNaN(result)) {
        return defaultValue;
    }
    return result;
}

export default {
    server: {
        port: process.env.SERVER_PORT || '3000',
        basePath: process.env.SERVER_BASE_PATH || '',
        limiter: {
            windowLength: fromIntValue(process.env.SERVER_LIMITER_WINDOW_LENGTH, 60000),
            maxRequests: fromIntValue(process.env.SERVER_LIMITER_MAX_REQUESTS, 100),
        }
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
    },
    auth: {
        // in hours
        sessionLife: fromIntValue(process.env.AUTH_SESSION_LIFE, 24),
        costFactor: fromIntValue(process.env.AUTH_COST_FACTOR, 8)
    }
}