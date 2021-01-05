import { DataTypes } from 'sequelize';
import { QueryInterface } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.addColumn('course_topic_content', 'course_topic_content_errors', {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            });

            await queryInterface.addColumn('course_topic_question', 'course_topic_question_errors', {
                type: DataTypes.JSONB,
                allowNull: true,
                defaultValue: null,
            });

            await queryInterface.addColumn('course_question_assessment_info', 'course_question_assessment_info_errors', {
                type: DataTypes.JSONB,
                allowNull: true,
                defaultValue: null,
            });

        });
    },
    down: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.removeColumn('course_topic_content', 'course_topic_content_errors');
            await queryInterface.removeColumn('course_topic_question', 'course_topic_question_errors');
            await queryInterface.removeColumn('course_question_assessment_info', 'course_question_assessment_info_errors');
        });
    }
};
