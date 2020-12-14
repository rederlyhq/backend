import { Model, DataTypes } from 'sequelize';
import appSequelize from '../app-sequelize';

export interface CurriculumQuestionAssessmentInfoInterface {
    id: number;
    curriculumWWTopicQuestionId: number;
    randomSeedSet: Array<number>;
    additionalProblemPaths: Array<string>;
    active: boolean;
}
export default class CurriculumQuestionAssessmentInfo extends Model implements CurriculumQuestionAssessmentInfoInterface {

    public id!: number;
    public curriculumWWTopicQuestionId!: number;
    public randomSeedSet!: Array<number>;
    public additionalProblemPaths!: Array<string>;
    public active!: boolean;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static constraints = {
    }

    static createAssociations(): void {
        // This is a hack to add the associations later to avoid cyclic dependencies
        /* eslint-disable @typescript-eslint/no-use-before-define */
        CurriculumQuestionAssessmentInfo.belongsTo(CurriculumWWTopicQuestion, {
            foreignKey: 'curriculumWWTopicQuestionId',
            targetKey: 'id',
            as: 'curriculumTopicQuestion'
        });
        
        /* eslint-enable @typescript-eslint/no-use-before-define */
    }
}

CurriculumQuestionAssessmentInfo.init({
    id: {
        field: 'curriculum_question_assessment_info_id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    curriculumWWTopicQuestionId: {
        field: 'curriculum_topic_question_id',
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    randomSeedSet: {
        field: 'curriculum_question_assessment_info_random_seed_set',
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: false,
        defaultValue: []
    },
    additionalProblemPaths: {
        field: 'curriculum_question_assessment_info_additional_problem_paths',
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: false,
        defaultValue: []
    },
    active: {
        field: 'curriculum_question_assessment_info_active',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'curriculum_question_assessment_info',
    sequelize: appSequelize, // this bit is important
});

import CurriculumWWTopicQuestion from './curriculum-ww-topic-question';
