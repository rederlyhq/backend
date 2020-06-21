require('dotenv').config();
import './extensions';
import configurations from './configurations';
// TODO change logger to just use console in this case
import logger from './utilities/logger';

const enableddMarker = new Array(20).join('*');
const disableddMarker = new Array(20).join('#');
if (configurations.email.enabled) {
    logger.info(`${enableddMarker} EMAIL ENABLED ${enableddMarker}`);
} else {
    logger.info(`${disableddMarker} EMAIL DISABLED ${disableddMarker}`);
}

import { sync } from './database';
import courseController from './features/courses/course-controller';

(async (): Promise<void> => {
    await sync();

    logger.info('Performing missing grade sync');
    await courseController.syncMissingGrades();
    logger.info('done');
})();
