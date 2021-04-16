// TODO remove from actual migrations, DataTypes will be used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.addColumn('course', 'originating_course_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
      await queryInterface.addColumn('course_unit_content', 'originating_unit_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
      await queryInterface.addColumn('course_topic_content', 'originating_topic_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
      await queryInterface.addColumn('course_topic_question', 'originating_question_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
      await queryInterface.addColumn('topic_assessment_info', 'originating_topic_assessment_info_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
      await queryInterface.addColumn('course_question_assessment_info', 'originating_question_assessment_info_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
    });
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.removeColumn('course', 'originating_course_id');
      await queryInterface.removeColumn('course_unit_content', 'originating_unit_id');
      await queryInterface.removeColumn('course_topic_content', 'originating_topic_id');
      await queryInterface.removeColumn('course_topic_question', 'originating_question_id');
      await queryInterface.removeColumn('topic_assessment_info', 'originating_topic_assessment_info_id');
      await queryInterface.removeColumn('course_question_assessment_info', 'originating_question_assessment_info_id');
    });
  }
};
