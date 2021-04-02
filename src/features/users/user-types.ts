import IncludeGradeOptions from './include-grade-options';
import User from '../../database/models/user';
import { PartialWithRequiredFields } from '../../extensions/typescript-utility-extensions';
import { WhereOptions } from 'sequelize/types';
import { UpdatePasswordRequest, UpdateForgottonPasswordRequest } from './user-route-request-types';
import Role from '../permissions/roles';

export interface RegisterUserOptions {
    userObject: PartialWithRequiredFields<User, 'email' | 'password'>;
    baseUrl: string;
}

export interface RegisterUserResponse {
    id: number;
    roleId: Role;
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
    replyTo?: string;
}

export interface GetUserOptions {
    id: number;
    includeGrades?: IncludeGradeOptions;
    courseId?: number;
    includeSensitive?: boolean;
}

export interface ForgotPasswordOptions {
    email: string;
    baseUrl: string;
}

export interface UpdatePasswordOptions extends UpdatePasswordRequest.body {
    id: number;
};

export type UpdateForgottonPasswordOptions = UpdateForgottonPasswordRequest.body;

export interface UpdateUserOptions {
    where: WhereOptions;
    // Updates can take any form, i.e. I can have problemNumber: { [sequelize.OP.gte]: 0 } or sequelize.literal
    // TODO further investigation if there is any way for the suggested type to show but allow other values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updates: Partial<User> | any;
}
