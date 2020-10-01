import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize';

export default class StudentTopicAssessmentInfo extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public active!: boolean;
  public userId!: number;
  public courseTopicContentId!: number;
  public startedAt!: Date;
  public endsAt!: Date;
  public numAttempts!: number;

  public getUser!: BelongsToGetAssociationMixin<User>;
  public getTopic!: BelongsToGetAssociationMixin<CourseTopicContent>;

  public user!: User;
  public topic!: CourseTopicContent;

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

    StudentTopicAssessmentInfo.belongsTo(User, {
      foreignKey: 'userId',
      targetKey: 'id',
      as: 'user'
    });

    StudentTopicAssessmentInfo.belongsTo(CourseTopicContent, {
      foreignKey: 'courseTopicContentId',
      targetKey: 'id',
      as: 'topic'
    });

    /* eslint-enable @typescript-eslint/no-use-before-define */
  }

}

StudentTopicAssessmentInfo.init({
  id: {
    field: 'student_topic_assessment_info_id',
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  active: {
    field: 'student_topic_assessment_info_active',
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  userId: {
    field: 'user_id',
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  courseTopicContentId: {
    field: 'course_topic_content_id',
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  startedAt: {
    field: 'started_at',
    type: DataTypes.DATE,
    allowNull: false,
  },
  endsAt: {
    field: 'started_at',
    type: DataTypes.DATE,
    allowNull: false,
  },
  numAttempts: {
    field: 'num_attempts',
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
}, {
  tableName: 'student_topic_assessment_info',
  sequelize: appSequelize, // this bit is important
  indexes: [{
    name: 'student_topic_assessment_info--course_topic_content_id-user_id',
    unique: true,
    fields: [
      'course_topic_content_id',
      'user_id'
    ]
  }]
});

import User from './user';
import CourseTopicContent from './course-topic-content';
