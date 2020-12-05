// This is first a foremost a no op script
// it can be used for initializing the database but it is not intended to be fully configured
// Forcing these configuration options
process.env.LOG_MISSING_CONFIGURATIONS='false';
process.env.FAIL_ON_MISSING_CONFIGURATIONS='false';

import configurations from './configurations';
import './extensions';
import logger from './utilities/logger';
import './global-error-handlers';

const enabledMarker = new Array(20).join('*');
const disabledMarker = new Array(20).join('#');
if (configurations.email.enabled) {
    logger.info(`${enabledMarker} EMAIL ENABLED ${enabledMarker}`);
} else {
    logger.info(`${disabledMarker} EMAIL DISABLED ${disabledMarker}`);
}

import { sync } from './database';
import './server';

(async (): Promise<void> => {
    try {
        const firstArg = process.argv[2];
        if (firstArg === 'sync') {
            logger.info(`${enabledMarker} "${firstArg}" === "sync"; Running sync ${enabledMarker}`);
            await sync();
        } else {
            logger.info(`${disabledMarker} "${firstArg}" !== "sync"; Skipping sync ${disabledMarker}`);
        }    
    } catch (e) {
        logger.error('Could not start up', e);
        // Used a larger number so that we could determine by the error code that this was an application error
        process.exit(87);
    }
})();
