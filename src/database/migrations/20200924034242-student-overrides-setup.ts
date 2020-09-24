import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      /**
       * student_topic_override
       */
      await queryInterface.createTable('student_topic_override', {
        id: {
          field: 'student_topic_override_id',
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        courseTopicContentId: {
          field: 'course_topic_content_id',
          type: DataTypes.INTEGER,
          allowNull: false
        },
        userId: {
          field: 'user_id',
          type: DataTypes.INTEGER,
          allowNull: false
        },
        endDate: {
          field: 'student_topic_override_end_date',
          type: DataTypes.DATE,
          allowNull: false,
          // Incorrect type on sequelize
          // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
          // @ts-ignore
          defaultValue: queryInterface.sequelize.literal('NOW()')
        },
        deadDate: {
          field: 'student_topic_override_dead_date',
          type: DataTypes.DATE,
          allowNull: false,
          // Incorrect type on sequelize
          // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
          // @ts-ignore
          defaultValue: queryInterface.sequelize.literal('NOW()')
        },
        active: {
          field: 'student_topic_override_active',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
      });

      /**
       * student_topic_question_override
       */
      await queryInterface.createTable('student_topic_question_override', {
        id: {
          field: 'student_topic_question_override_id',
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        courseTopicQuestionId: {
          field: 'course_topic_question_id',
          type: DataTypes.INTEGER,
          allowNull: false
        },
        userId: {
          field: 'user_id',
          type: DataTypes.INTEGER,
          allowNull: false
        },
        maxAttempts: {
          field: 'student_topic_question_override_max_attempts',
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: 0
        },
        active: {
          field: 'student_topic_question_override_active',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
      });
    });
    /* eslint-disable @typescript-eslint/no-use-before-define */
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.dropTable('student_topic_override');
      await queryInterface.dropTable('student_topic_question_override');
    });
  }
};
