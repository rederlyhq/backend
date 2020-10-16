import configurations from './configurations';
import './extensions';
// TODO change logger to just use console in this case
import logger from './utilities/logger';
import * as moment from 'moment';

const enableddMarker = new Array(20).join('*');
const disableddMarker = new Array(20).join('#');
if (configurations.email.enabled) {
    logger.info(`${enableddMarker} EMAIL ENABLED ${enableddMarker}`);
} else {
    logger.info(`${disableddMarker} EMAIL DISABLED ${disableddMarker}`);
}

import { sync } from './database';
import schedulerHelper, { HttpMethod } from './utilities/scheduler-helper';

(async (): Promise<void> => {
    await sync();

    logger.info('Playground start');
    const resultPromises: Array<Promise<unknown>> = []; 
    for (let i = 0; i < 100; i++) {
        try {
            // const time = moment().toDate();
            const time = moment().add(1, 'minute').toDate();
            const id = `Iteration: ${i}; Date: ${new Date().toString()}`;
            logger.info(id);
            const resultPromise = schedulerHelper.setJob({
                id: id,
                time: time,
                webHookScheduleEvent: {
                    method: HttpMethod.POST,
                    url: 'http://172.17.0.1:3001/backend-api/schedule/hook',
                    data: {
                        id: id,
                        time: time,
                    }
                }
            });
            resultPromise.then((data: any) => {
                console.log(data.data);
            });
            resultPromises.push(resultPromise);
        } catch (e) {
            logger.error(e.message);
        }
    }
    await Promise.all(resultPromises);
    logger.info('Playground done');
})();
