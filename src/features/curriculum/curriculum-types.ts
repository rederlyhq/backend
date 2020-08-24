export interface UpdateTopicOptions {
    where: {
        id: number;
    };
    updates: {
        startDate?: Date;
        endDate?: Date;
        deadDate?: Date;
        name?: string;
        active?: boolean;
        partialExtend?: boolean;
    };
}

export interface UpdateUnitOptions {
    where: {
        id: number;
    };
    updates: {
        name?: string;
        active?: boolean;
    };
}
