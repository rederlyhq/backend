export interface EnrollByCodeOptions {
    code: string;
    userId: number;
}

export interface CourseListOptions {
    filter: {
        instructorId?: number;
        enrolledUserId?: number;
    };
}

export interface GetQuestionOptions {
    userId: number;
    questionId: number;
}

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

export interface GetGradesOptions {
    where: {
        courseId?: number;
        unitId?: number;
        topicId?: number;
        questionId?: number;
    };
}

export interface GetStatisticsOnUnitsOptions {
    where: {
        courseId?: number;
    };
}

export interface GetStatisticsOnTopicsOptions {
    where: {
        courseUnitContentId?: number;
        courseId?: number;
    };
}

export interface GetStatisticsOnQuestionsOptions {
    where: {
        courseTopicContentId?: number;
        courseId?: number;
    };
}

export interface GetTopicsOptions {
    courseId?: number;
    isOpen?: boolean;
}