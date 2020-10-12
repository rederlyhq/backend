import configurations from '../configurations';
// When changing to import it creates the following compiling error (on instantiation): This expression is not constructable.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sequelize = require('sequelize');
import cls = require('cls-hooked');
import { Constants } from '../constants';
const namespace = cls.createNamespace(Constants.Application.REDERLY_CLS_NAMESPACE_NAME);
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
