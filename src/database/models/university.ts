import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

export default class University extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public universityName!: string;
  public profEmailDomain!: string;
  public studentEmailDomain!: string;

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
  universityName: {
    field: 'university_name',
    type: DataTypes.TEXT,
    allowNull: false,
  },
  profEmailDomain: {
    field: 'prof_email_domain',
    type: DataTypes.TEXT,
    allowNull: false,
  },
  studentEmailDomain: {
    field: 'student_email_domain',
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'university',
  sequelize: appSequelize, // this bit is important
});