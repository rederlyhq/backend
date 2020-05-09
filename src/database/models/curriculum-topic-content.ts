import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize';
import CurriculumUnitContent from './curriculum_unit_content';

export default class CurriculumTopicContent extends Model {
  public id!: number; // Note that the `null assertion` `!` is required in strict mode.
  public curriculumUnitContentId!: number;
  public name!: string;
  public active!: boolean;

  public getCurriculumUnitContent!: BelongsToGetAssociationMixin<CurriculumUnitContent>;

  public readonly curriculumUnitContent!: CurriculumUnitContent;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CurriculumTopicContent.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  curriculumUnitContentId: {
    field: 'curriculum_unit_content_id',
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
  tableName: 'curriculum_topic_content',
  sequelize: appSequelize, // this bit is important
});

CurriculumTopicContent.belongsTo(CurriculumUnitContent, {
  foreignKey: 'curriculumUnitContentId',
  targetKey: 'id',
  as: 'curriculumUnitContent'
});