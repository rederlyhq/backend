// TODO rename
import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize';
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

  static constraints = {
    uniqueOrderPerTopic: 'curriculum_topic_question--problem_number-topic_id',

    foreignKeyTopic: 'curriculum_topic_question_curriculum_topic_content_id_fkey'
  }
}

CurriculumWWTopicQuestion.init({
  id: {
    field: 'curriculum_topic_question_id',
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
    field: 'curriculum_topic_question_problem_number',
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  webworkQuestionPath: {
    field: 'curriculum_topic_question_webwork_question_ww_path',
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'curriculum_topic_question',
  sequelize: appSequelize, // this bit is important
  indexes: [
    {
      fields: [
        'curriculum_topic_question_problem_number',
        'curriculum_topic_content_id',
      ],
      unique: true,
      name: CurriculumWWTopicQuestion.constraints.uniqueOrderPerTopic
    },
  ]
});

CurriculumWWTopicQuestion.belongsTo(CurriculumTopicContent, {
  foreignKey: 'curriculumTopicContentId',
  targetKey: 'id',
  as: 'curriculumTopicContent'
});
