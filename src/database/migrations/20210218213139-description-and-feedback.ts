// TODO remove from actual migrations, DataTypes will be used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.addColumn('course_topic_content', 'course_topic_content_description', {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
      });

      await queryInterface.addColumn('student_grade', 'student_grade_feedback', {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
      });

      await queryInterface.addColumn('student_grade_instance', 'student_grade_instance_feedback', {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
      });
    });
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.removeColumn('course_topic_content', 'course_topic_content_description');
      await queryInterface.removeColumn('student_grade', 'student_grade_feedback');
      await queryInterface.removeColumn('student_grade_instance', 'student_grade_instance_feedback');
    });
  }
};
