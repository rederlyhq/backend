// TODO rename file

import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize'

export default class CourseWWTopicQuestion extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public courseTopicContentId!: number;
    public problemNumber!: number;
    public webworkQuestionPath!: string;
    public weight!: number;
    public maxAttempts!: number;
    public hidden!: boolean;
    public active!: boolean;
    public optional!: boolean;
    public curriculumQuestionId!: number;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static constraints = {
        uniqueOrderPerTopic: 'course_topic_question--problem_number-topic_id',

        foreignKeyTopic: 'course_topic_question_course_topic_content_id_fkey'
    }

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        CourseWWTopicQuestion.belongsTo(CourseTopicContent, {
            foreignKey: 'courseTopicContentId',
            targetKey: 'id',
            as: 'topic'
        });

        CourseWWTopicQuestion.belongsTo(CurriculumWWTopicQuestion, {
            foreignKey: 'curriculumQuestionId',
            targetKey: 'id',
            as: 'curriculumQuestion'
        });

        CourseWWTopicQuestion.hasMany(StudentGrade, {
            foreignKey: 'courseWWTopicQuestionId',
            sourceKey: 'id',
            as: 'grades'
        })
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

CourseWWTopicQuestion.init({
    id: {
        field: 'course_topic_question_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    courseTopicContentId: {
        field: 'course_topic_content_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    problemNumber: {
        field: 'course_topic_question_problem_number',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    webworkQuestionPath: {
        field: 'course_topic_question_webwork_question_ww_path',
        type: DataTypes.TEXT,
        allowNull: false,
    },
    weight: {
        field: 'course_topic_question_weight',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    maxAttempts: {
        field: 'course_topic_question_max_attempts',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    hidden: {
        field: 'course_topic_question_hidden',
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    active: {
        field: 'course_topic_question_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    optional: {
        field: 'course_topic_question_optional',
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    curriculumQuestionId: {
        field: 'curriculum_topic_question_id',
        type: DataTypes.INTEGER,
        allowNull: true,
    }
}, {
    tableName: 'course_topic_question',
    sequelize: appSequelize, // this bit is important
    indexes: [
        {
            fields: [
                'course_topic_content_id',
                'course_topic_question_problem_number',
            ],
            unique: true,
            name: CourseWWTopicQuestion.constraints.uniqueOrderPerTopic
        },
    ]
});

import CourseTopicContent from './course-topic-content';
import StudentGrade from './student-grade';
import CurriculumWWTopicQuestion from './curriculum-ww-topic-question';

