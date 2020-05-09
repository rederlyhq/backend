import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize'

export default class Curriculum extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public universityId!: number;
    public name!: string;
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
    universityId: {
        field: 'university_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
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
