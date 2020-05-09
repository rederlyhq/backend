import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'
import Course from './course';

export default class CourseUnitContent extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public courseId!: number;
  public name!: string;
  public active!: boolean;

  public getCourse!: BelongsToGetAssociationMixin<Course>;

  public readonly course!: Course;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CourseUnitContent.init({
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
  name: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
}, {
  tableName: 'course_unit_content',
  sequelize: appSequelize, // this bit is important
});

CourseUnitContent.belongsTo(Course, {
  foreignKey: 'courseId',
  targetKey: 'id',
  as: 'course'
});