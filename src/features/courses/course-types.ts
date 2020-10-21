import StudentGrade from '../../database/models/student-grade';
import StudentWorkbook from '../../database/models/student-workbook';
import User from '../../database/models/user';
import CourseWWTopicQuestion, { CourseWWTopicQuestionInterface } from '../../database/models/course-ww-topic-question';
import Course from '../../database/models/course';
import { WhereOptions } from 'sequelize/types';
import CourseUnitContent from '../../database/models/course-unit-content';
import CourseTopicContent, { CourseTopicContentInterface } from '../../database/models/course-topic-content';
import Role from '../permissions/roles';
import { OutputFormat, RendererResponse } from '../../utilities/renderer-helper';
import { Moment } from 'moment';
import { DetermineGradingRationaleResult } from '../../utilities/grading-helper';
import StudentGradeInstance from '../../database/models/student-grade-instance';
import StudentTopicOverride from '../../database/models/student-topic-override';
import StudentTopicQuestionOverride from '../../database/models/student-topic-question-override';
import { DeepPartial } from '../../utilities/typescript-helpers';

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

export interface GetQuestionRepositoryOptions {
    id: number;
    userId?: number;
}

export interface GetCourseTopicRepositoryOptions {
    id: number;
    // For overrides
    userId?: number;
}

export interface GetTopicAssessmentInfoByTopicIdOptions {
    topicId: number;
    // For overrides
    userId?: number;
}

export interface GetStudentTopicAssessmentInfoOptions {
    topicAssessmentInfoId: number;
    userId: number;
}

export interface GetQuestionVersionDetailsOptions {
    questionId: number;
    userId: number;
}

export interface QuestionVersionDetails {
    webworkQuestionPath: string;
    problemNumber: number;
    randomSeed: number;
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
    updates: DeepPartial<CourseTopicContent>;
    checkDates?: boolean;
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

export interface ExtendTopicQuestionForUserOptions {
    where: {
        courseTopicQuestionId: number;
        userId: number;
    };
    updates: {
        maxAttempts?: number;
    };
}

export interface ExtendTopicForUserOptions {
    where: {
        courseTopicContentId: number;
        userId: number;
    };
    assessmentWhere?: {
        topicAssessmentInfoId?: number;
    };
    updates: {
        extensions?: {
            startDate?: Date;
            endDate?: Date;
            deadDate?: Date;    
        };
        studentTopicAssessmentOverride?: {
            duration?: number;
            maxGradedAttemptsPerVersion?: number;
            maxVersions?: number;
            versionDelay?: number;
        };
    };
    checkDates?: boolean;
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
    updates: DeepPartial<CourseWWTopicQuestion>;
}

export interface UpdateGradeOptions {
    where: {
        id: number;
    };
    updates: Partial<StudentGrade>;
    initiatingUserId: number;
}

export interface UpdateGradeInstanceOptions {
    where: {
        id: number;
    };
    updates: Partial<StudentGradeInstance>;
    initiatingUserId: number;
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
    userId?: number;
}

export interface GetQuestionOptions {
    userId: number;
    questionId: number;
    formURL: string;
    role: Role;
    topic?: CourseTopicContent;
    workbookId?: number;
    readonly?: boolean;
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
    // Use this field to be programmatically submit answers
    // Used for testing as of now
    timeOfSubmission?: Date;
}

export interface SubmitAnswerResult {
    studentGrade: StudentGrade | null;
    studentWorkbook: StudentWorkbook | null;
}

export interface UserCanStartNewVersionOptions {
    user: User;
    topicId: number;
}

export interface UserCanStartNewVersionResult {
    userCanStartNewVersion: boolean;
    message?: string;
}

export interface SubmittedAssessmentResultContext {
    questionResponse: RendererResponse;
    grade: StudentGrade;
    instance: StudentGradeInstance;
    weight: number;
}

export interface ScoreAssessmentResult {
    problemScores: { [key: string]: number };
    bestVersionScore: number;
    bestOverallVersion: number;
}

export interface SubmitAssessmentAnswerResult {
    problemScores?: { [key: string]: number };
    bestVersionScore?: number;
    bestOverallVersion?: number;
}

export interface FindMissingGradesResult {
    student: User;
    question: CourseWWTopicQuestion;
}

export interface GetQuestionsOptions {
    courseTopicContentId?: number;
    userId?: number;
    studentTopicAssessmentInfoId?: number;
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

export interface DeleteUserEnrollmentOptions {
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

export interface CreateNewStudentGradeInstanceOptions {
    userId: number;
    studentGradeId: number;
    studentTopicAssessmentInfoId: number;
    webworkQuestionPath: string;
    randomSeed: number;
    problemNumber: number;
}

export interface GetQuestionsForThisAssessmentOptions {
    topicId: number;
}

export interface CreateGradeInstancesForAssessmentOptions {
    userId: number;
    topicId: number;
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

export interface GradeOptions {
    studentGrade: StudentGrade;
    topic: CourseTopicContent;
    question: CourseWWTopicQuestion;

    solutionDate: moment.Moment;

    newScore: number;

    submitted: unknown;

    timeOfSubmission: moment.Moment;
    workbook?: StudentWorkbook;

    override?: {
        useOverride?: boolean;
        topicOverride?: StudentTopicOverride | null;
        questionOverride?: StudentTopicQuestionOverride | null;
    };
}

export interface GradeResult {
    gradingRationale: DetermineGradingRationaleResult;
    gradeUpdates: Partial<StudentGrade>;
    score: number;
}

export interface PostQuestionMeta {
    rendererParams: GetCalculatedRendererParamsResponse;
    studentGrade?: StudentGrade | null;
    courseQuestion: CourseWWTopicQuestion;
}

export interface SetGradeFromSubmissionOptions {
    studentGrade: StudentGrade;
    workbook?: StudentWorkbook;
    gradeResult: GradeResult;
    submitted: unknown;
    timeOfSubmission? : Moment;
}

export interface ReGradeTopicOptions {
    topic: CourseTopicContent;
    userId?: number;
    topicOverride?: StudentTopicOverride;
    skipContext?: {
        skipIfPossible?: boolean;
        newTopic?: CourseTopicContentInterface;
        originalTopic?: CourseTopicContentInterface;
    };
}

export interface ReGradeQuestionOptions {
    question: CourseWWTopicQuestion;
    topic?: CourseTopicContent;
    userId?: number;
    minDate?: Date;
    topicOverride?: StudentTopicOverride;
    questionOverride?: StudentTopicQuestionOverride;
    skipContext?: {
        skipIfPossible?: boolean;
        newQuestion?: CourseWWTopicQuestionInterface;
        originalQuestion?: CourseWWTopicQuestionInterface;
    };
}

export interface ReGradeStudentGradeOptions {
    studentGrade: StudentGrade;
    topic?: CourseTopicContent;
    question?: CourseWWTopicQuestion;
    workbooks?: Array<StudentWorkbook>;
    minDate?: Date;
    topicOverride?: StudentTopicOverride;
    questionOverride?: StudentTopicQuestionOverride;
}
