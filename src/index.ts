import configurations from './configurations';
import './extensions';
import logger from './utilities/logger';
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
    await sync();
    await listen();
})();
