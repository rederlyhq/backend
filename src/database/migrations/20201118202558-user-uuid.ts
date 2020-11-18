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
        });
    },
    down: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.removeColumn('users', 'user_uuid');
        });
    }
};
