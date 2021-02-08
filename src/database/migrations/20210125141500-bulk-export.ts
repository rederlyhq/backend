import { DataTypes } from 'sequelize';
import { QueryInterface } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.addColumn('course_topic_content', 'course_topic_content_last_exported', {
                type: DataTypes.DATE,
                allowNull: true,
                defaultValue: null,
            });

            await queryInterface.addColumn('course_topic_content', 'course_topic_content_export_url', {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: null,
            });
        });
    },
    down: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.removeColumn('course_topic_content', 'course_topic_content_last_exported');
            await queryInterface.removeColumn('course_topic_content', 'course_topic_content_export_url');
        });
    }
};
