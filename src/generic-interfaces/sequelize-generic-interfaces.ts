export interface UpdateResult<T> {
    updatedCount: number;
    updatedRecords: Array<T>;
}

export interface UpsertResult<T> extends UpdateResult<T> {
    createdNewEntry: boolean;
    // TODO generics
    original?: unknown;
}
