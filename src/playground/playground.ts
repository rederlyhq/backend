import configurations from '../configurations';
import '../extensions';
// TODO change logger to just use console in this case
import logger from '../utilities/logger';
import '../global-error-handlers';

const enabledMarker = new Array(20).join('*');
const disabledMarker = new Array(20).join('#');
if (configurations.email.enabled) {
    logger.info(`${enabledMarker} EMAIL ENABLED ${enabledMarker}`);
} else {
    logger.info(`${disabledMarker} EMAIL DISABLED ${disabledMarker}`);
}

import { sync } from '../database';


(async (): Promise<void> => {
    try {
        await sync();
        logger.info('Playground start');
        logger.info('Playground done');
    } catch (e) {
        logger.error(`Could not start up ${e}`);
        // Used a larger number so that we could determine by the error code that this was an application error
        process.exit(87);
    }
})();
