// Database fields are not camel case
/* eslint-disable @typescript-eslint/camelcase */
import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize'
import User from './user';

export default class University extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public university_name!: string;
  public prof_email_domain!: string;
  public student_email_domain!: string;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

University.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    university_name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    prof_email_domain: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    student_email_domain: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  }, {
    tableName: 'university',
    sequelize: appSequelize, // this bit is important
  });

// Here we associate which actually populates out pre-declared `association` static and other methods.
University.hasMany(User, {
  sourceKey: 'id',
  foreignKey: 'university_id',
  as: 'university' // this determines the name in `associations`!
});