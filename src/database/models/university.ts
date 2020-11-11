import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';
import User from './user';

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

  
  static createAssociations(): void {
    // This is a hack to add the associations later to avoid cyclic dependencies
    /* eslint-disable @typescript-eslint/no-use-before-define */
    // // Here we associate which actually populates out pre-declared `association` static and other methods.
    // User.hasMany(Session, {
    //   sourceKey: 'id',
    //   foreignKey: 'user_id',
    //   as: 'user' // this determines the name in `associations`!
    // });

    University.hasMany(User, {
      foreignKey: 'universityId',
      sourceKey: 'id',
      as: 'user'
    });

    /* eslint-enable @typescript-eslint/no-use-before-define */
  }
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
