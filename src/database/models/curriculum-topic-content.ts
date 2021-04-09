import { Model, DataTypes, BelongsToGetAssociationMixin, HasOneGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize';

export interface CurriculumTopicContentInterface {
    id: number;
    curriculumUnitContentId: number;
    name: string;
    active: boolean;
    contentOrder: number;
    topicTypeId: number;
    createdAt: Date;
    updatedAt: Date;
}

export default class CurriculumTopicContent extends Model implements CurriculumTopicContentInterface {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public curriculumUnitContentId!: number;
    public name!: string;
    public active!: boolean;
    public contentOrder!: number;
    public topicTypeId!: number;

    // Foreign key objects, only exists if included
    public questions?: CurriculumWWTopicQuestion[];

    public getCurriculumUnitContent!: BelongsToGetAssociationMixin<CurriculumUnitContent>;
    public getCurriculumTopicAssessmentInfo!: HasOneGetAssociationMixin<CurriculumTopicAssessmentInfo>;
    public readonly curriculumUnitContent!: CurriculumUnitContent;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static constraints = {
        uniqueOrderPerUnit: 'curriculum_topic_content--unit_id-order',
        uniqueNamePerUnit: 'curriculum_topic_content--unit_id-name',
        foreignKeyUnit: 'curriculum_topic_content_curriculum_unit_content_id_fkey'
    }

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        CurriculumTopicContent.belongsTo(CurriculumUnitContent, {
            foreignKey: 'curriculumUnitContentId',
            targetKey: 'id',
            as: 'curriculumUnitContent'
        });

        CurriculumTopicContent.hasMany(CurriculumWWTopicQuestion, {
            foreignKey: 'curriculumTopicContentId',
            sourceKey: 'id',
            as: 'questions'
        });

        CurriculumTopicContent.hasOne(CurriculumTopicAssessmentInfo, {
            foreignKey: 'curriculumTopicContentId',
            sourceKey: 'id',
            as: 'curriculumTopicAssessmentInfo'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

CurriculumTopicContent.init({
    id: {
        field: 'curriculum_topic_content_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    curriculumUnitContentId: {
        field: 'curriculum_unit_content_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    topicTypeId: {
        field: 'topic_type_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        field: 'curriculum_topic_content_name',
        type: DataTypes.TEXT,
        allowNull: false,
    },
    active: {
        field: 'curriculum_topic_content_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    contentOrder: {
        field: 'curriculum_topic_content_order',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'curriculum_topic_content',
    sequelize: appSequelize, // this bit is important
    indexes: [
        {
            fields: [
                'curriculum_unit_content_id',
                'curriculum_topic_content_name',
            ],
            unique: true,
            name: CurriculumTopicContent.constraints.uniqueNamePerUnit,
        },
        {
            fields: [
                'curriculum_unit_content_id',
                'curriculum_topic_content_order',
            ],
            unique: true,
            name: CurriculumTopicContent.constraints.uniqueOrderPerUnit,
        }
    ]
});

import CurriculumUnitContent from './curriculum-unit-content';
import CurriculumWWTopicQuestion from './curriculum-ww-topic-question';
import CurriculumTopicAssessmentInfo from './curriculum-topic-assessment-info';
