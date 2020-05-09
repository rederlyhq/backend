import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize'

export default class Permission extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public roleName!: string;

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
    roleName: {
        field: 'role_name',
        type: DataTypes.TEXT,
        allowNull: false
    },
}, {
    tableName: 'permission',
    sequelize: appSequelize, // this bit is important
});

