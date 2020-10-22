require('dotenv').config();
import * as _ from 'lodash';
import { LoggingLevelType, LOGGING_LEVEL } from './utilities/logger-logging-levels';

const fromBooleanField = (value: string | undefined): boolean | null => {
    return value ? value.toLowerCase() === 'true' : null;
};

const fromIntValue = (value: string | undefined, defaultValue: number): number => {
    if (_.isNil(value)) {
        return defaultValue;
    }
    
    const result = parseInt(value, 10);
    if (isNaN(result)) {
        return defaultValue;
    }
    return result;
};

// Defaults to 1 day
const tokenLife = fromIntValue(process.env.AUTH_TOKEN_LIFE, 1440);
const forgotPasswordTokenLife = fromIntValue(process.env.AUTH_FORGOT_PASSWORD_TOKEN_LIFE, tokenLife);
const verifyInstutionalEmailTokenLife = fromIntValue(process.env.AUTH_VERIFY_INSTUTIONAL_EMAIL_TOKEN_LIFE, tokenLife);

// Developer check, would be cool to have a preprocessor strip this code out
if (process.env.NODE_ENV !== 'production') {
    Object.keys(LOGGING_LEVEL).forEach((loggingLevelKey: string) => {
        if (loggingLevelKey !== loggingLevelKey.toUpperCase()) {
            throw new Error('Logging levels constant should be all upper case');
        }
    });
}

const getLoggingLevel = (value: string | undefined, defaultValue: LoggingLevelType | null): LoggingLevelType | null => {
    // Not set
    if (_.isUndefined(value)) {
        return defaultValue;
    }

    if (_.isNull(value) || value === 'null') {
        return null;
    }

    // upper case for case insensitive search (should be validation above to make sure all keys are uppercased)
    value = value.toUpperCase();
    if (Object.keys(LOGGING_LEVEL).indexOf(value) < 0) {
        return defaultValue;
    }

    return LOGGING_LEVEL[value as keyof typeof LOGGING_LEVEL];
};

const loggingLevel = getLoggingLevel(process.env.LOGGING_LEVEL, LOGGING_LEVEL.INFO);
const loggingLevelForFile = getLoggingLevel(process.env.LOGGING_LEVEL_FOR_FILE, loggingLevel);
const loggingLevelForConsole = getLoggingLevel(process.env.LOGGING_LEVEL_FOR_CONSOLE, loggingLevel);

export default {
    server: {
        port: _.defaultTo(process.env.SERVER_PORT, '3000'),
        basePath: _.defaultTo(process.env.SERVER_BASE_PATH, '/backend-api'),
        limiter: {
            windowLength: fromIntValue(process.env.SERVER_LIMITER_WINDOW_LENGTH, 60000),
            maxRequests: fromIntValue(process.env.SERVER_LIMITER_MAX_REQUESTS, 100),
        },
        logAccess: _.defaultTo(fromBooleanField(process.env.SERVER_LOG_ACCESS), true),
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
        costFactor: fromIntValue(process.env.AUTH_COST_FACTOR, 8),
        // in minutes
        // these are specified above because token life is a convenience fallback
        tokenLife,
        forgotPasswordTokenLife,
        verifyInstutionalEmailTokenLife
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
    },
    // If we put logging level in the configurations we have a cyclic dependency if we ever want to log from this file...
    logging: {
        loggingLevel,
        loggingLevelForFile,
        loggingLevelForConsole
    },
    scheduler: {
        basePath: _.defaultTo(process.env.SCHEDULER_BASE_PATH,'http://localhost:3003'),
    }
};
