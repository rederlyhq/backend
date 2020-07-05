import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

export default class Curriculum extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public universityId!: number;
    public name!: string;
    public active!: boolean;
    public public!: boolean;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        Curriculum.hasMany(CurriculumUnitContent, {
            foreignKey: 'curriculumId',
            sourceKey: 'id',
            as: 'units'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

Curriculum.init({
    id: {
        field: 'curriculum_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        field: 'curriculum_name',
        type: DataTypes.TEXT,
        allowNull: false
    },
    subject: {
        field: 'curriculum_subject',
        type: DataTypes.TEXT,
        allowNull: false
    },
    comment: {
        field: 'curriculum_comment',
        type: DataTypes.TEXT,
        allowNull: false
    },
    active: {
        field: 'curriculum_active',
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    public: {
        field: 'curriculum_public',
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
}, {
    tableName: 'curriculum',
    sequelize: appSequelize, // this bit is important
});

import CurriculumUnitContent from './curriculum-unit-content';