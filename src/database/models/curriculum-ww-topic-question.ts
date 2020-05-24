import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'
import CurriculumTopicContent from './curriculum-topic-content';

export default class CurriculumWWTopicQuestion extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public curriculumTopicContentId!: number;
  public problemNumber!: number;
  public webworkQuestionPath!: string;

  public getCurriculumTopicContent!: BelongsToGetAssociationMixin<CurriculumTopicContent>;

  public readonly curriculumTopicContent!: CurriculumTopicContent;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CurriculumWWTopicQuestion.init({
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
  problemNumber: {
    field: 'problem_number',
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  webworkQuestionPath: {
    field: 'webwork_question_ww_path',
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'curriculum_ww_topic_question',
  sequelize: appSequelize, // this bit is important
});

CurriculumWWTopicQuestion.belongsTo(CurriculumTopicContent, {
  foreignKey: 'curriculumTopicContentId',
  targetKey: 'id',
  as: 'curriculumTopicContent'
});