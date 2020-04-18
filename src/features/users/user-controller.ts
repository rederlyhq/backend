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

interface RegisterUserOptions {
    userObject: any,
    baseUrl: string
}

class UserController {
    constructor() {
    }

    getUserByEmail(email: string): Bluebird<User> {
        return User.findOne({
            where: {
                email
            }
        })
    }

    createUser(userObject: any): Bluebird<User> {
        return User.create(userObject);
    }

    getSession(uuid: string): Bluebird<Session> {
        return Session.findOne({
            where: {
                uuid
            }
        })
    }

    createSession(userId: number): Bluebird<Session> {
        const expiresAt: Date = moment().add(1, 'hour').toDate();
        return Session.create({
            user_id: userId,
            uuid: uuidv4(),
            expires_at: expiresAt,
            active: true
        })
    }

    async login(email: string, password: string) {
        let user: User = await this.getUserByEmail(email);
        if (user == null)
            return null;
        if (await comparePassword(password, user.password)) {
            return this.createSession(user.id);
        }
        return null;
    }

    async registerUser(options: RegisterUserOptions) {
        const {
            baseUrl,
            userObject
        } = options;
        // TODO add verification (we should add email verification at the route level)
        const emailDomain = userObject.email.split('@')[1];

        let newUser;
        let university: University;

        try {
            const universities = await universityController.getUniversitiesAssociatedWithEmail({
                emailDomain
            });
            if (universities.length < 1) {
                throw new Error('No associated university');
            }
            if (universities.length > 1) {
                logger.error(`Multiple universities found ${universities.length}`);
            }
            university = universities[0];
        } catch (e) {
            logger.error(e);
            return "Universery " + e.message;
        }

        if (university.student_email_domain === emailDomain) {
            logger.info('User is student');
        } else if (university.prof_email_domain === emailDomain) {
            logger.info('User is professor');
        } else {
            logger.error('This should not be possible since the email domain came up in the university query');
        }
        userObject.university_id = university.id;
        userObject.verify_token = uuidv4();
        userObject.password = await hashPassword(userObject.password);
        try {
            newUser = await this.createUser(userObject);
        } catch (e) {
            // TODO error handling
            logger.error(e);
            return "Create " + e.message;
        }

        try {
            await emailHelper.sendEmail({
                content: `Hello,

                Please verify your account by clicking this url: ${baseUrl}/users/verify?verify_token=${newUser.verify_token}
                `,
                email: newUser.email,
                subject: 'Please veryify account'
            });
        } catch (e) {
            // TODO error handling
            return "Send Email " + e.message;
        }
        return newUser;
    }
}
const userController = new UserController();
export default userController;