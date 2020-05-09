import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize'
// import CourseTopicContent from './course-topic-content';

export default class TopicCalendar extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public courseTopicContentId!: number;
  public topic!: string;
  public startDate!: Date;
  public dueDate!: Date;
  public deadDate!: Date;
  public partialExtend!: boolean;

//   public getCourseTopicContent!: BelongsToGetAssociationMixin<CourseTopicContent>;

//   public readonly courseTopicContent!: CourseTopicContent;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TopicCalendar.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  courseTopicContentId: {
    field: 'course_topic_content_id',
    type: DataTypes.INTEGER,
    allowNull: false,
  },  
  topic: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  startDate: {
    field: 'enroll_date',
    type: DataTypes.DATE,
    allowNull: false,
  },
  dueDate: {
    field: 'drop_date',
    type: DataTypes.DATE,
    allowNull: false,
  },
  deadDate: {
    field: 'dead_date',
    type: DataTypes.DATE,
    allowNull: false,
  },
  partialExtend: {
    field: 'partial_extend',
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
}, {
  tableName: 'topic_calendar',
  sequelize: appSequelize, // this bit is important
});

// TopicCalendar.belongsTo(CourseTopicContent, {
//   foreignKey: 'courseTopicContentId',
//   targetKey: 'id',
//   as: 'courseTopicContent'
// });