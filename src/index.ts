require('dotenv').config();
import './extensions';
import configurations from './configurations';
import logger from './utilities/logger';
const enableddMarker = new Array(20).join('*');
const disableddMarker = new Array(20).join('#');
if (configurations.email.enabled) {
    logger.info(`${enableddMarker} EMAIL ENABLED ${enableddMarker}`);
} else {
    logger.info(`${disableddMarker} EMAIL DISABLED ${disableddMarker}`);
}

import { sync } from './database';
import { listen } from './server';

(async (): Promise<void> => {
    await sync();
    await listen();
})();
