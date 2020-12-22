import User from '../database/models/user';
import logger from '../utilities/logger';
import { useDatabaseTransaction } from '../utilities/database-helper';
import * as _ from 'lodash';

export const updateIndividualUser = async (id: number, date: Date): Promise<void> => {
    const user = await User.findOne({
        where: {
            id,
            active: true
        }
    });
    if (_.isNil(user)) {
        throw new Error(`User #${id} not found. Cannot update paid until.`);
    }
    user.paidUntil = date;
    const result = await user.save();
    logger.info(JSON.stringify(result, null, 2));
};

export const updateInstitution = async (universityId: number, date: Date): Promise<void> => {
    return useDatabaseTransaction(async (): Promise<void> => {
        const institutionUsers = await User.findAll({
            where: {
                universityId,
                active: true,
            }
        });
        const result = await institutionUsers.asyncForEach( async (user) => {
            await updateIndividualUser(user.id, date);
        });
        logger.info(JSON.stringify(result, null, 2));
    });
};
