import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.addColumn('users', 'user_uuid', {
                type: DataTypes.UUID,
                allowNull: true,
                unique: true,
                defaultValue: DataTypes.UUIDV4
            });

            await queryInterface.sequelize.query(
                'UPDATE users SET user_uuid = uuid_generate_v4()'
            );

            await queryInterface.changeColumn(
                'users',
                'user_uuid',
                {
                    type: DataTypes.UUID,
                    allowNull: false,
                    unique: true,
                    defaultValue: DataTypes.UUIDV4
                }
            );

            /* *************** *************** */
            /* **** Existing issues fixed **** */
            /* *************** *************** */
            await queryInterface.addConstraint('student_workbook', ['student_grade_instance_id'], {
                references: {
                    table: 'student_grade_instance',
                    field: 'student_grade_instance_id'
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                type: 'foreign key'
            });

            await queryInterface.addConstraint('student_grade_instance_problem_attachment', ['student_grade_instance_id', 'problem_attachment_id'], {
                type: 'unique',
            });
        });
    },
    down: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.removeColumn('users', 'user_uuid');
        });
    }
};
