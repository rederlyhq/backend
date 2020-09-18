import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
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
          references: {
            model: 'student_grade',
            key: 'student_grade_id',
          },
        },
        initiatingUserId: {
          field: 'initiating_user_id',
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'user_id',
          }
        },
        newValue: {
          field: 'student_grade_override_new_value',
          type: DataTypes.INTEGER,
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
          references: {
            model: 'student_grade',
            key: 'student_grade_id',
          },
        },
        initiatingUserId: {
          field: 'initiating_user_id',
          type: DataTypes.INTEGER,
          allowNull: false,
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
      });

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
    });
    // This is a hack to add the associations later to avoid cyclic dependencies
    /* eslint-disable @typescript-eslint/no-use-before-define */
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
      await queryInterface.dropTable('student_grade_override');
      await queryInterface.dropTable('student_grade_lock_action');
      await queryInterface.removeColumn('student_workbook', 'student_workbook_was_late');
      await queryInterface.removeColumn('student_workbook', 'student_workbook_was_expired');
      await queryInterface.removeColumn('student_workbook', 'student_workbook_was_after_attempt_limit');
      await queryInterface.removeColumn('student_workbook', 'student_workbook_was_auto_submitted');
    });
  }
};
