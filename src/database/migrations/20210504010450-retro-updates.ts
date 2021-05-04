// TODO remove from actual migrations, DataTypes will be used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.addColumn('course_topic_content', 'course_topic_content_grade_ids_that_need_retro', {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: false,
        defaultValue: [],
      });
    });
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.removeColumn('course_topic_content', 'course_topic_content_grade_ids_that_need_retro');
    });
  }
};
