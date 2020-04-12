
import appSequelize from './app-sequelize';

import user from './models/user';

(async () => {
    try {
        appSequelize.authenticate();
        appSequelize.sync()    
    } catch (e) {
        // TODO logger
        console.error('Could not init sequelize', e)
    }
})();
const database = {
    user,
    appSequelize
}

export default database;