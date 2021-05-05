import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.addColumn('curriculum_topic_content', 'curriculum_topic_content_description', {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
      });
    });
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.removeColumn('curriculum_topic_content', 'curriculum_topic_content_description');
    });
  }
};
