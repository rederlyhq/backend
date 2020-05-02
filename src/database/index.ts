import logger from '../utilities/logger';
import appSequelize from './app-sequelize';

import user from './models/user';
import university from './models/university';
import session from './models/session';
import permission from './models/permission';
import course from './models/course';

export const sync = async (): Promise<void> => {
    try {
        await appSequelize.authenticate();
        await appSequelize.sync()
    } catch (e) {
        logger.error('Could not init sequelize', e)
    }
};

const database = {
    user,
    university,
    session,
    permission,
    course,
    appSequelize
}

export default database;