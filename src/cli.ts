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
import appSequelize from './database/app-sequelize';
import StudentWorkbook from './database/models/student-workbook';
import rendererHelper from './utilities/renderer-helper';

const syncMissingGrades = async (): Promise<void> => {
    logger.info('Performing missing grade sync');
    await courseController.syncMissingGrades();
    logger.info('done');
};

const cleanupWorkbooks = async (): Promise<void> => {
    await appSequelize.transaction(async () => {
        const workbooks = await StudentWorkbook.findAll();
        logger.info(`Workbook count: ${workbooks.length}`);
        await workbooks.asyncForEach(async (workbook: StudentWorkbook) => {
            try {
                workbook.submitted = await rendererHelper.cleanSubmitResponseDate(workbook.submitted);
                
                // Form data can be anything, furthermore this is temporary since it is just for cleanup purposes, cleaning up some null bytes from an old version of the renderer
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const formData = (workbook.submitted.form_data as any);
                if (typeof(formData.submitAnswers) === 'string') {
                    formData.submitAnswers = formData.submitAnswers.substring(0, formData.submitAnswers.indexOf('\0'));
                }
                if (typeof(formData.format) === 'string') {
                    formData.format = formData.format.substring(0, formData.format.indexOf('\0'));
                }

                delete workbook.submitted.renderedHTML;

                await workbook.save();
            } catch (e) {
                // Right now if there is an error we need to check it out
                debugger;
                throw e;
            }
        });
        // This error is just to make sure the transaction does not commit
        throw new Error('success');
    });
};

const commandLookup: {[key: string]: () => unknown} = {
    ['sync-missing-grades']: syncMissingGrades,
    ['cleanup-workbooks']: cleanupWorkbooks
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
