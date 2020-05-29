import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'
import CourseWWTopicQuestion from './course-ww-topic-question';
import User from './user';

export default class StudentGrade extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public userId!: number;
  public courseWWTopicQuestionId!: number;
  public randomSeed!: number;
  public bestScore!: number;
  public numAttempts!: number;
  public firstAttempts!: number;
  public latestAttempts!: number;

  public getUser!: BelongsToGetAssociationMixin<User>;
  public getCourseWWTopicQuestion!: BelongsToGetAssociationMixin<CourseWWTopicQuestion>;

  public user!: User;
  public courseWWTopicQuestion!: CourseWWTopicQuestion;


  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StudentGrade.init({
  id: {
    field: 'student_grade_id',
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    field: 'user_id',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  courseWWTopicQuestionId: {
    field: 'student_grade_course_ww_topic_question_id',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  randomSeed: {
    field: 'student_grade_random_seed',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  bestScore: {
    field: 'student_grade_best_score',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  numAttempts: {
    field: 'student_grade_num_attempts',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  firstAttempts: {
    field: 'student_grade_first_attempts',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  latestAttempts: {
    field: 'student_grade_latest_attempts',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'student_grade',
  sequelize: appSequelize, // this bit is important
});

StudentGrade.belongsTo(User, {
  foreignKey: 'userId',
  targetKey: 'id',
  as: 'user'
});

StudentGrade.belongsTo(CourseWWTopicQuestion, {
  foreignKey: 'courseWWTopicQuestionId',
  targetKey: 'id',
  as: 'courseWWTopicQuestion'
});