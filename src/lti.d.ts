declare module 'ltijs-sequelize' {
    export class Database {
        /**
         * @description Sequelize plugin constructor
         * @param {String} database - Database name
         * @param {String} user - Auth user
         * @param {String} pass - Auth password
         * @param {Object} options - Sequelize options
         */
        constructor (database: string, user: string, pass: string, options: import('sequelize').Options);
    }
}

declare module 'ltijs' {
    export class Provider {}
}
