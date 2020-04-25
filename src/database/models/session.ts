import { Sequelize, Model, DataTypes, BuildOptions } from 'sequelize';
import { HasManyGetAssociationsMixin, HasManyAddAssociationMixin, HasManyHasAssociationMixin, Association, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'
import User from './user';

export default class Session extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public user_id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public uuid!: string;
    public expires_at!: Date;
    public active!: boolean;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Session.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    uuid: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
}, {
    tableName: 'session',
    sequelize: appSequelize, // this bit is important
});
