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
import StudentGradeInstance from '../../database/models/student-grade-instance';
import sequelize = require('sequelize');
import PendingEnrollment from '../../database/models/pending-enrollment';
import courseController from '../courses/course-controller';
import { useNewDatabaseTransaction } from '../../utilities/database-helper';

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

    getUserByVerifyToken(verifyToken: string, confirmEmail: string): Promise<User> {
        return User.findOne({
            where: {
                verifyToken,
                email: confirmEmail.toLowerCase(),
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
            ],
            order: [
                // TODO: A global frontend flag that controls the sort order of lastName vs firstName.
                // Ignoring nulls because Sequelize fields should exist.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                [sequelize.fn('lower', sequelize.col(User.rawAttributes.firstName.field!)), 'ASC'],
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                [sequelize.fn('lower', sequelize.col(User.rawAttributes.lastName.field!)), 'ASC'],
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
            const user = users[i];
            const poorMansTemplate = `
            Hello ${user.firstName} ${user.lastName},

            You have received a message through Rederly:
            ${emailOptions.content}

            You can respond to ${emailOptions.replyTo} by replying to this email.
            `;
            emailPromises.push(emailHelper.sendEmail({
                template: 'generic',
                locals: {
                    SUBJECT_TEXT: emailOptions.subject,
                    BODY_TEXT: poorMansTemplate,
                },
                email: user.email,
                replyTo: emailOptions.replyTo,
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
            sequelizeGradeInclude.include.push({
                model: StudentGradeInstance,
                as: 'gradeInstances'
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
                    throw new AlreadyExistsError(`A user with the email ${userObject.email} already exists.`);
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
        const expiresAt: Date = moment().add(sessionLife, 'minute').toDate();
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
                template: 'verification',
                locals: {
                    verifyUrl: verifyURL
                },
                email: user.email,
            });
            emailSent = configurations.email.enabled;
        } catch (e) {
            // TODO: Does it make sense for this to be rethrown?
            logger.error(e);
        }
        return emailSent;
    }

    async registerUser(options: RegisterUserOptions): Promise<RegisterUserResponse> {
        const {
            baseUrl,
            userObject
        } = options;

        const emailDomain = userObject.email.split('@')[1]?.toLowerCase();

        if (_.isNil(emailDomain) || _.isEmpty(emailDomain)) {
            throw new NoAssociatedUniversityError('Could not parse the email domain.');
        }

        const universities = await universityController.getUniversitiesAssociatedWithEmail({
            emailDomain
        });
        if (universities.length < 1) {
            throw new NoAssociatedUniversityError(`There is no university associated with the email domain ${emailDomain}.`);
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
        userObject.paidUntil = university.paidUntil;
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

        /**
         * Async iffy to avoid transaction
         * We don't want to block registration because there is a bug with pending enrollment
         * We should check for pending enrollment when trying to access a course too
         */
        (async (): Promise<void> => {
            try {
                const pendingEnrollments = await PendingEnrollment.findAll({
                    where: {
                        email: newUser.email,
                        active: true
                    }
                });

                await pendingEnrollments.asyncForEach(pendingEnrollment => useNewDatabaseTransaction(async () => {
                    try {
                        await courseController.enrollManually({
                            courseId: pendingEnrollment.courseId,
                            userId: newUser.id,
                        });

                        await PendingEnrollment.update({
                            active: false,
                        }, {
                            where: {
                                active: true,
                                id: pendingEnrollment.id
                            }
                        });
                    } catch (err) {
                        logger.error(`Could not enroll newly registered user ${newUser.id} in ${pendingEnrollment.courseId}`, err);
                    }
                }));
            } catch(err) {
                logger.error(`Uncaught error enrolling newly registered user ${newUser.id}`, err);
            }
        })();

        return {
            id: newUser.id,
            roleId: newUser.roleId,
            emailSent,
            verificationBypass: !university.verifyInstitutionalEmail
        };
    }

    async verifyUser(verifyToken: string, confirmEmail: string): Promise<boolean> {
        const user = await this.getUserByVerifyToken(verifyToken, confirmEmail);
        if (_.isNil(user?.verifyToken)) {
            throw new IllegalArgumentException('Invalid verification token');
        } else if (user.verifyToken !== verifyToken) {
            throw new IllegalArgumentException('Invalid verification token');
        } else if (moment().isAfter(user.verifyTokenExpiresAt)) {
            throw new IllegalArgumentException('Verification token has expired');
        } else if (user.verified) {
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

        if (result.updatedRecords.length < 1) {
            throw new NotFoundError('There are no accounts registered with this email.');
        } else if (result.updatedRecords.length > 1) {
            logger.warn('Multiple users were updated for forgot password');
        }
        const user = result.updatedRecords[0];
        const resetURL = new URL(`/forgot-password/${user.forgotPasswordToken}`, baseUrl);
        const poorMansTemplate = `Hello ${user.firstName},

        To reset your password please follow this link: ${resetURL}
        
        If you received this email in error please contact support@rederly.com
        
        All the best,
        The Rederly Team
        `;
        await emailHelper.sendEmail({
            email,
            template: 'generic',
            locals: {
                SUBJECT_TEXT: 'Reset Rederly Password',
                BODY_TEXT: poorMansTemplate,
            },
            subject: 'Reset Rederly Password',
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
        // before we were using the email twice and didn't lower case the second time
        // logic has changed downstream but lowercasing here to make sure
        // getUserByEmail also lower cases
        email = email.toLowerCase();
        const user = await this.getUserByEmail(email);
        let validated = false;
        if(_.isNil(user?.forgotPasswordToken) || user.forgotPasswordToken !== forgotPasswordToken) {
            throw new IllegalArgumentException('The institutional email address (which you login with) is not valid for the current url. Please return to the login page and click `Forgot Password` again to get a new url.');
        } else if (moment(user.forgotPasswordTokenExpiresAt).isBefore(moment())) {
            throw new IllegalArgumentException('Your forgot password request has expired, please click forgot password on the home page again.');
        } else {
            validated = true;
        }

        if(!validated) {
            logger.error('Impossible! an error should have already been thrown for verification');
            throw new IllegalArgumentException('You could not be verified!');
        }

        user.password = await hashPassword(newPassword);
        user.forgotPasswordToken = null;
        user.forgotPasswordTokenExpiresAt = new Date();
        await user.save();
    }
}
const userController = new UserController();
export default userController;
