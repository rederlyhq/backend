import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize';
import User from './user';

export default class Session extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public userId!: number; // Note that the `null assertion` `!` is required in strict mode.
    public uuid!: string;
    public expiresAt!: Date;
    public active!: boolean;

    public getUser!: BelongsToGetAssociationMixin<User>;

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
    userId: {
        field: 'user_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    uuid: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    expiresAt: {
        field: 'expires_at',
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

Session.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'user'
});
