// Database fields are not camel case
/* eslint-disable @typescript-eslint/camelcase */
import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize'
import User from './user';

export default class Course extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public curriculum_id!: number;
    public instructor_id!: number;
    public university_id!: number;
    public course_name!: string;
    public course_code!: string;
    public course_start!: Date;
    public course_end!: Date;
    public section_code!: string;
    public semester_code!: string;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Course.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    curriculum_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    instructor_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    university_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    course_name: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    course_code: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    course_start: {
        type: DataTypes.DATE,
        allowNull: false
    },
    course_end: {
        type: DataTypes.DATE,
        allowNull: false
    },
    section_code: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    semester_code: {
        type: DataTypes.TEXT,
        allowNull: false
    },
}, {
    tableName: 'course',
    sequelize: appSequelize, // this bit is important
});

Course.belongsTo(User, {
    foreignKey: 'instructor_id',
    targetKey: 'id',
    as: 'instructor'
  });
