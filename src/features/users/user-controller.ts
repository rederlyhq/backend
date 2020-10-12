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
import { EmailOptions, GetUserOptions, ListUserFilter, RegisterUserOptions, RegisterUserResponse, ForgotPasswordOptions, UpdatePasswordOptions, UpdateForgottonPasswordOptions } from './user-types';
import { Constants } from '../../constants';
import userRepository from './user-repository';
import NotFoundError from '../../exceptions/not-found-error';
import IllegalArgumentException from '../../exceptions/illegal-argument-exception';
import ForbiddenError from '../../exceptions/forbidden-error';
import RederlyExtendedError from '../../exceptions/rederly-extended-error';

const {
    sessionLife
} = configurations.auth;

class UserController {
    getUserByEmail(email: string): Promise<User> {
        email = email.toLowerCase();
        return User.findOne({
            where: {
                email
            }
        });
    }

    getUserById(id: number): Promise<User> {
        return User.findOne({
            where: {
                id
            }
        });
    }

    getUserByVerifyToken(verifyToken: string): Promise<User> {
        return User.findOne({
            where: {
                verifyToken
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
                    where[`$courseEnrollments.${StudentEnrollment.rawAttributes.dropDate.field}$`] = null;
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
        if (e instanceof RederlyExtendedError === true) {
            // Already handled
            throw e;
        }
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
            if(!_.isNil(userObject.email)) {
                userObject.email = userObject.email.toLowerCase();
                const user = await this.getUserByEmail(userObject.email);
                if(!_.isNil(user)) {
                    throw new AlreadyExistsError(`A user with the email ${userObject.email} already exists`);
                }
            } else {
                logger.error('This should not happen, email should have been caught above');
                throw new IllegalArgumentException('Email is required to create a user!');
            }
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

        if (await comparePassword(password, user.password)) {
            if (!user.verified) {
                const university = await user.getUniversity();
                if(university.verifyInstitutionalEmail) {
                    throw new ForbiddenError('User has not been verified');
                }
            }
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

    async setupUserVerification({
        user,
        userEmail,
        refreshVerifyToken = true,
        baseUrl,
    }: {
        user?: User;
        userEmail?: string;
        refreshVerifyToken?: boolean;
        baseUrl: string;
    }): Promise<boolean> {
        let emailSent = false;
        if(_.isNil(user)) {
            if(_.isNil(userEmail)) {
                throw new IllegalArgumentException('If you do not supply a user you need to supply an email');
            }
            user = await this.getUserByEmail(userEmail);
        } else if(!_.isNil(userEmail)) {
            logger.warn('If user is provided there is no reason to provide an email, this seems like an error');
        }

        if(user.verified) {
            throw new IllegalArgumentException('This user is already verified');
        }

        if(refreshVerifyToken) {
            user.verifyToken = uuidv4();
            user.verifyTokenExpiresAt = moment().add(configurations.auth.verifyInstutionalEmailTokenLife, 'minutes').toDate();
            await user.save();
        }

        const verifyURL = new URL(`/verify/${user.verifyToken}`, baseUrl);
        try {
            await emailHelper.sendEmail({
                content: `Hello,

                Please verify your account by clicking this url: ${verifyURL}
                `,
                email: user.email,
                subject: 'Please verify account'
            });
            emailSent = configurations.email.enabled;
        } catch (e) {
            logger.error(e);
        }
        return emailSent;
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
        userObject.verifyToken = uuidv4();
        userObject.verifyTokenExpiresAt = moment().add(configurations.auth.verifyInstutionalEmailTokenLife, 'minutes').toDate();
        userObject.password = await hashPassword(userObject.password);    
        const newUser = await this.createUser(userObject);
        const emailSent = await this.setupUserVerification({
            baseUrl,
            // no need to refresh, we just created it
            refreshVerifyToken: false,
            user: newUser,
        });

        return {
            id: newUser.id,
            roleId: newUser.roleId,
            emailSent,
            verificationBypass: !university.verifyInstitutionalEmail
        };
    }

    async verifyUser(verifyToken: string): Promise<boolean> {
        const user = await this.getUserByVerifyToken(verifyToken);
        if (_.isNil(user?.verifyToken)) {
            throw new IllegalArgumentException('Invalid verification token');
        } else if(user.verifyToken !== verifyToken) {
            throw new IllegalArgumentException('Invalid verification token');
        } else if(moment().isAfter(user.verifyTokenExpiresAt)) {
            throw new IllegalArgumentException('Verification token has expired');
        } else if(user.verified) {
            logger.warn('Verification token should be set to null on verify, thus this should not be possible');
            throw new IllegalArgumentException('Already verified');
        } else {
            user.verified = true;
            user.actuallyVerified = true;
            user.verifyToken = null;
            user.save();
            return true;
        }
    }

    async forgotPassword({
        email,
        baseUrl
    }: ForgotPasswordOptions): Promise<void> {
        email = email.toLowerCase();
        const result = await userRepository.updateUser({
            updates: {
                forgotPasswordToken: uuidv4(),
                forgotPasswordTokenExpiresAt: moment().add(configurations.auth.forgotPasswordTokenLife, 'minutes').toDate()
            },
            where: {
                email
            }
        });

        if(result.updatedRecords.length < 1) {
            throw new NotFoundError('This user is not registered');
        } else if (result.updatedRecords.length > 1) {
            logger.warn('Multiple users were updated for forgot password');
        }
        const user = result.updatedRecords[0];
        const resetURL = new URL(`/forgot-password/${user.forgotPasswordToken}`, baseUrl);
        await emailHelper.sendEmail({
            email,
            subject: 'Reset Rederly Password',
            content: `Hello ${user.firstName},

To reset your password please follow this link: ${resetURL}

If you received this email in error please contact support@rederly.com

All the best,
The Rederly Team
`
        });
    }

    async updatePassword({
        newPassword,
        id,
        oldPassword
    }: UpdatePasswordOptions): Promise<void> {
        let validated = false;
        const user = await this.getUserById(id);
        if(await comparePassword(oldPassword, user.password)) {
            validated = true;
        } else {
            throw new IllegalArgumentException('Invalid password');
        }

        if(!validated) {
            logger.error('Impossible! an error should have already been thrown for verification');
            throw new IllegalArgumentException('You could not be verified!');
        }

        const where = _({
            id
        }).omitBy(_.isUndefined).value() as WhereOptions;

        if(Object.keys(where).length !== 1) {
            logger.error('Impossible! Somehow with all the checks I had the xor of id and email got through');
            throw new Error('An application error occurred');
        }

        const hashedPassword = await hashPassword(newPassword);
        await userRepository.updateUser({
            updates: {
                forgotPasswordToken: null,
                forgotPasswordTokenExpiresAt: new Date(),
                password: hashedPassword
            },
            where
        });
    }

    async updateForgottonPassword({
        newPassword,
        email,
        forgotPasswordToken,
    }: UpdateForgottonPasswordOptions): Promise<void> {

        const user = await this.getUserByEmail(email);
        let validated = false;
        if(_.isNil(user?.forgotPasswordToken) || user.forgotPasswordToken !== forgotPasswordToken) {
            throw new IllegalArgumentException('The institutional email address (which you login with) is not valid for the current url. Please check your set preferred email for a more up to date `Forgot Password` email or go to the homepage and make another request.');
        } else if (moment(user.forgotPasswordTokenExpiresAt).isBefore(moment())) {
            throw new IllegalArgumentException('Your forgot password request has expired, please click forgot password on the home page again.');
        } else {
            validated = true;
        }

        if(!validated) {
            logger.error('Impossible! an error should have already been thrown for verification');
            throw new IllegalArgumentException('You could not be verified!');
        }

        const where = _({
            email
        }).omitBy(_.isUndefined).value() as WhereOptions;

        if(Object.keys(where).length !== 1) {
            logger.error('Impossible! Somehow with all the checks I had the xor of id and email got through');
            throw new Error('An application error occurred');
        }

        const hashedPassword = await hashPassword(newPassword);
        await userRepository.updateUser({
            updates: {
                forgotPasswordToken: null,
                forgotPasswordTokenExpiresAt: new Date(),
                password: hashedPassword
            },
            where
        });
    }
}
const userController = new UserController();
export default userController;
