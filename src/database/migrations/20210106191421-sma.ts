// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.addColumn('student_grade', 'student_grade_original_random_seed', {
        type: DataTypes.INTEGER,
        // Have to add later after filling previous
        allowNull: true,
      });

      await queryInterface.bulkUpdate('student_grade', {
        'student_grade_original_random_seed': queryInterface.sequelize.Sequelize.col('student_grade_random_seed')
      }, {});

      await queryInterface.changeColumn(
        'student_grade',
        'student_grade_original_random_seed',
        {
          type: DataTypes.INTEGER,
          allowNull: false,
        }
      );

      await queryInterface.addColumn('course_topic_question', 'course_topic_question_sma_enabled', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    });
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.removeColumn('student_grade', 'student_grade_original_random_seed');
      await queryInterface.removeColumn('course_topic_question', 'course_topic_question_sma_enabled');
    });
  }
};
