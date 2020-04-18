import logger from '../utilities/logger';
import appSequelize from './app-sequelize';

import user from './models/user';
import university from './models/university';

(async () => {
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
    appSequelize
}

export default database;