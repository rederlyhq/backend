import StudentEnrollment from '../../../database/models/student-enrollment';
import PendingEnrollment from '../../../database/models/pending-enrollment';
import User from '../../../database/models/user';

export interface BulkEnrollUsersOptions {
    courseId: number;
    userEmails: string[];
}

export interface BulkEnrollUsersResults {
    enrollments: StudentEnrollment[];
    pendingEnrollments: PendingEnrollment[];
    newlyEnrolledUsers: User[];
}

export interface GetQuestionsThatRequireGradesForUsersOptions {
    courseId: number;
    userIds: number[];
}

export type GetQuestionsThatRequireGradesForUsersResult = {
    userId: number;
    courseTopicQuestionId: number;
}[]

export interface CreateGradesForUserEnrollmentsOptions {
    userIds: number[];
    courseId: number;
}
