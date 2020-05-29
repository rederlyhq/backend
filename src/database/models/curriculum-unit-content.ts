import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'

export default class CurriculumUnitContent extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public curriculumId!: number;
    public name!: string;
    public active!: boolean;

    public getCurriculum!: BelongsToGetAssociationMixin<Curriculum>;

    public readonly curriculum!: Curriculum;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        CurriculumUnitContent.belongsTo(Curriculum, {
            foreignKey: 'curriculumId',
            targetKey: 'id',
            as: 'curriculum'
        });
    
        CurriculumUnitContent.hasMany(CurriculumTopicContent, {
          foreignKey: 'curriculumUnitContentId',
          sourceKey: 'id',
          as: 'topics'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
      }
}

CurriculumUnitContent.init({
    id: {
        field: 'curriculum_unit_content_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    curriculumId: {
        field: 'curriculum_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        field: 'curriculum_unit_content_name',
        type: DataTypes.TEXT,
        allowNull: false,
    },
    active: {
        field: 'curriculum_unit_content_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
}, {
    tableName: 'curriculum_unit_content',
    sequelize: appSequelize, // this bit is important
});

import Curriculum from './curriculum';
import CurriculumTopicContent from './curriculum-topic-content';
