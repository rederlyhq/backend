import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

interface TopicAssessmentInfoInterface {
    id: number;
    courseTopicContentId: number;
    duration: number;
    hardCutoff: boolean;
    maxGradedAttemptsPerRandomization: number;
    maxReRandomizations: number;
    randomizationDelay: number;
    hideHints: boolean;
    showItemizedResults: boolean;
    showTotalGradeImmediately: boolean;
    hideProblemsAfterFinish: boolean;
    randomizeOrder: number;
}

export default class TopicAssessmentInfo extends Model implements TopicAssessmentInfoInterface {
    public id!: number;
    public courseTopicContentId!: number;
    public duration!: number; // enforce IN MINUTES
    public hardCutoff!: boolean;
    public maxGradedAttemptsPerRandomization!: number;
    public maxReRandomizations!: number;
    public randomizationDelay!: number; // for consistency do we also force MINUTES here?
    public hideHints!: boolean;
    public showItemizedResults!: boolean;
    public showTotalGradeImmediately!: boolean;
    public hideProblemsAfterFinish!: boolean;
    public randomizeOrder!: number;
    public active!: boolean;


    // public getCurriculumTopicContent!: BelongsToGetAssociationMixin<CurriculumTopicContent>;

    // public readonly curriculumTopicContent!: CurriculumTopicContent;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static constraints = {
    }

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        TopicAssessmentInfo.belongsTo(CourseTopicContent, {
            foreignKey: 'courseTopicContentId',
            targetKey: 'id',
            as: 'studentGrade'
        });

        TopicAssessmentInfo.hasMany(StudentTopicAssessmentOverride, {
            foreignKey: 'studentTopicAssessmentInfoId',
            sourceKey: 'id',
            as: 'studentTopicAssessmentOverride'
        });

        // CourseTopicContent.hasMany(CourseWWTopicQuestion, {
        //     foreignKey: 'courseTopicContentId',
        //     sourceKey: 'id',
        //     as: 'questions'
        // });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

TopicAssessmentInfo.init({
    id: {
        field: 'topic_assessment_info_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    courseTopicContentId: {
        field: 'course_topic_content_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    duration: {
        field: 'topic_assessment_info_duration',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    hardCutoff: {
        field: 'topic_assessment_info_hard_cutoff',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    maxGradedAttemptsPerRandomization: {
        field: 'topic_assessment_info_max_graded_attempts_per_randomization',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    maxReRandomizations: {
        field: 'topic_assessment_info_max_re_randomizations',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    randomizationDelay: {
        field: 'topic_assessment_info_randomization_delay',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    hideHints: {
        field: 'topic_assessment_info_hide_hints',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    showItemizedResults: {
        field: 'topic_assessment_info_show_itemized_results',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    showTotalGradeImmediately: {
        field: 'topic_assessment_info_showTotalGradeImmediately',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    hideProblemsAfterFinish: {
        field: 'topic_assessment_info_hideProblemsAfterFinish',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    randomizeOrder: {
        field: 'topic_assessment_info_randomizeOrder',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    active: {
        field: 'student_topic_override_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
}, {
    tableName: 'topic_assessment_info',
    sequelize: appSequelize, // this bit is important
});

import CourseTopicContent from './course-topic-content';
import StudentTopicAssessmentOverride from './student-topic-assessment-override';
