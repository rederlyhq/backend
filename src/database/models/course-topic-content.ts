import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize'

export default class CourseTopicContent extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public curriculumTopicContentId!: number;
    public courseUnitContentId!: number;
    public topicTypeId!: number;
    public name!: string;
    public active!: boolean;



    public getCurriculumTopicContent!: BelongsToGetAssociationMixin<CurriculumTopicContent>;
    public getTopicType!: BelongsToGetAssociationMixin<TopicType>;

    public readonly curriculumTopicContent!: CurriculumTopicContent;
    public readonly topicType!: TopicType;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        CourseTopicContent.belongsTo(CurriculumTopicContent, {
            foreignKey: 'curriculumTopicContentId',
            targetKey: 'id',
            as: 'curriculumTopicContent'
        });
        
        CourseTopicContent.belongsTo(CourseUnitContent, {
            foreignKey: 'courseUnitContentId',
            targetKey: 'id',
            as: 'unit'
        });

        CourseTopicContent.belongsTo(TopicType, {
            foreignKey: 'topicTypeId',
            targetKey: 'id',
            as: 'topicType'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
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
    courseUnitContentId: {
        field: 'course_unit_content_id',
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
    tableName: 'course_topic_content',
    sequelize: appSequelize, // this bit is important
});

import CurriculumTopicContent from './curriculum-topic-content';
import TopicType from './topic-type';import CourseUnitContent from './course-unit-content';

