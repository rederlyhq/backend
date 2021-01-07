// TODO rename file

import { Model, DataTypes, BelongsToGetAssociationMixin, HasManyGetAssociationsMixin, HasOneGetAssociationMixin } from 'sequelize';
import appSequelize from '../app-sequelize';
import * as _ from 'lodash';

export interface CourseWWTopicQuestionInterface {
    id: number;
    courseTopicContentId: number;
    problemNumber: number;
    webworkQuestionPath: string;
    weight: number;
    maxAttempts: number;
    hidden: boolean;
    active: boolean;
    optional: boolean;
    curriculumQuestionId: number;
    createdAt: Date;
    updatedAt: Date;
    courseQuestionAssessmentInfo?: CourseQuestionAssessmentInfo;
}

export default class CourseWWTopicQuestion extends Model implements CourseWWTopicQuestionInterface {
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
    
    public getTopic!: BelongsToGetAssociationMixin<CourseTopicContent>;
    public getGrades!: HasManyGetAssociationsMixin<StudentGrade>;
    public getCourseQuestionAssessmentInfo!: HasOneGetAssociationMixin<CourseQuestionAssessmentInfo>;
    public getStudentTopicQuestionOverride!: HasManyGetAssociationsMixin<StudentTopicQuestionOverride>;
    public getStudentGradeInstances!: HasManyGetAssociationsMixin<StudentGradeInstance>;

    public courseQuestionAssessmentInfo?: CourseQuestionAssessmentInfo;
    public readonly studentTopicQuestionOverride?: StudentTopicQuestionOverride[];
    public readonly grades?: StudentGrade[];

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static getWithOverrides = (obj: CourseWWTopicQuestionInterface, overrides: StudentTopicQuestionOverrideOverridesInterface): CourseWWTopicQuestionInterface => {
        // Avoid cyclic dependencies
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return _.assign({}, obj, StudentTopicQuestionOverride.getOverrides(overrides));
    }

    getWithOverrides = (overrides: StudentTopicQuestionOverrideOverridesInterface): CourseWWTopicQuestionInterface => {
        return CourseWWTopicQuestion.getWithOverrides(this.get({ plain: true }) as CourseWWTopicQuestionInterface, overrides);
    }

    static getVersion = (obj: CourseWWTopicQuestionInterface, version: StudentGradeInstanceInterface): CourseWWTopicQuestionInterface => {
        // Avoid cyclic dependencies
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return _.assign({}, obj, StudentGradeInstance.getQuestionOverrides(version)); // will override problemNumber and webworkQuestionPath
    }

    getVersion = (version: StudentGradeInstance): CourseWWTopicQuestionInterface => {
        return CourseWWTopicQuestion.getVersion(this.get({ plain: true }) as CourseWWTopicQuestionInterface, version);
    }

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

        CourseWWTopicQuestion.hasOne(CourseQuestionAssessmentInfo, {
            foreignKey: 'courseWWTopicQuestionId',
            sourceKey: 'id',
            as: 'courseQuestionAssessmentInfo'
        });
        
        CourseWWTopicQuestion.hasMany(StudentGrade, {
            foreignKey: 'courseWWTopicQuestionId',
            sourceKey: 'id',
            as: 'grades'
        });

        CourseWWTopicQuestion.hasMany(StudentTopicQuestionOverride, {
            foreignKey: 'courseTopicQuestionId',
            sourceKey: 'id',
            as: 'studentTopicQuestionOverride'
        });
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
        defaultValue: true
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
    },
    smaEnabled: {
        field: 'course_topic_question_sma_enabled',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
import CourseQuestionAssessmentInfo from './course-question-assessment-info';
import StudentTopicQuestionOverride, { StudentTopicQuestionOverrideOverridesInterface } from './student-topic-question-override';
import StudentGradeInstance, { StudentGradeInstanceInterface } from './student-grade-instance';
