import IncludeGradeOptions from "./include-grade-options";
import User from "../../database/models/user";

export interface RegisterUserOptions {
    userObject: Partial<User>;
    baseUrl: string;
}

export interface RegisterUserResponse {
    id: number;
    roleId: number;
    emailSent: boolean;
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