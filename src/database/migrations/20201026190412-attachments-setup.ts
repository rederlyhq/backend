import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.createTable('problem_attachment', {
                id: {
                    field: 'problem_attachment_id',
                    type: DataTypes.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                },
                url: {
                    field: 'problem_attachment_url',
                    type: DataTypes.TEXT,
                    allowNull: false
                },
                userLocalFilename: {
                    field: 'problem_attachment_user_local_filename',
                    type: DataTypes.TEXT,
                    allowNull: false
                },
                active: {
                    field: 'problem_attachment_active',
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

        await queryInterface.createTable('student_workbook_problem_attachment', {
            id: {
                field: 'student_workbook_problem_attachment_id',
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            studentWorkbookId: {
                field: 'student_workbook_id',
                type: DataTypes.INTEGER,
                allowNull: false,
                // Defaults to cascade when generating the db, no action on migrations
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                // Different from sequelize model, on models I do this with associations so I can use types
                references: {
                    model: 'student_workbook',
                    key: 'student_workbook_id',
                },
            },
            problemAttachmentId: {
                field: 'problem_attachment_id',
                type: DataTypes.INTEGER,
                allowNull: false,
                // Defaults to cascade when generating the db, no action on migrations
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                // Different from sequelize model, on models I do this with associations so I can use types
                references: {
                    model: 'problem_attachment',
                    key: 'problem_attachment_id',
                },
            },
            active: {
                field: 'student_workbook_problem_attachment_active',
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

        await queryInterface.createTable('student_grade_problem_attachment', {
            id: {
                field: 'student_grade_problem_attachment_id',
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
                onDelete: 'CASCADE',
                // Different from sequelize model, on models I do this with associations so I can use types
                references: {
                    model: 'student_grade',
                    key: 'student_grade_id',
                },

            },
            problemAttachmentId: {
                field: 'problem_attachment_id',
                type: DataTypes.INTEGER,
                allowNull: false,
                // Defaults to cascade when generating the db, no action on migrations
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                // Different from sequelize model, on models I do this with associations so I can use types
                references: {
                    model: 'problem_attachment',
                    key: 'problem_attachment_id',
                },
            },
            active: {
                field: 'student_grade_problem_attachment_active',
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

        await queryInterface.createTable('student_grade_instance_problem_attachment', {
            id: {
                field: 'student_grade_instance_problem_attachment_id',
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            studentGradeInstanceId: {
                field: 'student_grade_instance_id',
                type: DataTypes.INTEGER,
                allowNull: false,
                // Defaults to cascade when generating the db, no action on migrations
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                // Different from sequelize model, on models I do this with associations so I can use types
                references: {
                    model: 'student_grade_instance',
                    key: 'student_grade_instance_id',
                },

            },
            problemAttachmentId: {
                field: 'problem_attachment_id',
                type: DataTypes.INTEGER,
                allowNull: false,
                // Defaults to cascade when generating the db, no action on migrations
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                // Different from sequelize model, on models I do this with associations so I can use types
                references: {
                    model: 'problem_attachment',
                    key: 'problem_attachment_id',
                },

            },
            active: {
                field: 'student_grade_instance_problem_attachment_active',
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
    },
    down: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.dropTable('student_workbook_problem_attachment');
            await queryInterface.dropTable('student_grade_problem_attachment');
            await queryInterface.dropTable('student_grade_instance_problem_attachment');
            await queryInterface.dropTable('problem_attachment');
        });
    }
};
