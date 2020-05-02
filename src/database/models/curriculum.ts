// Database fields are not camel case
/* eslint-disable @typescript-eslint/camelcase */
import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize'

export default class Curriculum extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public university_id!: number;
    public curriculum_name!: string;
    public active!: boolean;
    public public!: boolean;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Curriculum.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    university_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    curriculum_name: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    public: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
}, {
    tableName: 'curriculum',
    sequelize: appSequelize, // this bit is important
});
