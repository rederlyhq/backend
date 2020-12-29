require('dotenv').config();
import * as _ from 'lodash';
import RederlyError from './exceptions/rederly-error';
import { LoggingLevelType, LOGGING_LEVEL } from './utilities/logger-logging-levels';
let logs: Array<string> | null = [];

const fromBooleanField = (value: string | undefined | null): boolean | null => {
    switch (value?.toLowerCase()) {
        case 'true':
            return true;
        case 'false':
            return false;
        default:
            return null;
    }
};

const fromIntValue = (value: string | undefined | null): number | null => {
    if (_.isNil(value)) {
        return null;
    }
    
    const result = parseInt(value, 10);
    if (isNaN(result)) {
        return null;
    }
    return result;
};

const generateLog = (key: string, value: string | undefined, defaultValue: unknown): string => `Configuration for [${key}] not recognized with value [${value}] using default value [${defaultValue}]`;

function readStringValue(key: string, defaultValue: string): string;
function readStringValue(key: string, defaultValue?: string | null | undefined): string | null;
function readStringValue(key: string, defaultValue?: string | null | undefined): string | null {
    const rawValue = process.env[key];
    const value = rawValue;
    if (_.isNil(value)) {
        logs?.push(generateLog(key, value, defaultValue));
        return defaultValue ?? null;
    }
    return value;
};

function readIntValue(key: string, defaultValue: number): number;
function readIntValue(key: string, defaultValue?: number | null | undefined): number | null;
function readIntValue(key: string, defaultValue?: number | null | undefined): number | null {
    const rawValue = process.env[key];
    const value = fromIntValue(rawValue);
    if (_.isNil(value)) {
        logs?.push(generateLog(key, rawValue, defaultValue));
        return defaultValue ?? null;
    }
    return value;
};

function readBooleanValue(key: string, defaultValue: boolean): boolean;
function readBooleanValue(key: string, defaultValue?: boolean | null | undefined): boolean | null;
function readBooleanValue(key: string, defaultValue?: boolean | null | undefined): boolean | null {
    const rawValue = process.env[key];
    const value = fromBooleanField(rawValue);
    if (_.isNil(value)) {
        logs?.push(generateLog(key, rawValue, defaultValue));
        return defaultValue ?? null;
    }
    return value;
};

// Defaults to 1 day
const tokenLife = readIntValue('AUTH_TOKEN_LIFE', 1440);
const forgotPasswordTokenLife = readIntValue('AUTH_FORGOT_PASSWORD_TOKEN_LIFE', tokenLife);
const verifyInstutionalEmailTokenLife = readIntValue('AUTH_VERIFY_INSTUTIONAL_EMAIL_TOKEN_LIFE', tokenLife);

// Developer check, would be cool to have a preprocessor strip this code out
if (process.env.NODE_ENV !== 'production') {
    Object.keys(LOGGING_LEVEL).forEach((loggingLevelKey: string) => {
        if (loggingLevelKey !== loggingLevelKey.toUpperCase()) {
            throw new Error('Logging levels constant should be all upper case');
        }
    });
}

const getLoggingLevel = (key: string, defaultValue: LoggingLevelType | null): LoggingLevelType | null => {
    let rawValue = process.env[key];
    // Not set
    if (_.isUndefined(rawValue)) {
        logs?.push(generateLog(key, rawValue, defaultValue));
        return defaultValue;
    }

    // Explicit not set
    if (rawValue === 'null') {
        return null;
    }

    // upper case for case insensitive search (should be validation above to make sure all keys are uppercased)
    rawValue = rawValue.toUpperCase();
    if (Object.keys(LOGGING_LEVEL).indexOf(rawValue) < 0) {
        logs?.push(generateLog(key, rawValue, defaultValue));
        return defaultValue;
    }

    return LOGGING_LEVEL[rawValue as keyof typeof LOGGING_LEVEL];
};

const loggingLevel = getLoggingLevel('LOGGING_LEVEL', LOGGING_LEVEL.INFO);
const loggingLevelForFile = getLoggingLevel('LOGGING_LEVEL_FOR_FILE', loggingLevel);
const loggingLevelForConsole = getLoggingLevel('LOGGING_LEVEL_FOR_CONSOLE', loggingLevel);

const nodeEnv = readStringValue('NODE_ENV', 'development');
// needs to be read ahead of of time to be used in configurations
const isProduction = nodeEnv === 'production';

