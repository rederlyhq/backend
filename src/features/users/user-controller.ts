import * as _ from 'lodash';
import { URL } from 'url';
import emailHelper from '../../utilities/email-helper';
import logger from '../../utilities/logger';
import { v4 as uuidv4 } from 'uuid';
import User from '../../database/models/user';
import Bluebird = require('bluebird');
import universityController from '../universities/university-controller';
import { hashPassword, comparePassword } from '../../utilities/encryption-helper';
import Session from '../../database/models/session';
import moment = require('moment');
import configurations from '../../configurations';
import NoAssociatedUniversityError from '../../exceptions/no-associated-university-error';
import { WhereOptions, Includeable, BaseError } from 'sequelize';
import AlreadyExistsError from '../../exceptions/already-exists-error';
import Role from '../permissions/roles';
import { ListOptions } from '../../generic-interfaces/list-options';
import StudentEnrollment from '../../database/models/student-enrollment';
import Course from '../../database/models/course';
import StudentGrade from '../../database/models/student-grade';
import StudentWorkbook from '../../database/models/student-workbook';
import CourseWWTopicQuestion from '../../database/models/course-ww-topic-question';
import CourseTopicContent from '../../database/models/course-topic-content';
import CourseUnitContent from '../../database/models/course-unit-content';
import IncludeGradeOptions from './include-grade-options';
import WrappedError from '../../exceptions/wrapped-error';
import { EmailOptions, GetUserOptions, ListUserFilter, RegisterUserOptions, RegisterUserResponse, ForgotPasswordOptions } from './user-types';
import { Constants } from '../../constants';
import userRepository from './user-repository';

const {
    sessionLife
} = configurations.auth;

class UserController {
    getUserByEmail(email: string): Promise<User> {
        return User.findOne({
            where: {
                email
            }
        });
    }

    list(listOptions?: ListOptions<ListUserFilter>): Promise<User[]> {
        // Dynamic sequelize where object
        const where: WhereOptions = {};
        // Dynamic sequelize where object
        const include: Includeable[] = [];
        if (listOptions) {
            if (listOptions.filters) {

                const sequelizeInclude = [];
                const sequelizeGradeInclude: Includeable = {};
                if (listOptions.filters.includeGrades === IncludeGradeOptions.JUST_GRADE || listOptions.filters.includeGrades === IncludeGradeOptions.WITH_ATTEMPTS) {
                    sequelizeGradeInclude.model = StudentGrade;
                    sequelizeGradeInclude.as = 'grades';
                    sequelizeGradeInclude.include = [];
                    if (!_.isNil(listOptions.filters.courseId)) {
                        sequelizeGradeInclude.include.push({
                            model: CourseWWTopicQuestion,
                            as: 'question',
                            attributes: [], // Don't care about the data, just the where
                            include: [{
                                model: CourseTopicContent,
                                as: 'topic',
                                include: [{
                                    model: CourseUnitContent,
                                    as: 'unit',
                                    include: [{
                                        model: Course,
                                        as: 'course',
                                        where: {
                                            id: listOptions.filters.courseId
                                        }
                                    }],
                                    where: {} // If you don't include where the course where won't propogate down
                                }],
                                where: {} // If you don't include where the course where won't propogate down
                            }],
                            where: {} // If you don't include where the course where won't propogate down
                        });
                    }

                    sequelizeInclude.push(sequelizeGradeInclude);
                }

                if (listOptions.filters.includeGrades === IncludeGradeOptions.WITH_ATTEMPTS) {
                    if (_.isNil(sequelizeGradeInclude.include)) {
                        throw new Error('Grade join for list users has an undefined include');
                    }
                    sequelizeGradeInclude.include.push({
                        model: StudentWorkbook,
                        as: 'workbooks'
                    });
                }
                include.push(...sequelizeInclude);

                if (listOptions.filters.userIds) {
                    where.id = listOptions.filters.userIds;
                }
                if (listOptions.filters.courseId) {
                    include.push({
                        model: StudentEnrollment,
                        attributes: [],
                        as: 'courseEnrollments',
                        include: [{
                            model: Course,
                            attributes: [],
                            as: 'course'
                        }]
                    });
                    where[`$courseEnrollments.course.${StudentEnrollment.rawAttributes.courseId.field}$`] = listOptions.filters.courseId;
                }
            }
        }
        return User.findAll({
            where,
            include,
            attributes: [
                'id',
                'universityId',
                'roleId',
                'firstName',
                'lastName',
                'email',
            ]
        });
    }

    async email(emailOptions: EmailOptions): Promise<number[]> {
        const users = await this.list({
            filters: emailOptions.listUsersFilter
        });

        // TODO see if there is a less impactfull way to send out emails to multiple recipients
        // I tried bcc: users.map(user => user.email) but I got an error that an email address was required
        const emailPromises = [];
        for (let i = 0; i < users.length; i++) {
            emailPromises.push(emailHelper.sendEmail({
                content: emailOptions.content,
                subject: emailOptions.subject,
                email: users[i].email
            }));
        }

        await Promise.all(emailPromises);

        return users.map(user => user.id);
    }

