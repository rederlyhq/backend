import configurations from '../configurations';

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
