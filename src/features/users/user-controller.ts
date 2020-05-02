import emailHelper from '../../utilities/email-helper';
import logger from '../../utilities/logger';
import { v4 as uuidv4 } from 'uuid';
import User from '../../database/models/user';
import Bluebird = require('bluebird');
import universityController from '../universities/university-controller';
import University from '../../database/models/university';
import { hashPassword, comparePassword } from '../../utilities/encryption-helper';
import Session from '../../database/models/session';
import moment = require('moment');
import configurations from '../../configurations';
import NoAssociatedUniversityError from '../../exceptions/no-associated-university-error';
import { UniqueConstraintError } from 'sequelize';
import AlreadyExistsError from '../../exceptions/already-exists-error';

interface RegisterUserOptions {
    userObject: any;
    baseUrl: string;
}

interface RegisterUserResponse {
    user: User;
    emailSent: boolean;
}

const {
    sessionLife
} = configurations.auth;

class UserController {
    getUserByEmail(email: string): Bluebird<User> {
        return User.findOne({
            where: {
                email
            }
        })
    }

    getUserById(id: number): Bluebird<User> {
        return User.findOne({
            where: {
                id
            }
        })
    }

    createUser(userObject: any): Bluebird<User> {
        return User.create(userObject);
    }

    getSession(uuid: string): Bluebird<Session> {
        return Session.findOne({
            where: {
                uuid,
                active: true
            }
        })
    }

    createSession(userId: number): Bluebird<Session> {
        const expiresAt: Date = moment().add(sessionLife, 'hour').toDate();
        return Session.create({
            // Database field
            // eslint-disable-next-line @typescript-eslint/camelcase
            user_id: userId,
            uuid: uuidv4(),
            // Database field
            // eslint-disable-next-line @typescript-eslint/camelcase
            expires_at: expiresAt,
            active: true
        })
    }

    async login(email: string, password: string): Promise<Session> {
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

        let newUser;

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


        if (university.student_email_domain === emailDomain) {
            logger.info('User is student');
        } else if (university.prof_email_domain === emailDomain) {
            logger.info('User is professor');
        } else {
            logger.error('This should not be possible since the email domain came up in the university query');
        }
        // Database object
        // eslint-disable-next-line @typescript-eslint/camelcase
        userObject.university_id = university.id;
        // Database object
        // eslint-disable-next-line @typescript-eslint/camelcase
        userObject.verify_token = uuidv4();
        userObject.password = await hashPassword(userObject.password);
        try {
            newUser = await this.createUser(userObject);
        } catch (e) {
            if (e instanceof UniqueConstraintError) {
                if (Object.keys(e.fields).includes('email')) {
                    throw new AlreadyExistsError(`The email ${e.fields.email} already exists`);
                }
            }
            throw e;
        }

        let emailSent = false;
        try {
            await emailHelper.sendEmail({
                content: `Hello,

                Please verify your account by clicking this url: ${baseUrl}/users/verify?verify_token=${newUser.verify_token}
                `,
                email: newUser.email,
                subject: 'Please veryify account'
            });
            emailSent = configurations.email.enabled;
        } catch (e) {
            logger.error(e);
        }

        return {
            user: newUser,
            emailSent
        }
    }

    async verifyUser(verifyToken: string): Promise<boolean> {
        const updateResp = await User.update({
            verified: true
        }, {
            where: {
                // Database object
                // eslint-disable-next-line @typescript-eslint/camelcase
                verify_token: verifyToken,
                verified: false
            }
        });
        return updateResp[0] > 0;
    }
}
const userController = new UserController();
export default userController;