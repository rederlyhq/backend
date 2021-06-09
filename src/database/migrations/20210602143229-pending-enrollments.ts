import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.createTable('pending_enrollment', {
                id: {
                    field: 'pending_enrollment_id',
                    type: DataTypes.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                email: {
                    field: 'pending_enrollment_email',
                    type: DataTypes.TEXT,
                    allowNull: false,
                    unique: 'pending_enrollment--course_id-email',
                },
                courseId: {
                    field: 'course_id',
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    unique: 'pending_enrollment--course_id-email',
                    // Defaults to cascade when generating the db, no action on migrations
                    onUpdate: 'CASCADE',
                    onDelete: 'NO ACTION',
                    // Different from sequelize model, on models I do this with associations so I can use types
                    references: {
                        model: 'course',
                        key: 'course_id',
                    },
                },
                active: {
                    field: 'pending_enrollment_active',
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
            await queryInterface.dropTable('pending_enrollment');
        });
    }
};
