import { Model, DataTypes, BelongsToGetAssociationMixin, HasManyGetAssociationsMixin } from 'sequelize';
import appSequelize from '../app-sequelize';

interface StudentTopicAssessmentInfoInterface {
    id: number;
    courseTopicContentId: number;
    userId: number;
    startTime: Date;
    endTime: Date;
    nextVersionAvailableTime: Date;
    attemptsRemaining: number;
    active: boolean;
}

export default class StudentTopicAssessmentInfo extends Model implements StudentTopicAssessmentInfoInterface {
    public id!: number;
    public courseTopicContentId!: number;
    public userId!: number;
    public startTime!: Date;
    public endTime!: Date;
    public nextVersionAvailableTime!: Date;
    public attemptsRemaining!: number;
    public active!: boolean;

    public getUser!: BelongsToGetAssociationMixin<User>;
    public getTopic!: BelongsToGetAssociationMixin<CourseTopicContent>;
    public getStudentGradeInstances!: HasManyGetAssociationsMixin<StudentGradeInstance>;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static constraints = {
    }

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        StudentTopicAssessmentInfo.belongsTo(CourseTopicContent, {
            foreignKey: 'courseTopicContentId',
            targetKey: 'id',
            as: 'studentGrade'
        });

        StudentTopicAssessmentInfo.belongsTo(User, {
            foreignKey: 'userId',
            targetKey: 'id',
            as: 'user'
        });

        StudentTopicAssessmentInfo.hasMany(StudentGradeInstance, {
            foreignKey: 'studentTopicAssessmentInfoId',
            sourceKey: 'id',
            as: 'studentGradeInstances'
        });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

StudentTopicAssessmentInfo.init({
    id: {
        field: 'student_topic_assessment_info_id',
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
    startDate: {
        field: 'student_topic_assessment_info_start_date',
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: appSequelize.literal('NOW()')
    },
    endDate: {
        field: 'student_topic_assessment_info_end_date',
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: appSequelize.literal('NOW()')
    },
    nextVersionAvailableTime: {
        field: 'student_topic_assessment_info_next_version_date',
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: appSequelize.literal('NOW()')
    },
    attemptsRemaining: {
        field: 'student_topic_assessment_info_attempts_remaining',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: true
    },
    active: {
        field: 'student_topic_assessment_info_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
}, {
    tableName: 'student_topic_assessment_info',
    sequelize: appSequelize, // this bit is important
});

import User from './user';
import CourseTopicContent from './course-topic-content';
import StudentGradeInstance from './student-grade-instance';
