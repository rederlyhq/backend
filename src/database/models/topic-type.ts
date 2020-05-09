import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize'

export default class TopicType extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

TopicType.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
}, {
    tableName: 'topic_type',
    sequelize: appSequelize, // this bit is important
});