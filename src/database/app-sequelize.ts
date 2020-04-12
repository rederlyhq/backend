import configurations from '../configurations';
const Sequelize = require('sequelize');

const {
    host,
    name,
    user,
    password,
    logging,
} = configurations.db;

const appSequelize = new Sequelize(name, user, password, {
    host,
    dialect: 'postgres',
    logging,
    define: {
        timestamps: true,
    },
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    }
});

export default appSequelize;