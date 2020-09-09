require('dotenv').config();
import './extensions';
import configurations from './configurations';
// TODO change logger to just use console in this case
import logger from './utilities/logger';
import * as _ from 'lodash';

const enableddMarker = new Array(20).join('*');
const disableddMarker = new Array(20).join('#');
if (configurations.email.enabled) {
    logger.info(`${enableddMarker} EMAIL ENABLED ${enableddMarker}`);
} else {
    logger.info(`${disableddMarker} EMAIL DISABLED ${disableddMarker}`);
}

import { sync } from './database';
import courseController from './features/courses/course-controller';

const syncMissingGrades = async (): Promise<void> => {
    logger.info('Performing missing grade sync');
    await courseController.syncMissingGrades();
    logger.info('done');
};

const commandLookup: {[key: string]: () => unknown} = {
    ['sync-missing-grades']: syncMissingGrades
};

(async (): Promise<void> => {
    await sync();

    logger.info('Running CLI');
    const command = process.argv[2]?.toLowerCase();
    logger.info(`Running command: ${command}`);
    const commandFunction = commandLookup[command];
    if (_.isNil(commandFunction)) {
        logger.error(`"${command}" is not a valid command, it must be one of: ${JSON.stringify(Object.keys(commandLookup))}`);
    } else {
        await commandFunction();
    }
    logger.info('Finished running CLI');
})();
