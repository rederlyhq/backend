import StudentGrade from "../../database/models/student-grade";
import StudentWorkbook from "../../database/models/student-workbook";
import User from "../../database/models/user";
import CourseWWTopicQuestion from "../../database/models/course-ww-topic-question";

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

export interface GetQuestionOptions {
    userId: number;
    questionId: number;
    formURL: string;
};

export interface GetQuestionResult {
    // We don't know what the renderer might respond
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rendererData: any;
};

export interface SubmitAnswerOptions {
    userId: number;
    questionId: number;
    score: number;
    // This is coming from the renderer right now
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submitted: any;
}

export interface SubmitAnswerResult {
    studentGrade: StudentGrade;
    studentWorkbook: StudentWorkbook;
}

export interface FindMissingGradesResult {
    student: User;
    question: CourseWWTopicQuestion;
}

export interface GetQuestionsOptions {
    courseTopicContentId: number;
    userId: number;
}

export interface GetQuestionsThatRequireGradesForUserOptions {
    courseId: number;
    userId: number;
};

export interface GetUsersThatRequireGradeForQuestionOptions {
    questionId: number;
}

export interface CreateGradesForUserEnrollmentOptions {
    courseId: number;
    userId: number;
}

export interface CreateGradesForQuestionOptions {
    questionId: number;
}

export interface CreateNewStudentGradeOptions {
    userId: number;
    courseTopicQuestionId: number;
}