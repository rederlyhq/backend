// Do not export this, it is just for compilation validation
type InternalLoggingLevelEnumType = {
    [key: string]: LoggingLevelType;
};

// Winston would also allow us to define custom logging levels if we saw fit
// https://github.com/winstonjs/winston#logging
export const LOGGING_LEVEL = {
    ERROR: {
        key: 'error',
        value: 0,
    },
    WARN: {
        key: 'warn',
        value: 1
    },
    INFO: {
        key: 'info',
        value: 2,
    },
    HTTP: {
        key: 'http',
        value: 3,
    },
    VERBOSE: {
        key: 'verbose',
        value: 4,
    },
    DEBUG: {
        key: 'debug',
        value: 5,
    },
    SILLY: {
        key: 'silly',
        value: 6,
    }
};

export type LoggingLevelType = {
    key: string;
    value: number;
};



// This line fails compilation if the structure of the object is incorrect
// If we add this to the variable the type will be a generic dictionary rather than a finite object like an enum
LOGGING_LEVEL as InternalLoggingLevelEnumType;

// export type LOGGING_LEVEL_TYPE = typeof LOGGING_LEVEL;
