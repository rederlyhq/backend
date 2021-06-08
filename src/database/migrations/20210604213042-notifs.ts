// TODO remove from actual migrations, DataTypes will be used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {

      await queryInterface.createTable('notifications', {
        id: {
          field: 'notifications_id',
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        content: {
          field: 'notifications_content',
          type: DataTypes.TEXT,
          allowNull: false,
        },
        userId: {
          field: 'user_id',
          type: DataTypes.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'NO ACTION',
          // Different from sequelize model, on models I do this with associations so I can use types
          references: {
              model: 'users',
              key: 'user_id',
          },
        },
        active: {
          field: 'notifications_active',
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
      await queryInterface.dropTable('notifications');
    });
  }
};
