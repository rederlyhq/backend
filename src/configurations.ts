import * as _ from 'lodash';

const fromBooleanField = (value: string): boolean => {
    return value ? value.toLowerCase() === 'true' : null;
};

const fromIntValue = (value: string, defaultValue: number): number => {
    const result = parseInt(value);
    if (isNaN(result)) {
        return defaultValue;
    }
    return result;
};

export default {
    server: {
        port: _.defaultTo(process.env.SERVER_PORT, '3000'),
        basePath: _.defaultTo(process.env.SERVER_BASE_PATH, '/backend-api'),
        limiter: {
            windowLength: fromIntValue(process.env.SERVER_LIMITER_WINDOW_LENGTH, 60000),
            maxRequests: fromIntValue(process.env.SERVER_LIMITER_MAX_REQUESTS, 100),
        }
    },
    db: {
        host: _.defaultTo(process.env.DB_HOST, 'localhost'),
        name: _.defaultTo(process.env.DB_NAME, 'rederly'),
        user: _.defaultTo(process.env.DB_USER, 'postgres'),
        password: _.defaultTo(process.env.DB_PASSWORD, 'password'),
        logging: _.defaultTo(fromBooleanField(process.env.DB_LOGGING), false),
    },
    email: {
        enabled: _.defaultTo(fromBooleanField(process.env.EMAIL_ENABLED), false),
        user: _.defaultTo(process.env.EMAIL_USER, ''),
        key: _.defaultTo(process.env.EMAIL_KEY, ''),
        from: _.defaultTo(process.env.EMAIL_FROM, '')
    },
    auth: {
        // in hours
        sessionLife: fromIntValue(process.env.AUTH_SESSION_LIFE, 24),
        costFactor: fromIntValue(process.env.AUTH_COST_FACTOR, 8)
    },
    renderer: {
        url: _.defaultTo(process.env.RENDERER_URL, 'http://localhost:3000'),
    },
    jira: {
        email: _.defaultTo(process.env.JIRA_EMAIL, ''),
        apiKey: _.defaultTo(process.env.JIRA_API_KEY, ''),
        host: _.defaultTo(process.env.JIRA_HOST, 'rederly.atlassian.net'),
        protocol: _.defaultTo(process.env.JIRA_PROTOCOL, 'https'),
        strictSSL: _.defaultTo(fromBooleanField(process.env.JIRA_STRICT_SSL), true),
        apiVersion: _.defaultTo(process.env.JIRA_API_VERSION, '2'),
        projectKey: _.defaultTo(process.env.JIRA_PROJECT_KEY, 'RS'),
    }
};
