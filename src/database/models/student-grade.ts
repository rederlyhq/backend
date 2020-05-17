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
    field: 'course_ww_topic_question_id',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  randomSeed: {
    field: 'random_seed',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  bestScore: {
    field: 'best_score',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  numAttempts: {
    field: 'num_attempts',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  firstAttempts: {
    field: 'first_attempts',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  latestAttempts: {
    field: 'latest_attempts',
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