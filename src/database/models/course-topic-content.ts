import { Model, DataTypes, BelongsToGetAssociationMixin, HasManyGetAssociationsMixin, HasOneGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize';
import * as _ from 'lodash';

export interface CourseTopicContentInterface {
    id: number;
    curriculumTopicContentId: number;
    courseUnitContentId: number;
    topicTypeId: number;
    name: string;
    active: boolean;
    contentOrder: number;
    startDate: Date;
    endDate: Date;
    deadDate: Date;
    partialExtend: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export default class CourseTopicContent extends Model implements CourseTopicContentInterface {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public curriculumTopicContentId!: number;
    public courseUnitContentId!: number;
    public topicTypeId!: number;
    public name!: string;
    public active!: boolean;
    public contentOrder!: number;

    public startDate!: Date;
    public endDate!: Date;
    public deadDate!: Date;
    public partialExtend!: boolean;

    public getCurriculumTopicContent!: BelongsToGetAssociationMixin<CurriculumTopicContent>;
    public getUnit!: BelongsToGetAssociationMixin<CourseUnitContent>;
    public getTopicType!: BelongsToGetAssociationMixin<TopicType>;
    public getQuestions!: HasManyGetAssociationsMixin<CourseWWTopicQuestion>;
    public getStudentTopicOverride!: HasManyGetAssociationsMixin<StudentTopicOverride>;
    // public createTopicAssessmentInfo!: HasOneCreateAssociationMixin<TopicAssessmentInfo>;
    public getTopicAssessmentInfo!: HasOneGetAssociationMixin<TopicAssessmentInfo>;
    // public setTopicAssessmentInfo!: HasOneSetAssociationMixin<TopicAssessmentInfo>;

    public readonly curriculumTopicContent!: CurriculumTopicContent;
    public readonly topicType!: TopicType;
    public readonly questions?: CourseWWTopicQuestion[];
    public readonly studentTopicOverride?: StudentTopicOverride[];
    public readonly topicAssessmentInfo?: TopicAssessmentInfo;
    public studentTopicAssessmentInfo?: StudentTopicAssessmentInfo[];

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static getWithOverrides = (obj: CourseTopicContentInterface, overrides: StudentTopicOverrideOveridesInterface): CourseTopicContentInterface => {
        // Avoid cyclic dependencies
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return _.assign({}, obj, StudentTopicOverride.getOverrides(overrides));
    }

    getWithOverrides = (overrides: StudentTopicOverrideOveridesInterface): CourseTopicContentInterface => {
        return CourseTopicContent.getWithOverrides(this.get({ plain: true }) as CourseTopicContentInterface, overrides);
    }

    static constraints = {
        uniqueOrderPerUnit: 'course_topic_content--unit_id-order',
        uniqueNamePerUnit: 'course_topic_content--unit_id-name',

        foreignKeyTopicType: 'course_topic_content_topic_type_id_fkey',
        foreignKeyUnit: 'course_topic_content_course_unit_content_id_fkey'
    }

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

        CourseTopicContent.hasMany(CourseWWTopicQuestion, {
            foreignKey: 'courseTopicContentId',
            sourceKey: 'id',
            as: 'questions'
        });

        CourseTopicContent.hasMany(StudentTopicOverride, {
            foreignKey: 'courseTopicContentId',
            sourceKey: 'id',
            as: 'studentTopicOverride'
        });

        CourseTopicContent.hasOne(TopicAssessmentInfo, {
            foreignKey: 'courseTopicContentId',
            sourceKey: 'id',
            as: 'topicAssessmentInfo'
        });

        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

CourseTopicContent.init({
    id: {
        field: 'course_topic_content_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    curriculumTopicContentId: {
        field: 'curriculum_topic_content_id',
        type: DataTypes.INTEGER,
        allowNull: true,
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
    contentOrder: {
        field: 'course_topic_content_order',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        field: 'course_topic_content_name',
        type: DataTypes.TEXT,
        allowNull: false,
    },
    active: {
        field: 'course_topic_content_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },

    startDate: {
        field: 'course_topic_content_start_date',
        type: DataTypes.DATE,
        allowNull: false,
    },
    endDate: {
        field: 'course_topic_content_end_date',
        type: DataTypes.DATE,
        allowNull: false,
    },
    deadDate: {
        field: 'course_topic_content_dead_date',
        type: DataTypes.DATE,
        allowNull: false,
    },
    partialExtend: {
        field: 'course_topic_content_partial_extend',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
}, {
    tableName: 'course_topic_content',
    sequelize: appSequelize, // this bit is important
    indexes: [
        {
            fields: [
                'course_unit_content_id',
                'course_topic_content_name',
            ],
            unique: true,
            name: CourseTopicContent.constraints.uniqueNamePerUnit,
        },
        {
            fields: [
                'course_unit_content_id',
                'course_topic_content_order',
            ],
            unique: true,
            name: CourseTopicContent.constraints.uniqueOrderPerUnit,
        },
    ]
});

import CurriculumTopicContent from './curriculum-topic-content';
import TopicType from './topic-type';
import CourseUnitContent from './course-unit-content';
import CourseWWTopicQuestion from './course-ww-topic-question';
import TopicAssessmentInfo from './topic-assessment-info';
import StudentTopicOverride, { StudentTopicOverrideOveridesInterface } from './student-topic-override';
import StudentTopicAssessmentInfo from './student-topic-assessment-info';
