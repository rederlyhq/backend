import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.addColumn('course', 'originating_course_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'course',
          key: 'course_id',
        },
      });
      await queryInterface.addColumn('course_unit_content', 'originating_unit_content_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'course_unit_content',
          key: 'course_unit_content_id',
        },
      });
      await queryInterface.addColumn('course_topic_content', 'originating_topic_content_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'course_topic_content',
          key: 'course_topic_content_id',
        },
      });
      await queryInterface.addColumn('course_topic_question', 'originating_topic_question_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'course_topic_question',
          key: 'course_topic_question_id',
        },
      });
      await queryInterface.addColumn('topic_assessment_info', 'originating_topic_assessment_info_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'topic_assessment_info',
          key: 'topic_assessment_info_id',
        },
      });
      await queryInterface.addColumn('course_question_assessment_info', 'originating_question_assessment_info_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'course_question_assessment_info',
          key: 'course_question_assessment_info_id',
        },
      });
    });
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.removeColumn('course', 'originating_course_id');
      await queryInterface.removeColumn('course_unit_content', 'originating_unit_content_id');
      await queryInterface.removeColumn('course_topic_content', 'originating_topic_content_id');
      await queryInterface.removeColumn('course_topic_question', 'originating_topic_question_id');
      await queryInterface.removeColumn('topic_assessment_info', 'originating_topic_assessment_info_id');
      await queryInterface.removeColumn('course_question_assessment_info', 'originating_question_assessment_info_id');
    });
  }
};
