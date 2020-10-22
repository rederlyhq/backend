import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

// TODO move this interface into module so other modules can use it
export interface StudentGradeOverrideInterface {
  id: number;
  studentGradeId: number;
  initiatingUserId: number;
  newValue: number;

  createdAt: Date;
  updatedAt: Date;
}

export default class StudentGradeOverride extends Model implements StudentGradeOverrideInterface {
  public id!: number;
  public studentGradeId!: number;
  public initiatingUserId!: number;
  public newValue!: number;
  public active!: boolean;


  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static createAssociations(): void {
    // This is a hack to add the associations later to avoid cyclic dependencies
    /* eslint-disable @typescript-eslint/no-use-before-define */
    StudentGradeOverride.belongsTo(StudentGrade, {
      foreignKey: 'studentGradeId',
      targetKey: 'id',
      as: 'grade'
    });

    StudentGradeOverride.belongsTo(User, {
      foreignKey: 'initiatingUserId',
      targetKey: 'id',
      as: 'initiatingUser'
    });
    /* eslint-enable @typescript-eslint/no-use-before-define */
  }
}

StudentGradeOverride.init({
  id: {
    field: 'student_grade_override_id',
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  studentGradeId: {
    field: 'student_grade_id',
    type: DataTypes.INTEGER,
    allowNull: false
  },
  initiatingUserId: {
    field: 'initiating_user_id',
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  newValue: {
    field: 'student_grade_override_new_value',
    type: DataTypes.FLOAT,
    allowNull: false
  },
  active: {
    field: 'student_grade_override_active',
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
}, {
  tableName: 'student_grade_override',
  sequelize: appSequelize, // this bit is important
});

import StudentGrade from './student-grade';
import User from './user';
