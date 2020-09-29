import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      /**
       * student_topic_override
       */
      await queryInterface.createTable('student_grade_instance', {
        id: {
          field: 'student_topic_override_id',
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
            model: 'user',
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
        active: {
          field: 'student_grade_instance_active',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        lastInfluencingLegalAttemptId: {
          field: 'last_influencing_legal_attempt_workbook_id',
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        lastInfluencingCreditedAttemptId: {
          field: 'last_influencing_credited_attempt_workbook_id',
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        lastInfluencingAttemptId: {
          field: 'last_influencing_attempt_workbook_id',
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        randomSeed: {
          field: 'student_grade_random_seed',
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 666
        },
        bestScore: {
          field: 'student_grade_best_score',
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0
        },
        overallBestScore: {
          field: 'student_grade_overall_best_score',
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
        numLegalAttempts: {
          field: 'student_grade_num_legal_attempts',
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        numExtendedAttempts: {
          field: 'student_grade_num_extended_attempts',
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        firstAttempts: {
          field: 'student_grade_first_attempt',
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0
        },
        latestAttempts: {
          field: 'student_grade_latest_attempt',
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0
        },
        effectiveScore: {
          field: 'student_grade_effective_score',
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0
        },
        partialCreditBestScore: {
          field: 'student_grade_partial_best_score',
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 0
        },
        legalScore: {
          field: 'student_grade_legal_score',
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
      await queryInterface.dropTable('student_grade_instance');
    });
  }
};
