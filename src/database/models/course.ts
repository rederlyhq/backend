import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

export default class Course extends Model {
    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        Course.belongsTo(User, {
            foreignKey: 'instructorId',
            targetKey: 'id',
            as: 'instructor'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }

    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public curriculumId!: number;
    public instructorId!: number;
    public universityId!: number;
    public name!: string;
    public code!: string;
    public start!: Date;
    public end!: Date;
    public sectionCode!: string;
    public semesterCode!: string;

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
    curriculumId: {
        field: 'curriculum_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    instructorId: {
        field: 'instructor_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    universityId: {
        field: 'university_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    code: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    start: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end: {
        type: DataTypes.DATE,
        allowNull: false
    },
    sectionCode: {
        field: 'section_code',
        type: DataTypes.TEXT,
        allowNull: false
    },
    semesterCode: {
        field: 'semester_code',
        type: DataTypes.TEXT,
        allowNull: false
    },
}, {
    tableName: 'course',
    sequelize: appSequelize, // this bit is important
});

import User from './user';
