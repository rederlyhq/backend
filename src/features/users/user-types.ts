import IncludeGradeOptions from './include-grade-options';
import User from '../../database/models/user';
import { PartialWithRequiredFields } from '../../extensions/typescript-utility-extensions';

export interface RegisterUserOptions {
    userObject: PartialWithRequiredFields<User, 'email' | 'password'>;
    baseUrl: string;
}

export interface RegisterUserResponse {
    id: number;
    roleId: number;
    emailSent: boolean;
    verificationBypass: boolean;
}

export interface ListUserFilter {
    userIds?: number[] | number;
    courseId?: number;
    includeGrades?: IncludeGradeOptions;
}

export interface EmailOptions {
    listUsersFilter: ListUserFilter;
    content: string;
    subject: string;
}

export interface GetUserOptions {
    id: number;
    includeGrades?: IncludeGradeOptions;
    courseId?: number;
    includeSensitive?: boolean;
}
