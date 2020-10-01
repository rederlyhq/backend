import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      /**
       * student_topic_override
       */
      await queryInterface.createTable('student_topic_assessment_info', {
        id: {
          field: 'student_topic_assessment_info_id',
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
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
        active: {
          field: 'student_topic_assessment_info_active',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        startedAt: {
          field: 'started_at',
          type: DataTypes.DATE,
          allowNull: false,
        },
        endsAt: {
          field: 'started_at',
          type: DataTypes.DATE,
          allowNull: false,
        },
        numAttempts: {
          field: 'num_attempts',
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },

      });
      /**
       * student_topic_override
       */
      await queryInterface.createTable('student_grade_instance', {
        id: {
          field: 'student_grade_instance_id',
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
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
        courseWWTopicQuestionId: {
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
        studentGradeId: {
          field: 'student_grade_id',
          type: DataTypes.INTEGER,
          allowNull: false,
          // Defaults to cascade when generating the db, no action on migrations
          onUpdate: 'CASCADE',
          // Different from sequelize model, on models I do this with associations so I can use types
          references: {
            model: 'student_grade',
            key: 'student_grade_id',
          },
        },
        studentTopicAssessmentInfoId: {
          field: 'student_topic_assessment_info_id',
          type: DataTypes.INTEGER,
          allowNull: false,
          // Defaults to cascade when generating the db, no action on migrations
          onUpdate: 'CASCADE',
          // Different from sequelize model, on models I do this with associations so I can use types
          references: {
            model: 'student_topic_assessment_info',
            key: 'student_topic_assessment_info_id',
          },
        },
        active: {
          field: 'student_grade_instance_active',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        webworkQuestionPath: {
          field: 'course_topic_question_webwork_problem_ww_path',
          type: DataTypes.STRING,
          allowNull: false,
        },
        startedAt: {
          field: 'started_at',
          type: DataTypes.DATE,
          allowNull: false,
        },
        endsAt: {
          field: 'started_at',
          type: DataTypes.DATE,
          allowNull: false,
        },
        bestIndividualAttemptId: {
          field: 'best_individual_attempt_id',
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        bestVersionAttemptId: {
          field: 'best_version_attempt_id',
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        randomSeed: {
          field: 'student_grade_random_seed',
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 666
        },
        bestIndividualScore: {
          field: 'student_grade_instance_best_individual_score',
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0
        },
        bestVersionScore: {
          field: 'student_grade_instance_best_version_score',
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0
        },
        numAttempts: {
          field: 'student_grade_num_attempts',
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        effectiveScore: {
          field: 'student_grade_effective_score',
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0
        },
        locked: {
          field: 'student_grade_locked',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        currentProblemState: {
          field: 'student_grade_current_problem_state',
          type: DataTypes.JSONB,
          allowNull: true,
        },
      });
    });
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.dropTable('student_topic_assessment_info');
      await queryInterface.dropTable('student_grade_instance');
    });
  }
};
