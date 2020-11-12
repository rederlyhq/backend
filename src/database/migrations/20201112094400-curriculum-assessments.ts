import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.createTable('curriculum_topic_assessment_info', {
                id: {
                    field: 'curriculum_topic_assessment_info_id',
                    type: DataTypes.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                curriculumTopicContentId: {
                    field: 'curriculum_topic_content_id',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                },
                duration: {
                    field: 'curriculum_topic_assessment_info_duration',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0
                },
                hardCutoff: {
                    field: 'curriculum_topic_assessment_info_hard_cutoff',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                maxGradedAttemptsPerVersion: {
                    field: 'curriculum_topic_assessment_info_max_graded_attempts_per_version',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 1,
                },
                maxVersions: {
                    field: 'curriculum_topic_assessment_info_max_versions',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                versionDelay: {
                    field: 'curriculum_topic_assessment_info_version_delay',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                hideHints: {
                    field: 'curriculum_topic_assessment_info_hide_hints',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                showItemizedResults: {
                    field: 'curriculum_topic_assessment_info_show_itemized_results',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                showTotalGradeImmediately: {
                    field: 'curriculum_topic_assessment_info_show_total_grade_immediately',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                hideProblemsAfterFinish: {
                    field: 'curriculum_topic_assessment_info_hide_problems_after_finish',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
                randomizeOrder: {
                    field: 'curriculum_topic_assessment_info_randomize_order',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                },
                active: {
                    field: 'curriculum_topic_assessment_info_active',
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                },
            });

            await queryInterface.createTable('curriculum_question_assessment_info', {                
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
            });
        });
    },
    down: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.dropTable('curriculum_topic_assessment_info');
            await queryInterface.dropTable('curriculum_question_assessment_info');
        });
    }
};
