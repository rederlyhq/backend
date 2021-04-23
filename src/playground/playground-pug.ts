import * as pug from 'pug';
import logger from '../utilities/logger';

// Pug playground doesn't specifically need the database.
// import { sync } from '../database';

export const run = async (): Promise<void> => {
    const test = pug.compileFile('assets/emails/verification/html.pug');
    logger.info(test({verifyToken: 'test123'}));
};
