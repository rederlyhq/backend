import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.addColumn('student_workbook', 'student_workbook_problem_path', {
        type: DataTypes.TEXT,
        // Have to add later after filling previous
        // allowNull: false,
      });

      await queryInterface.sequelize.query(`
        UPDATE student_workbook
        SET student_workbook_problem_path = course_topic_question.course_topic_question_webwork_question_ww_path
        FROM student_grade
        INNER JOIN course_topic_question ON course_topic_question.course_topic_question_id = student_grade.course_topic_question_id
        WHERE student_workbook.student_grade_id = student_grade.student_grade_id
        AND student_workbook.student_grade_instance_id IS NULL;
      `);

      await queryInterface.sequelize.query(`
        UPDATE student_workbook
        SET student_workbook_problem_path = student_grade_instance.student_grade_instance_problem_path
        FROM student_grade_instance
        WHERE student_workbook.student_grade_instance_id = student_grade_instance.student_grade_instance_id;
      `);

      await queryInterface.changeColumn(
        'student_workbook',
        'student_workbook_problem_path',
        {
          type: DataTypes.TEXT,
          allowNull: false,
        }
      );
    });
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
        await queryInterface.removeColumn('student_workbook', 'student_workbook_problem_path');
    });
  }
};
