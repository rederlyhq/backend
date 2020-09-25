import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';
import CourseTopicContent from './course-topic-content';

interface StudentTopicAssessmentOverrideInterface {
    id: number;
    courseTopicContentId: number;
    userId: number;
    duration: number;
    maxGradedAttemptsPerRandomization: number;
    maxReRandomizations: number;
    randomizationDelay: number;
    active: boolean;
}

export default class StudentTopicAssessmentOverride extends Model implements StudentTopicAssessmentOverrideInterface {
    public id!: number;
    public courseTopicContentId!: number;
    public userId!: number;
    public duration!: number;
    public maxGradedAttemptsPerRandomization!: number;
    public maxReRandomizations!: number;
    public randomizationDelay!: number;
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
        StudentTopicAssessmentOverride.belongsTo(CourseTopicContent, {
            foreignKey: 'courseTopicContentId',
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
    courseTopicContentId: {
        field: 'course_topic_content_id',
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
        allowNull: false,
        defaultValue: 0
    },
    maxGradedAttemptsPerRandomization: {
        field: 'student_topic_assessment_override_max_graded_attempts_per_randomization',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    maxReRandomizations: {
        field: 'student_topic_assessment_override_max_re_randomizations',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    randomizationDelay: {
        field: 'student_topic_assessment_override_randomization_delay',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
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
