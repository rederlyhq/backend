import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

export default class University extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public active!: boolean;
  public universityName!: string;
  public profEmailDomain!: string;
  public studentEmailDomain!: string;
  public verifyInstitutionalEmail!: boolean;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

University.init({
  id: {
    field: 'university_id',
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  active: {
    field: 'university_active',
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  universityName: {
    field: 'university_name',
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  profEmailDomain: {
    field: 'university_prof_email_domain',
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  studentEmailDomain: {
    field: 'university_student_email_domain',
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  verifyInstitutionalEmail: {
    field: 'university_verify_institutional_email',
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
}, {
  tableName: 'university',
  sequelize: appSequelize, // this bit is important
});
