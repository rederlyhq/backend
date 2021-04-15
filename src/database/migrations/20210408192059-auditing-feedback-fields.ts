// TODO remove from actual migrations, DataTypes will be used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {

    await queryInterface.createTable('topic_feedback', {
        id: {
            field: 'id',
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        topicId: {
            field: 'topic_id',
            type: DataTypes.INTEGER,
            allowNull: false,
            // Defaults to cascade when generating the db, no action on migrations
            onUpdate: 'CASCADE',
            onDelete: 'NO ACTION',
            // Different from sequelize model, on models I do this with associations so I can use types
            references: {
                model: 'course_topic_content',
                key: 'course_topic_content_id',
            },
        },
        userId: {
            field: 'user_id',
            type: DataTypes.INTEGER
        },
        feedback: {
            field: 'feedback',
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: null,
        },
        active: {
            field: 'active',
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

    await queryInterface.createTable('workbook_feedback_problem_attachment', {
    id: {
        field: 'id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    workbookId: {
        field: 'workbook_id',
        type: DataTypes.INTEGER,
        allowNull: false,
        // Defaults to cascade when generating the db, no action on migrations
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION',
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
        field: 'active',
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

    await queryInterface.createTable('topic_description_problem_attachment', {
    id: {
        field: 'id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    topicId: {
        field: 'topic_id',
        type: DataTypes.INTEGER,
        allowNull: false,
        // Defaults to cascade when generating the db, no action on migrations
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION',
        // Different from sequelize model, on models I do this with associations so I can use types
        references: {
            model: 'course_topic_content',
            key: 'course_topic_content_id',
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
        field: 'active',
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

    await queryInterface.createTable('topic_feedback_problem_attachment', {
    id: {
        field: 'id',
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    topicFeedbackId: {
        field: 'topic_feedback_id',
        type: DataTypes.INTEGER,
        allowNull: false,
        // Defaults to cascade when generating the db, no action on migrations
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION',
        // Different from sequelize model, on models I do this with associations so I can use types
        references: {
            model: 'topic_feedback',
            key: 'id',
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
        field: 'active',
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
      await queryInterface.dropTable('workbook_feedback_problem_attachment');
      await queryInterface.dropTable('topic_description_problem_attachment');
      await queryInterface.dropTable('topic_feedback_problem_attachment');
      await queryInterface.dropTable('topic_feedback');
    });
  }
};
