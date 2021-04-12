import { Model } from 'sequelize';

export interface UpdateResult<T> {
    updatedCount: number;
    updatedRecords: Array<T>;
}

export interface UpsertResult<T> extends UpdateResult<T> {
    createdNewEntry: boolean;
    original?: T | null;
}

export const stripSequelizeFromUpdateResult = <T, U extends Model = Model>(input: UpdateResult<U>): UpdateResult<T> => ({
    updatedCount: input.updatedCount,
    updatedRecords: input.updatedRecords.map(updatedRecord => updatedRecord.get({plain: true}) as unknown as T),
});

export const stripSequelizeFromUpsertResult = <T, U extends Model = Model>(input: UpsertResult<U>): UpsertResult<T> => ({
    ...stripSequelizeFromUpdateResult(input),
    createdNewEntry: input.createdNewEntry,
    original: input.original?.get({plain: true}) as unknown as T
});