    getUser(options: GetUserOptions): Promise<User> {
        const excludedAttributes = [];
        if (!options.includeSensitive) {
            excludedAttributes.push(
                'verifyToken',
                'password'
            );
        }

        const sequelizeInclude = [];
        const sequelizeGradeInclude: Includeable = {};
        if (options.includeGrades === IncludeGradeOptions.JUST_GRADE || options.includeGrades === IncludeGradeOptions.WITH_ATTEMPTS) {
            sequelizeGradeInclude.model = StudentGrade;
            sequelizeGradeInclude.as = 'grades';
            sequelizeGradeInclude.include = [];
            if (!_.isNil(options.courseId)) {
                sequelizeGradeInclude.include.push({
                    model: CourseWWTopicQuestion,
                    as: 'question',
                    attributes: [], // Don't care about the data, just the where
                    include: [{
                        model: CourseTopicContent,
                        as: 'topic',
                        include: [{
                            model: CourseUnitContent,
                            as: 'unit',
                            include: [{
                                model: Course,
                                as: 'course',
                                where: {
                                    id: options.courseId
                                }
                            }],
                            where: {} // If you don't include where the course where won't propogate down
                        }],
                        where: {} // If you don't include where the course where won't propogate down
                    }],
                    where: {} // If you don't include where the course where won't propogate down
                });
            }

            sequelizeInclude.push(sequelizeGradeInclude);
        }

        if (options.includeGrades === IncludeGradeOptions.WITH_ATTEMPTS) {
            if (_.isNil(sequelizeGradeInclude.include)) {
                throw new Error('Grade join for get user has an undefined include');
            }

            sequelizeGradeInclude.include.push({
                model: StudentWorkbook,
                as: 'workbooks'
            });
        }

        return User.findOne({
            where: {
                id: options.id
            },
            attributes: {
                exclude: excludedAttributes
            },
            include: sequelizeInclude
        });
    }

    private checkUserError(e: Error): void {
        if (e instanceof BaseError === false) {
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
        const databaseError = e as BaseError;
        switch (databaseError.originalAsSequelizeError?.constraint) {
            case User.constraints.uniqueEmail:
                if(_.isNil(User.rawAttributes.email.field)) {
                    throw new WrappedError('Could not read the email field from sequelize raw attributes', e);
                }
                throw new AlreadyExistsError(`The email ${databaseError.fields && databaseError.fields[User.rawAttributes.email.field] || ''} already exists`);
            default:
                throw new WrappedError(Constants.ErrorMessage.UNKNOWN_DATABASE_ERROR_MESSAGE, e);
        }
    }

    async createUser(userObject: Partial<User>): Promise<User> {
        try {
            return await User.create(userObject);
        } catch (e) {
            this.checkUserError(e);
            throw new WrappedError(Constants.ErrorMessage.UNKNOWN_APPLICATION_ERROR_MESSAGE, e);
        }
    }

    getSession(uuid: string): Promise<Session> {
        return Session.findOne({
            where: {
                uuid,
                active: true
            }
        });
    }

    createSession(userId: number): Bluebird<Session> {
        const expiresAt: Date = moment().add(sessionLife, 'hour').toDate();
        return Session.create({
            userId,
            uuid: uuidv4(),
            expiresAt: expiresAt,
            active: true
        });
    }

    async login(email: string, password: string): Promise<Session | null> {
        const user: User = await this.getUserByEmail(email);
        if (user == null)
            return null;

        if (!user.verified) {
            return null;
        }

        if (await comparePassword(password, user.password)) {
            return this.createSession(user.id);
        }
        return null;
    }

    async logout(uuid: string): Promise<[number, Session[]]> {
        return Session.update({
            active: false
        }, {
            where: {
                uuid
            }
        });
    }

    async registerUser(options: RegisterUserOptions): Promise<RegisterUserResponse> {
        const {
            baseUrl,
            userObject
        } = options;

        const emailDomain = userObject.email.split('@')[1];

        const universities = await universityController.getUniversitiesAssociatedWithEmail({
            emailDomain
        });
        if (universities.length < 1) {
            throw new NoAssociatedUniversityError(`There is no university associated with the email domain ${emailDomain}`);
        }
        if (universities.length > 1) {
            logger.error(`Multiple universities found ${universities.length}`);
        }
        const university = universities[0];


        if (university.studentEmailDomain === emailDomain) {
            userObject.roleId = Role.STUDENT;
        } else if (university.profEmailDomain === emailDomain) {
            userObject.roleId = Role.PROFESSOR;
        } else {
            throw new Error('This should not be possible since the email domain came up in the university query');
        }

        userObject.universityId = university.id;
        if (university.verifyInstitutionalEmail) {
            userObject.verifyToken = uuidv4();
        } else {
            userObject.verified = true;
        }
        userObject.password = await hashPassword(userObject.password);    
        const newUser = await this.createUser(userObject);
        let emailSent = false;
        if (university.verifyInstitutionalEmail) {
            const verifyURL = new URL(`/verify/${newUser.verifyToken}`, baseUrl);
            try {
                await emailHelper.sendEmail({
                    content: `Hello,
    
                    Please verify your account by clicking this url: ${verifyURL}
                    `,
                    email: newUser.email,
                    subject: 'Please verify account'
                });
                emailSent = configurations.email.enabled;
            } catch (e) {
                logger.error(e);
            }
        }

        return {
            id: newUser.id,
            roleId: newUser.roleId,
            emailSent,
            verificationBypass: !university.verifyInstitutionalEmail
        };
    }

    async verifyUser(verifyToken: string): Promise<boolean> {
        const updateResp = await User.update({
            verified: true,
            actuallyVerified: true
        }, {
            where: {
                verifyToken,
                verified: false
            }
        });
        return updateResp[0] > 0;
    }

    async forgotPassword({
        email
    }: ForgotPasswordOptions): Promise<void> {
        await userRepository.updateUser({
            updates: {
                forgotPasswordToken: uuidv4(),
                // TODO make configurable
                forgotPasswordTokenExpiresAt: moment().add(1, 'days').toDate()    
            },
            where: {
                email
            }
        });
    }
}
const userController = new UserController();
export default userController;
