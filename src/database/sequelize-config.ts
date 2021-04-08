import configurations from '../configurations';
// When changing to import it creates the following compiling error (on instantiation): This expression is not constructable.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sequelize = require('sequelize');
import cls = require('cls-hooked');
import { Constants } from '../constants';
import logger from '../utilities/logger';
import winston = require('winston');
const namespace = cls.createNamespace(Constants.Application.REDERLY_CLS_NAMESPACE_NAME);
Sequelize.useCLS(namespace);
// import { format } from 'sql-formatter';

function formatter(): winston.LeveledLogMethod | ((sql: string) => void) {
    if (process.env.NODE_ENV === 'production') {
        logger.warn('SQL Logging isn\'t prettified in production.');
        return logger.debug;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { format } = require('sql-formatter');

    return ((sqlString: string): void => console.log(format(sqlString, {
        language: 'postgresql', // Defaults to "sql" (see the above list of supported dialects)
        indent: '    ', // Defaults to two spaces
        uppercase: true, // Defaults to false
    })));
}

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
    logging: logging && formatter(),
    define: {
        timestamps: true,
        underscored: true
    },
    pool: {
        max: 150,
        min: 0,
        idle: 10000
    },
};
