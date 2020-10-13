import configurations from './configurations';
import './extensions';
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
import courseRepository from './features/courses/course-repository';

(async (): Promise<void> => {
    await sync();

    logger.info('Playground start');
    const existingTopic = await courseRepository.getCourseTopic({
        id: 2245
    });
    console.log(existingTopic);
    logger.info('Playground done');
})();
