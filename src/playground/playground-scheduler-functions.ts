import schedulerHelper, { HttpMethod } from '../utilities/scheduler-helper';
import * as moment from 'moment';
import logger from '../utilities/logger';

const sleep = (millis: number): Promise<void> => new Promise(resolve => setTimeout(resolve, millis));

export const schedulerTest = async ({
    staticSchedulerDelay,
    schedulerDelayInMinute,
    requestDelayMillis,
    iterations,
}: {
    staticSchedulerDelay: boolean;
    schedulerDelayInMinute: number;
    requestDelayMillis: number;
    iterations: number;
}): Promise<void> => {
    // if staticSchedulerDelay is true then use the same time for all requests
    let time = moment().add(schedulerDelayInMinute, 'minute').toDate();
    const resultPromises: Array<Promise<unknown>> = []; 
    for (let i = 0; i < iterations; i++) {
        if (!staticSchedulerDelay) {
            // recalculate from current time
            time = moment().add(schedulerDelayInMinute, 'minute').toDate();
        }
        try {
            const currentTimeString = new Date().toString();
            const id = `Iteration: ${i}; Date: ${currentTimeString}`;
            logger.info(id);
            const resultPromise = schedulerHelper.setJob({
                id: id,
                time: time,
                webHookScheduleEvent: {
                    method: HttpMethod.POST,
                    url: 'http://172.17.0.1:3001/backend-api/schedule/hook',
                    data: {
                        id: id,
                        expectedExecutionTime: time.toString(),
                        currentTime: currentTimeString
                    }
                }
            });
            await sleep(requestDelayMillis);
            resultPromise.then((data: any) => {
                console.log(data.data);
            });
            resultPromises.push(resultPromise);
        } catch (e) {
            logger.error(e.message);
        }
    }
    await Promise.all(resultPromises);
};

export const testTwoWaves = async (): Promise<unknown> => {
    logger.info('RUNNING FIRST WAVE!');
    // We don't want to await this because we want the second wave to occur precisely
    const firstWavePromise = schedulerTest({
        staticSchedulerDelay: true,
        schedulerDelayInMinute: 10,
        requestDelayMillis: 0,
        iterations: 5000,
    });
    logger.info('DONE RUNNING FIRST WAVE!');
    await sleep(1000*60*10); // 1k millis per second, 60 seconds per minute, 10 minutes
    logger.info('RUNNING SECOND WAVE!');
    const secondWavePromise = schedulerTest({
        staticSchedulerDelay: true,
        schedulerDelayInMinute: 10,
        requestDelayMillis: 0,
        iterations: 5000,
    });
    logger.info('DONE RUNNING SECOND WAVE!');
    return Promise.all([firstWavePromise, secondWavePromise]);
};

export const testImmediateTurnAround = async (): Promise<void> => {
    await schedulerTest({
        staticSchedulerDelay: true,
        schedulerDelayInMinute: 0,
        requestDelayMillis: 0,
        iterations: 5000,
    });
};

export const testConsistentRequests = async (): Promise<unknown> => {
    return schedulerTest({
        staticSchedulerDelay: false,
        schedulerDelayInMinute: 1,
        requestDelayMillis: 10000, // 10 seconds between request
        iterations: 60, // 60 requests, with the above this is 600 seconds == 10 minutes
    });
};
