import StudentGrade from '../../database/models/student-grade';
import StudentWorkbook from '../../database/models/student-workbook';
import User from '../../database/models/user';
import CourseWWTopicQuestion, { CourseWWTopicQuestionInterface, CourseTopicQuestionErrors } from '../../database/models/course-ww-topic-question';
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
import StudentTopicAssessmentInfo from '../../database/models/student-topic-assessment-info';
import ProblemAttachment from '../../database/models/problem-attachment';
import { BucketDefFileResult, FindFilesDefFileResult } from '../../utilities/webwork-utilities/importer';
import WebWorkDef from '../../utilities/web-work-def-parser';
import StudentEnrollment from '../../database/models/student-enrollment';

export interface EnrollByCodeOptions {
    code: string;
    userId: number;
}

export type EnrollManuallyOptions = {
    courseId: number;
} & ({
    userId: number;
} | {
    studentEmail: string;
})

export interface ManualEnrollmentResult {
    enrollment: StudentEnrollment;
    user: User;
}

export interface CourseListOptions {
    filter: {
        instructorId?: number;
        enrolledUserId?: number;
    };
}

export interface BrowseProblemsCourseListOptions {
    filter: {
        instructorId?: number;
    };
}

export interface BrowseProblemsUnitListOptions {
    filter: {
        courseId?: number;
    };
}

export interface BrowseProblemsTopicListOptions {
    filter: {
        unitId?: number;
    };
}

export interface GetSearchProblemResultsOptions {
    filter: {
        courseId?: number;
        unitId?: number;
        topicId?: number;
        instructorId?: number;
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
    // to check if the topic has been 'used'
    checkUsed?: boolean;
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

export interface GetStudentGradeInstanceOptions {
    id: number;
}

export interface GetStudentGradeOptions {
    id: number;
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

export interface GetCourseOptions {
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

export interface GetGradeForQuestionOptions {
    questionId: number;
    userId: number;
    includeWorkbooks?: boolean;
}

export interface GetStatisticsOnUnitsOptions {
    where: {
        courseId?: number;
        userId?: number;
        userRole: Role;
    };
    followQuestionRules: boolean;
}

export interface GetStatisticsOnTopicsOptions {
    where: {
        courseUnitContentId?: number;
        courseId?: number;
        userId?: number;
        userRole: Role;
    };
    followQuestionRules: boolean;
}

export interface GetStatisticsOnQuestionsOptions {
    where: {
        courseTopicContentId?: number;
        courseId?: number;
        userId?: number;
        userRole: Role;
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
    studentTopicAssessmentInfoId?: number;
    showCorrectAnswers?: boolean;
};

export interface PreviewQuestionOptions {
    webworkQuestionPath: string;
    role: Role;
    problemSeed?: number;
    formURL: string;
    formData: { [key: string]: unknown };
    showAnswersUpfront?: boolean;
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

export interface CanUserViewQuestionIdOptions {
    user: User;
    questionId: number;
    studentTopicAssessmentInfoId?: number;
    role: Role;
}

export interface CanUserViewQuestionIdResult {
    userCanViewQuestion: boolean;
    message: string;
}

export interface UserCanStartNewVersionOptions {
    user: User;
    topicId: number;
    role: Role;
}

export interface UserCanStartNewVersionResultData {
    status: string;
    nextAvailableStartTime?: Date;
}

export interface UserCanStartNewVersionResult {
    userCanStartNewVersion: boolean;
    message?: string;
    data: UserCanStartNewVersionResultData;
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

export interface CanUserGetQuestionsOptions { 
    userId: number; 
    role: Role;
    courseTopicContentId?: number; 
    studentTopicAssessmentInfoId?: number; 
}

export interface CanUserGetQuestionsResult { 
    message: string; 
    userCanGetQuestions: boolean; 
    topic: CourseTopicContent | null; 
    version: StudentTopicAssessmentInfo | null;
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
    reEnrollIfDropped?: boolean;
}

export interface DeleteUserEnrollmentOptions {
    courseId: number;
    userId: number;
}

export interface CreateGradesForQuestionOptions {
    questionId: number;
    userIds?: Array<number>;
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
    requestURL?: string;
}

// not exporting since this is meant to be abstract
interface CreateQuestionsForTopicFromDefFileOptions {
    courseTopicId: number;
    topic?: CourseTopicContent;
    userIds?: Array<number>;
    defFileDiscoveryResult?: {
        defFileResult: FindFilesDefFileResult;
        bucketDefFiles: { [key: string]: [BucketDefFileResult] };
    };
}

export interface CreateQuestionsForTopicFromDefFileContentOptions extends CreateQuestionsForTopicFromDefFileOptions {
    webworkDefFileContent: string;
}

export interface CreateQuestionsForTopicFromParsedDefFileOptions extends CreateQuestionsForTopicFromDefFileOptions {
    parsedWebworkDef: WebWorkDef;
    // If you've already parsed the DEF file, then you should have the errors already:
    errors: CourseTopicQuestionErrors | null;
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
    // TODO this was more generic way to interface with the renderer, seems like we got more specific with our user logic in here
    gradeInstance?: StudentGradeInstance;
    userId?: number;
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
    problemPath: string;
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

export interface CanUserGradeAssessmentOptions {
    user: User;
    topicId: number;
}

export interface GetAssessmentForGradingOptions {
    topicId: number;
}

export interface GetAssessmentForGradingResult {
    problems: CourseWWTopicQuestion[];
    topic: CourseTopicContent;
}

export interface CreateAttachmentOptions {
    obj: Partial<ProblemAttachment>;
    studentGradeId?: number;
    studentGradeInstanceId?: number;
    studentWorkbookId?: number;
}

export interface ListAttachmentOptions {
    studentGradeId?: number;
    studentGradeInstanceId?: number;
    studentWorkbookId?: number;
}

export interface DeleteAttachmentOptions {
    problemAttachmentId: number;
}

/**
 * courseId: The ID of the course to contact the professor for.
 * student: The student/current User that is sending this email.
 * content: Email content.
 */
export interface EmailProfOptions {
    courseId: number;
    content: string;
    student: User;
    question: {
        id: number;
    };
    baseURL: string;
}

export interface GetStudentTopicOverrideOptions {
    userId: number; 
    topicId: number;
}

export interface GetAllContentForVersionOptions {
    topicId: number;
    userId: number;
}

export interface PrepareOpenLabRedirectOptions {
    questionId: number;
    user: User;
    baseURL: string;
}

export interface OpenLabRedirectInfo {
    problem: number;
    problemSetId: string;
    courseId: string;
    problemPath: string;
    email: string[];
    studentName: string;
    emailURL: string;
    rawHTML: string;
}

export interface ImportTarballOptions {
    filePath: string;
    fileName: string;
    courseId: number;
    user: User;
    keepBucketsAsTopics: boolean;
}

export interface ImportCourseTarballResult {
    unit: Partial<CourseUnitContent>;
    missingFileErrors: {
        missingPGFileErrors: Array<string>;
        missingAssetFileErrors: Array<string>;
    };
}
export interface AddQuestionOptions {
    question: Partial<CourseWWTopicQuestion>;
    userIds?: Array<number>;
}

export interface RequestNewProblemVersionOptions {
    userId: number;
    questionId: number;
}
