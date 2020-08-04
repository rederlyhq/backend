import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize'

export default class Permission extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public roleName!: string;
    public permissionName!: string;
    public permissionDescription!: string;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Permission.init({
    id: {
        field: 'permission_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    roleName: {
        field: 'permission_role_name',
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true
    },
    permissionDescription: {
        field: 'permission_description',
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ''
    },
    // TODO role name should be permission name, this is an artifact of the additional table after implementation
    permissionName: {
        field: 'permission_name',
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ''
    },
}, {
    tableName: 'permission',
    sequelize: appSequelize, // this bit is important
});
