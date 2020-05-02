// Database fields are not camel case
/* eslint-disable @typescript-eslint/camelcase */
import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize'

export default class Permission extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public role_name!: string;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Permission.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    role_name: {
        type: DataTypes.TEXT,
        allowNull: false
    },
}, {
    tableName: 'permission',
    sequelize: appSequelize, // this bit is important
});

