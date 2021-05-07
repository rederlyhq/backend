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

      await queryInterface.addColumn('course_topic_content', 'course_topic_content_retro_started_time', {
        field: 'course_topic_content_retro_started_time',
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      });

      await queryInterface.addColumn('student_workbook', 'student_workbook_credited', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });

      await queryInterface.addColumn('student_workbook', 'student_workbook_was_early', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });

      await queryInterface.sequelize.query('UPDATE student_workbook SET student_workbook_credited = student_workbook_active, student_workbook_active = true WHERE student_workbook_active = false');
    });
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.removeColumn('course_topic_content', 'course_topic_content_grade_ids_that_need_retro');
      await queryInterface.removeColumn('course_topic_content', 'course_topic_content_retro_started_time');
      await queryInterface.removeColumn('student_workbook', 'student_workbook_credited');
      await queryInterface.removeColumn('student_workbook', 'student_workbook_was_early');
    });
  }
};
