import configurations from '../configurations';
import '../extensions';
// TODO change logger to just use console in this case
import logger from '../utilities/logger';
import '../global-error-handlers';
import * as pug from 'pug';

const enabledMarker = new Array(20).join('*');
const disabledMarker = new Array(20).join('#');
if (configurations.email.enabled) {
    logger.info(`${enabledMarker} EMAIL ENABLED ${enabledMarker}`);
} else {
    // logger.info(`${disabledMarker} EMAIL DISABLED ${disabledMarker}`);
}

import { sync } from '../database';


(async (): Promise<void> => {
    // logger.info('Playground start');
    const test = pug.compileFile('src/email-templates/verification.pug');
    console.log(test({verifyToken: 'test123'}))
    // logger.info('Playground done');
})();