const configurations = {
    server: {
        port: readStringValue('SERVER_PORT', '3000'),
        basePath: readStringValue('SERVER_BASE_PATH', '/backend-api'),
        limiter: {
            windowLength: readIntValue('SERVER_LIMITER_WINDOW_LENGTH', 60000),
            maxRequests: readIntValue('SERVER_LIMITER_MAX_REQUESTS', 100),
        },
        requestTimeout: readIntValue('SERVER_REQUEST_TIMEOUT', 150000),
        logAccess: readBooleanValue('SERVER_LOG_ACCESS', true),
        logInvalidlyPrefixedRequests: readBooleanValue('SERVER_LOG_INVALIDLY_PREFIXED_REQUESTS', true),
        blockInvalidlyPrefixedRequests: readBooleanValue('SERVER_BLOCK_INVALIDLY_PREFIXED_REQUESTS', true),
        logAccessSlowRequestThreshold: readIntValue('SERVER_LOG_ACCESS_SLOW_REQUEST_THRESHOLD', 30000),
    },
    db: {
        host: readStringValue('DB_HOST', 'localhost'),
        name: readStringValue('DB_NAME', 'rederly'),
        user: readStringValue('DB_USER', 'postgres'),
        password: readStringValue('DB_PASSWORD', 'password'),
        logging: readBooleanValue('DB_LOGGING', false),
        sync: readBooleanValue('DB_SYNC', false),
    },
    email: {
        enabled: readBooleanValue('EMAIL_ENABLED', false),
        user: readStringValue('EMAIL_USER', ''),
        key: readStringValue('EMAIL_KEY', ''),
        from: readStringValue('EMAIL_FROM', ''),
        awsAccessKeyId: readStringValue('AWS_SES_ACCESS_KEY', ''),
        awsSecretKey: readStringValue('AWS_SES_SECRET_KEY', ''),
        awsRegion: readStringValue('AWS_REGION', 'us-east-2'),
        sendingRate: readIntValue('EMAIL_SENDING_RATE'),
    },
    auth: {
        // in minutes - defaults to 1 day
        sessionLife: readIntValue('AUTH_SESSION_LIFE', 1440),
        costFactor: readIntValue('AUTH_COST_FACTOR', 8),
        // in minutes
        // these are specified above because token life is a convenience fallback
        tokenLife,
        forgotPasswordTokenLife,
        verifyInstutionalEmailTokenLife
    },
    renderer: {
        url: readStringValue('RENDERER_URL', 'http://localhost:3000'),
        requestTimeout: readIntValue('RENDERER_REQUEST_TIMEOUT', 75000),
    },
    openlab: {
        url: readStringValue('OPENLAB_URL', ''),
        requestTimeout: readIntValue('OPENLAB_REQUEST_TIMEOUT', 75000)
    },
    jira: {
        email: readStringValue('JIRA_EMAIL', ''),
        apiKey: readStringValue('JIRA_API_KEY', ''),
        host: readStringValue('JIRA_HOST', 'rederly.atlassian.net'),
        protocol: readStringValue('JIRA_PROTOCOL', 'https'),
        strictSSL: readBooleanValue('JIRA_STRICT_SSL', true),
        apiVersion: readStringValue('JIRA_API_VERSION', '2'),
        projectKey: readStringValue('JIRA_PROJECT_KEY', 'RS'),
    },
    // If we put logging level in the configurations we have a cyclic dependency if we ever want to log from this file...
    logging: {
        loggingLevel,
        loggingLevelForFile,
        loggingLevelForConsole,
        urlInMeta: readBooleanValue('LOGGING_URL_IN_META', false),
        metaInLogs: readBooleanValue('LOGGING_META_IN_LOGS', false),
        logJson: readBooleanValue('LOGGING_LOG_JSON', isProduction),
    },
    scheduler: {
        basePath: readStringValue('SCHEDULER_BASE_PATH','http://localhost:3003'),
        schedulerRequestTimeout: readIntValue('SCHEDULER_REQUEST_TIMEOUT', 60000),
        schedulerResponseTimeout: readIntValue('SCHEDULER_RESPONSE_TIMEOUT', 180000),
    },
    attachments: {
        presignedUrlBaseUrl: readStringValue('ATTACHMENTS_PRESIGNED_URL_BASE_URL', ''),
        presignedUrlBasePath: readStringValue('ATTACHMENTS_PRESIGNED_URL_BASE_PATH', ''),
        baseUrl: readStringValue('ATTACHMENTS_BASE_URL', ''),
        presignedUrlTimeout: readIntValue('ATTACHMENTS_PRESIGNED_URL_TIMEOUT', 60000),
    },
    app: {
        nodeEnv: nodeEnv,
        isProduction: isProduction,
        logMissingConfigurations: readBooleanValue('LOG_MISSING_CONFIGURATIONS', true),
        failOnMissingConfigurations: readBooleanValue('FAIL_ON_MISSING_CONFIGURATIONS', isProduction),
        autoDeleteTemp: readBooleanValue('AUTO_DELETE_TEMP_FILES', true)
    },
    importer: {
        missingFileThreshold: readIntValue('IMPORTER_MISSING_FILE_THRESHOLD', 10)
    },
    loadPromise: new Promise<void>((resolve, reject) => {
        // Avoid cyclic dependency by deferring the logging until after all the imports are done
        setTimeout(() => {
            // Can't use require statement in callback
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const logger = require('./utilities/logger').default;
            // THIS IS FOR DEBUGGING, DO NOT COMMIT UNCOMMENTED
            // logger.info(JSON.stringify(configurations, null, 2));

            if (_.isNil(logs)) {
                logger.error('configuration logs nil before reading');
            } else if (configurations.app.logMissingConfigurations) {
                logs.forEach((log: string) => {
                    logger.warn(log);
                });
            }

            if (configurations.app.isProduction && !configurations.app.autoDeleteTemp) {
                logger.warn('Application configured to run in production but not to auto delete temp files! AUTO_DELETE_TEMP_FILES should always be true unless debugging!!');
            }            
            
            // Log count defaults to 1 so it fails on null which has already been logged
            if (configurations.app.failOnMissingConfigurations && (logs?.length ?? 1 > 0)) {
                return reject(new RederlyError(`Missing configurations:\n${logs?.join('\n') ?? 'Logs are null'}`));
            } else {
                resolve();
            }
            // After we log the warnings we can drop the logs, figured it would cause cleanup
            logs = null;
        });
    })
};

export default configurations;
