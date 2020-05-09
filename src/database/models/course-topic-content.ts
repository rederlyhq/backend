import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'
import CurriculumTopicContent from './curriculum-topic-content';
import TopicCalendar from './topic-calendar';

export default class CourseTopicContent extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public curriculumTopicContentId!: number;
  public topicCalendarId!: number;
  public topicTypeId!: number;
  public name!: string;
  public active!: boolean;

  public getCurriculumTopicContent!: BelongsToGetAssociationMixin<CurriculumTopicContent>;
  public getTopicCalendar!: BelongsToGetAssociationMixin<TopicCalendar>;

public readonly curriculumTopicContent!: CurriculumTopicContent;
// public readonly topicType!: TopicType;
  public readonly topicCalendar!: TopicCalendar;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CourseTopicContent.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  curriculumTopicContentId: {
    field: 'curriculum_topic_content_id',
    type: DataTypes.INTEGER,
    allowNull: false,
  },  
  topicCalendarId: {
    field: 'topic_calendar_id',
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  topicTypeId: {
    field: 'topic_type_id',
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
  tableName: 'course_topic_content',
  sequelize: appSequelize, // this bit is important
});

CourseTopicContent.belongsTo(CurriculumTopicContent, {
  foreignKey: 'curriculumTopicContentId',
  targetKey: 'id',
  as: 'curriculumTopicContent'
});

CourseTopicContent.belongsTo(TopicCalendar, {
    foreignKey: 'topicCalendarId',
    targetKey: 'id',
    as: 'topicCalendar'
  });

// TODO other associations