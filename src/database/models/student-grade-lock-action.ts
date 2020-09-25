import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

// TODO move this interface into module so other modules can use it
export interface StudentGradeLockActionInterface {
  id: number;
  studentGradeId: number;
  initiatingUserId: number;
  newValue: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export default class StudentGradeLockAction extends Model implements StudentGradeLockActionInterface {
  public id!: number;
  public studentGradeId!: number;
  public initiatingUserId!: number;
  public newValue!: boolean;
  public active!: boolean;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static createAssociations(): void {
    // This is a hack to add the associations later to avoid cyclic dependencies
    /* eslint-disable @typescript-eslint/no-use-before-define */
    StudentGradeLockAction.belongsTo(StudentGrade, {
      foreignKey: 'studentGradeId',
      targetKey: 'id',
      as: 'grade'
    });

    StudentGradeLockAction.belongsTo(User, {
      foreignKey: 'initiatingUserId',
      targetKey: 'id',
      as: 'initiatingUser'
    });
    /* eslint-enable @typescript-eslint/no-use-before-define */
  }
}

StudentGradeLockAction.init({
  id: {
    field: 'student_grade_lock_action_id',
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
    field: 'student_grade_lock_action_new_value',
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  active: {
    field: 'student_grade_lock_action_active',
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
}, {
  tableName: 'student_grade_lock_action',
  sequelize: appSequelize, // this bit is important
});

import StudentGrade from './student-grade';
import User from './user';
