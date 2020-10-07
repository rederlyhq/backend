import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

interface CourseQuestionAssessmentInfoInterface {
    id: number;
    courseTopicContentId: number;
    randomSeedSet: Array<number>;
    additionalProblemPaths: Array<string>;
    active: boolean;
}
export default class CourseQuestionAssessmentInfo extends Model implements CourseQuestionAssessmentInfoInterface {

    public id!: number;
    public courseTopicContentId!: number;
    public randomSeedSet!: Array<number>;
    public additionalProblemPaths!: Array<string>;
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
        CourseQuestionAssessmentInfo.belongsTo(CourseWWTopicQuestion, {
            foreignKey: 'courseTopicQuestionId',
            targetKey: 'id',
            as: 'courseTopicQuestion'
        });

        // CourseTopicContent.hasMany(CourseWWTopicQuestion, {
        //     foreignKey: 'courseTopicContentId',
        //     sourceKey: 'id',
        //     as: 'questions'
        // });
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

CourseQuestionAssessmentInfo.init({
    id: {
        field: 'course_topic_assessment_info_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    courseTopicContentId: {
        field: 'course_topic_question_id',
        type: DataTypes.INTEGER,
        allowNull: false
    },
    randomSeedSet: {
        field: 'course_topic_assessment_info_random_seed_set',
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: false,
        defaultValue: []
    },
    additionalProblemPaths: {
        field: 'course_topic_assessment_info_additional_problem_paths',
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: false,
        defaultValue: []
    },
    active: {
        field: 'course_topic_assessment_info_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'course_topic_assessment_info',
    sequelize: appSequelize, // this bit is important
});

import CourseWWTopicQuestion from './course-ww-topic-question';
