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
          allowNull: false,
          // Defaults to cascade when generating the db, no action on migrations
          onUpdate: 'CASCADE',
          // Different from sequelize model, on models I do this with associations so I can use types
          references: {
            model: 'course_topic_content',
            key: 'course_topic_content_id',
          },
        },
        userId: {
          field: 'user_id',
          type: DataTypes.INTEGER,
          allowNull: false,
          // Defaults to cascade when generating the db, no action on migrations
          onUpdate: 'CASCADE',
          // Different from sequelize model, on models I do this with associations so I can use types
          references: {
            model: 'users',
            key: 'user_id',
          },
        },
        startDate: {
          field: 'student_topic_override_start_date',
          type: DataTypes.DATE,
          allowNull: true,
        },
        endDate: {
          field: 'student_topic_override_end_date',
          type: DataTypes.DATE,
          allowNull: true,
        },
        deadDate: {
          field: 'student_topic_override_dead_date',
          type: DataTypes.DATE,
          allowNull: true,
        },
        active: {
          field: 'student_topic_override_active',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        updatedAt: {
          field: 'updated_at',
          type: DataTypes.DATE,
          allowNull: false,
        },
        createdAt: {
          field: 'created_at',
          type: DataTypes.DATE,
          allowNull: false,
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
          allowNull: false,
          // Defaults to cascade when generating the db, no action on migrations
          onUpdate: 'CASCADE',
          // Different from sequelize model, on models I do this with associations so I can use types
          references: {
            model: 'course_topic_question',
            key: 'course_topic_question_id',
          },
        },
        userId: {
          field: 'user_id',
          type: DataTypes.INTEGER,
          allowNull: false,
          // Defaults to cascade when generating the db, no action on migrations
          onUpdate: 'CASCADE',
          // Different from sequelize model, on models I do this with associations so I can use types
          references: {
            model: 'users',
            key: 'user_id',
          },
        },
        maxAttempts: {
          field: 'student_topic_question_override_max_attempts',
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        active: {
          field: 'student_topic_question_override_active',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        updatedAt: {
          field: 'updated_at',
          type: DataTypes.DATE,
          allowNull: false,
        },
        createdAt: {
          field: 'created_at',
          type: DataTypes.DATE,
          allowNull: false,
        },
      });
    });
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.dropTable('student_topic_override');
      await queryInterface.dropTable('student_topic_question_override');
    });
  }
};
