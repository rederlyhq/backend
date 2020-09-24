import configurations from '../configurations';
// When changing to import it creates the following compiling error (on instantiation): This expression is not constructable.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sequelize = require('sequelize');
import cls = require('cls-hooked');
const namespace = cls.createNamespace('rederly-backend-api');
Sequelize.useCLS(namespace);

const {
    host,
    name,
    user,
    password,
    logging,
} = configurations.db;

// Sequelize requires it like this
module.exports = {
    username: user,
    password: password,
    database: name,
    host,
    dialect: 'postgres',
    logging,
    define: {
        timestamps: true,
        underscored: true
    },
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    },
};
