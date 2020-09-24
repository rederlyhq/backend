import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      /* *************** *************** */
      /* ***** New Auditing Tables ***** */
      /* *************** *************** */
      await queryInterface.createTable('student_grade_override', {
        id: {
          field: 'student_grade_override_id',
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
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
        initiatingUserId: {
          field: 'initiating_user_id',
          type: DataTypes.INTEGER,
          allowNull: false,
          // Defaults to cascade when generating the db, no action on migrations
          onUpdate: 'CASCADE',
          // Different from sequelize model, on models I do this with associations so I can use types
          references: {
            model: 'users',
            key: 'user_id',
          }
        },
        newValue: {
          field: 'student_grade_override_new_value',
          type: DataTypes.FLOAT,
          allowNull: false
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
        active: {
          field: 'student_grade_override_active',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
      });

      await queryInterface.createTable('student_grade_lock_action', {
        id: {
          field: 'student_grade_lock_action_id',
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
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
        initiatingUserId: {
          field: 'initiating_user_id',
          type: DataTypes.INTEGER,
          allowNull: false,
          // Defaults to cascade when generating the db, no action on migrations
          onUpdate: 'CASCADE',
          // Different from sequelize model, on models I do this with associations so I can use types
          references: {
            model: 'users',
            key: 'user_id',
          }
        },
        newValue: {
          field: 'student_grade_lock_action_new_value',
          type: DataTypes.BOOLEAN,
          allowNull: false
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
        active: {
          field: 'student_grade_lock_action_active',
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
      });

      /* *************** *************** */
      /* * New auditing / debug fields * */
      /* *************** *************** */
      // Modifiers!
      await queryInterface.addColumn('student_workbook', 'student_workbook_was_late', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });

      await queryInterface.addColumn('student_workbook', 'student_workbook_was_expired', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });

      await queryInterface.addColumn('student_workbook', 'student_workbook_was_after_attempt_limit', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });

      await queryInterface.addColumn('student_workbook', 'student_workbook_was_auto_submitted', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });

      await queryInterface.addColumn('student_workbook', 'student_workbook_was_locked', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }),
      // Number of attempts!
      await queryInterface.addColumn('student_grade', 'student_grade_num_legal_attempts', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
      await queryInterface.addColumn('student_grade', 'student_grade_num_extended_attempts', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      });

      // Could add foreign key in migration however startup causes issues
      // for now sequelize is handling instead of the database
      await queryInterface.addColumn('student_grade', 'last_influencing_legal_attempt_workbook_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      await queryInterface.addColumn('student_grade', 'last_influencing_credited_attempt_workbook_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      await queryInterface.addColumn('student_grade', 'last_influencing_attempt_workbook_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });

      /* *************** *************** */
      /* **** New submission fields **** */
      /* *************** *************** */
      await queryInterface.addColumn('student_grade', 'student_grade_current_problem_state', {
        type: DataTypes.JSONB,
        allowNull: true,
      });
    });
    // This is a hack to add the associations later to avoid cyclic dependencies
    /* eslint-disable @typescript-eslint/no-use-before-define */
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      /* *************** *************** */
      /* ***** New Auditing Tables ***** */
      /* *************** *************** */
      await queryInterface.dropTable('student_grade_override');
      await queryInterface.dropTable('student_grade_lock_action');
      
      /* *************** *************** */
      /* * New auditing / debug fields * */
      /* *************** *************** */
      // Modifiers!
      await queryInterface.removeColumn('student_workbook', 'student_workbook_was_late');
      await queryInterface.removeColumn('student_workbook', 'student_workbook_was_expired');
      await queryInterface.removeColumn('student_workbook', 'student_workbook_was_after_attempt_limit');
      await queryInterface.removeColumn('student_workbook', 'student_workbook_was_auto_submitted');
      await queryInterface.removeColumn('student_workbook', 'student_workbook_was_locked');

      // Num attempts!
      await queryInterface.removeColumn('student_grade', 'student_grade_num_legal_attempts');
      await queryInterface.removeColumn('student_grade', 'student_grade_num_extended_attempts');

      // Workbook loopback
      await queryInterface.removeColumn('student_grade', 'last_influencing_legal_attempt_workbook_id');
      await queryInterface.removeColumn('student_grade', 'last_influencing_credited_attempt_workbook_id');
      await queryInterface.removeColumn('student_grade', 'last_influencing_attempt_workbook_id');

      /* *************** *************** */
      /* **** New submission fields **** */
      /* *************** *************** */
      await queryInterface.removeColumn('student_grade', 'student_grade_current_problem_state');
    });
  }
};
