import StudentGrade from '../../database/models/student-grade';
import StudentWorkbook from '../../database/models/student-workbook';
import User from '../../database/models/user';
import CourseWWTopicQuestion from '../../database/models/course-ww-topic-question';
import Course from '../../database/models/course';
import { WhereOptions } from 'sequelize/types';
import CourseUnitContent from '../../database/models/course-unit-content';
import CourseTopicContent from '../../database/models/course-topic-content';
import Role from '../permissions/roles';
import { OutputFormat } from '../../utilities/renderer-helper';

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

export interface GetQuestionRepositoryOptions {
    id: number;
}

export interface GetCourseTopicRepositoryOptions {
    id: number;
}

// TODO make generic interface
export interface GetCourseUnitRepositoryOptions {
    id: number;
}

export interface UpdateTopicOptions {
    where: {
        id: number;
    };
    // Updates can take any form, i.e. I can have problemNumber: { [sequelize.OP.gte]: 0 } or sequelize.literal
    // TODO further investigation if there is any way for the suggested type to show but allow other values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updates: Partial<CourseTopicContent> | any;
}

export interface UpdateCourseUnitsOptions {
    where: WhereOptions;
    // Updates can take any form, i.e. I can have problemNumber: { [sequelize.OP.gte]: 0 } or sequelize.literal
    // TODO further investigation if there is any way for the suggested type to show but allow other values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updates: Partial<CourseUnitContent> | any;
}

export interface UpdateCourseTopicsOptions {
    where: WhereOptions;
    // Updates can take any form, i.e. I can have problemNumber: { [sequelize.OP.gte]: 0 } or sequelize.literal
    // TODO further investigation if there is any way for the suggested type to show but allow other values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updates: Partial<CourseTopicContent> | any;
}

export interface UpdateUnitOptions {
    where: {
        id: number;
    };
    // Updates can take any form, i.e. I can have problemNumber: { [sequelize.OP.gte]: 0 } or sequelize.literal
    // TODO further investigation if there is any way for the suggested type to show but allow other values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updates: Partial<CourseUnitContent> | any;
}

export interface MakeProblemNumberAvailableOptions {
    sourceTopicId: number;
    targetTopicId: number;
    sourceProblemNumber: number;
    targetProblemNumber: number;
}

export interface MakeUnitContentOrderAvailableOptions {
    sourceCourseId: number;
    targetCourseId: number;
    sourceContentOrder: number;
    targetContentOrder: number;
}

export interface MakeTopicContentOrderAvailableOptions {
    sourceCourseUnitId: number;
    targetCourseUnitId: number;
    sourceContentOrder: number;
    targetContentOrder: number;
}

export interface UpdateQuestionOptions {
    where: {
        id: number;
    };
    updates: Partial<CourseWWTopicQuestion>;
}

export interface UpdateQuestionsOptions {
    where: WhereOptions;
    // Updates can take any form, i.e. I can have problemNumber: { [sequelize.OP.gte]: 0 } or sequelize.literal
    // TODO further investigation if there is any way for the suggested type to show but allow other values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updates: Partial<CourseWWTopicQuestion> | any;
}

export interface CreateCourseOptions {
    object: Partial<Course>;
    options: {
        useCurriculum: boolean;
    };
}

export interface UpdateCourseOptions {
    where: {
        id: number;
    };
    updates: Partial<Course>;
}

export interface GetGradesOptions {
    where: {
        courseId?: number;
        unitId?: number;
        topicId?: number;
        questionId?: number;
        userId?: number;
    };
}

export interface GetStatisticsOnUnitsOptions {
    where: {
        courseId?: number;
        userId?: number;
    };
    followQuestionRules: boolean;
}

export interface GetStatisticsOnTopicsOptions {
    where: {
        courseUnitContentId?: number;
        courseId?: number;
        userId?: number;
    };
    followQuestionRules: boolean;
}

export interface GetStatisticsOnQuestionsOptions {
    where: {
        courseTopicContentId?: number;
        courseId?: number;
        userId?: number;
    };
    followQuestionRules: boolean;
}

export interface GetTopicsOptions {
    courseId?: number;
    isOpen?: boolean;
}

export interface GetQuestionOptions {
    userId: number;
    questionId: number;
    formURL: string;
    role: Role;
    topic?: CourseTopicContent;
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
    studentGrade: StudentGrade | null;
    studentWorkbook: StudentWorkbook | null;
}

export interface FindMissingGradesResult {
    student: User;
    question: CourseWWTopicQuestion;
}

export interface GetQuestionsOptions {
    courseTopicContentId?: number;
    userId?: number;
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

export interface CreateQuestionsForTopicFromDefFileContentOptions {
    webworkDefFileContent: string;
    courseTopicId: number;
}

export interface DeleteQuestionsOptions {
    id?: number;
    courseTopicContentId?: number;
}

export interface DeleteTopicsOptions {
    id?: number;
    courseUnitContentId?: number;
}

export interface DeleteUnitsOptions {
    // Currently you cannot delete a course so you must supply an id
    id: number;
}

export interface GetCalculatedRendererParamsOptions {
    role: Role;
    topic?: CourseTopicContent;
    courseQuestion: CourseWWTopicQuestion;
}

export interface GetCalculatedRendererParamsResponse {
    outputformat: OutputFormat;
    permissionLevel: number;
    showSolutions: number;
}