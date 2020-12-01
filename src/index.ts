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
import { listen } from './server';

(async (): Promise<void> => {
    try {
        // This cannot be below sync otherwise an unhandled rejection is logged and the error is empty
        await configurations.loadPromise;
        await sync();
        await listen();
    } catch (e) {
        logger.error('Could not start up', e);
        // Used a larger number so that we could determine by the error code that this was an application error
        process.exit(87);
    }
})();
