import logger from './utilities/logger';

/**
 * ANY ON ERROR HANDLING
 * In javascript you can throw anything, it doesn't have to necessarily be an exception
 * To get the most amount of data it makes sense to use the stack if it's there
 * However if it's not we just resort to the reference itself
 * TODO:
 * If the reference is an object you simply get "[object Object]"
 * In the future we should JSON.stringify the error however we need to limit the depth of the object in case there is a circular reference
 */

// See ANY ON ERROR HANDLING comment above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('unhandledRejection', (error: any) => {
    logger.error(`An unhandled rejection occurred "${error?.stack ?? error}"`);
});

// See ANY ON ERROR HANDLING comment above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('uncaughtException', (error: any) => {
    logger.error(`An uncaught error occurred "${error?.stack ?? error}"`);
});
