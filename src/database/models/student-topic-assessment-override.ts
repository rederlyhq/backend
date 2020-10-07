import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';
import TopicAssessmentInfo from './topic-assessment-info';

interface StudentTopicAssessmentOverrideInterface {
    id: number;
    courseTopicContentId: number;
    userId: number;
    duration: number | null;
    maxGradedAttemptsPerRandomization: number | null;
    maxReRandomizations: number | null;
    randomizationDelay: number | null;
    active: boolean;
}

export default class StudentTopicAssessmentOverride extends Model implements StudentTopicAssessmentOverrideInterface {
    public id!: number;
    public courseTopicContentId!: number;
    public userId!: number;
    public duration!: number | null;
    public maxGradedAttemptsPerRandomization!: number | null;
    public maxReRandomizations!: number | null;
    public randomizationDelay!: number | null;
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
        StudentTopicAssessmentOverride.belongsTo(TopicAssessmentInfo, {
            foreignKey: 'topicAssessmentInfoId',
            targetKey: 'id',
            as: 'studentGrade'
        });

        StudentTopicAssessmentOverride.belongsTo(User, {
            foreignKey: 'userId',
            targetKey: 'id',
            as: 'user'
        });
        // CourseTopicContent.hasMany(CourseWWTopicQuestion, {
        //     foreignKey: 'courseTopicContentId',
        //     sourceKey: 'id',
        //     as: 'questions'
        // });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

StudentTopicAssessmentOverride.init({
    id: {
        field: 'student_topic_assessment_override_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    topicAssessmentInfoId: {
        field: 'topic_assessment_info_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        field: 'user_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    duration: {
        field: 'student_topic_assessment_override_duration',
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    maxGradedAttemptsPerRandomization: {
        field: 'student_topic_assessment_override_max_graded_attempts_per_randomization',
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    maxReRandomizations: {
        field: 'student_topic_assessment_override_max_re_randomizations',
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    randomizationDelay: {
        field: 'student_topic_assessment_override_randomization_delay',
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    active: {
        field: 'student_topic_assessment_override_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
}, {
    tableName: 'student_topic_assessment_override',
    sequelize: appSequelize, // this bit is important
});

import User from './user';
