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
import rendererHelper from './utilities/renderer-helper';
import appSequelize from './database/app-sequelize';
import StudentWorkbook from './database/models/student-workbook';

(async (): Promise<void> => {
    await sync();

    logger.info('Playground start');
    await appSequelize.transaction(async () => {
        const workbooks = await StudentWorkbook.findAll();
        console.log(`TOMTOM workbook count: ${workbooks.length}`);
        await workbooks.asyncForEach(async (workbook: StudentWorkbook) => {
            try {
                workbook.submitted = await rendererHelper.cleanSubmitResponseDate(workbook.submitted);
                await workbook.save();
            } catch (e) {
                debugger;
                throw e;
            }
        });
        throw new Error('success');
    });
    logger.info('Playground done');
})();
