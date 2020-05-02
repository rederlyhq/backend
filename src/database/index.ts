import logger from '../utilities/logger';
import appSequelize from './app-sequelize';

import user from './models/user';
import university from './models/university';
import session from './models/session';

(async (): Promise<void> => {
    try {
        appSequelize.authenticate();
        appSequelize.sync()
    } catch (e) {
        logger.error('Could not init sequelize', e)
    }
})();
const database = {
    user,
    university,
    session,
    appSequelize
}

export default database;