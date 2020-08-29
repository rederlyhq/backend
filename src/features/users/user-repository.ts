import User from '../../database/models/user';
import { UpdateUserOptions } from './user-types';
import { UpdateResult } from '../../generic-interfaces/sequelize-generic-interfaces';

class UserRepository {
    async updateUser({
        updates,
        where
    }: UpdateUserOptions): Promise<UpdateResult<User>> {
        const result = await User.update(updates, {
            where,
            returning: true
        });
        return {
            updatedCount: result[0],
            updatedRecords: result[1]
        };
    }
}

const userRepository = new UserRepository();
export default userRepository;
