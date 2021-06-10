// TODO remove from actual migrations, DataTypes will be used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { QueryInterface, DataTypes } from 'sequelize';
import Permission from '../models/permission';

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
        Permission.create({
          id: 3,
          active: true,
          roleName: 'superadmin',
          permissionName: 'superadmin',
          permissionDescription: 'A Rederly administrator that can modify all universities.'
        });
    });
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Transactions are automatically use because a namespace is injected into sequelize when fetching configurations
    await queryInterface.sequelize.transaction(async () => {
        Permission.destroy({
          where: {
            id: 3
          }
        });
    });
  }
};
