import { Sequelize, Model, DataTypes, BuildOptions, HasOneGetAssociationMixin } from 'sequelize';
import { HasManyGetAssociationsMixin, HasManyAddAssociationMixin, HasManyHasAssociationMixin, Association, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'
import University from './university';

export default class User extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public university_id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public verify_token?: string;

  public getUniversity!: HasOneGetAssociationMixin<University>;

  public readonly university!: University;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    university_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    username: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    password: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    verify_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'users',
    sequelize: appSequelize, // this bit is important
  });

