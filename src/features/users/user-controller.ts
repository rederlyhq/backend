import emailHelper from '../../utilities/email-helper';
import { v4 as uuidv4 } from 'uuid';
import User from '../../database/models/user';
import Bluebird = require('bluebird');
import universityController from '../universities/university-controller';
import University from '../../database/models/university';

interface RegisterUserOptions {
    userObject:any,
    baseUrl: string
}

class UserController {
    constructor() {
    }

    createUser(userObject: any): Bluebird<User> {
        return User.create(userObject);
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
            if(universities.length < 1) {
                throw new Error('No associated university');
            }
            if(universities.length > 1) {
                console.error(`Multiple universities found ${universities.length}`);
            }
            university = universities[0];
        } catch(e) {
            console.error(e);
            return "Universery " + e.message;
        }

        if(university.student_email_domain === emailDomain) {
            console.log('User is student');
        } else if(university.prof_email_domain === emailDomain) {
            console.log('User is professor');
        } else {
            console.error('This should not be possible since the email domain came up in the university query');
        }
        userObject.university_id = university.id;
        userObject.verify_token = uuidv4();
        try {
            newUser = await this.createUser(userObject);
        } catch (e) {
            // TODO error handling
            console.error(e);
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
        } catch(e) {
            // TODO error handling
            return "Send Email " + e.message;
        }
        return newUser;
    }
}
const userController = new UserController();
export default userController;