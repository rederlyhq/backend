import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'
import Course from './course';
import User from './user';

export default class StudentEnrollment extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public courseId!: number;
  public userId!: number;
  public enrollDate!: Date;
  public dropDate!: Date;

  public getCourse!: BelongsToGetAssociationMixin<Course>;
  public getUser!: BelongsToGetAssociationMixin<User>;

  public readonly course!: Course;
  public readonly user!: User;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StudentEnrollment.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  courseId: {
    field: 'course_id',
    type: DataTypes.INTEGER,
    allowNull: false,
  },  
  userId: {
    field: 'user_id',
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  enrollDate: {
    field: 'enroll_date',
    type: DataTypes.DATE,
    allowNull: false,
  },
  dropDate: {
    field: 'drop_date',
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'student_enrollment',
  sequelize: appSequelize, // this bit is important
});

StudentEnrollment.belongsTo(Course, {
  foreignKey: 'courseId',
  targetKey: 'id',
  as: 'course'
});

StudentEnrollment.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'id',
    as: 'user'
  });