import { DataTypes } from 'sequelize';
import { QueryInterface } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.addColumn('users', 'user_paid_until', {
                type: DataTypes.DATE,
                allowNull: false,
                // Incorrect type on sequelize
                // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                // @ts-ignore
                defaultValue: queryInterface.sequelize.literal('NOW()')
            });

            await queryInterface.addColumn('university', 'university_paid_until', {
                type: DataTypes.DATE,
                allowNull: false,
                // Incorrect type on sequelize
                // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                // @ts-ignore
                defaultValue: queryInterface.sequelize.literal('NOW()')
            });

        });
    },
    down: async (queryInterface: QueryInterface): Promise<void> => {
        // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
        await queryInterface.sequelize.transaction(async () => {
            await queryInterface.removeColumn('users', 'user_paid_until');
            await queryInterface.removeColumn('university', 'university_paid_until');
        });
    }
};
