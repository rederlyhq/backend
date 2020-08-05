import configurations from '../configurations';
import logger from '../utilities/logger';
import nodemailer = require('nodemailer');
import Mail = require('nodemailer/lib/mailer');
// There is no type def for sendgrid-transport
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sgTransport = require('nodemailer-sendgrid-transport');

interface EmailHelperOptions {
    user: string;
    key: string;
    from: string;
}

interface SendEmailOptions {
    content: string;
    email: string;
    subject: string;
}

class EmailHelper {
    private user: string;
    private key: string;
    private from: string;

    private client: Mail;

    constructor(options: EmailHelperOptions) {
        this.user = options.user;
        this.key = options.key;
        this.from = options.from;

        const clientOptions = {
            auth: {
                // defined configuartion param
                // eslint-disable-next-line @typescript-eslint/camelcase
                api_user: this.user,
                // defined configuartion param
                // eslint-disable-next-line @typescript-eslint/camelcase
                api_key: this.key, // TODO figure out why api key doesn't work
            }
        };

        this.client = nodemailer.createTransport(sgTransport(clientOptions));

    }

    // Returns the object that sendgrid returns which is any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendEmail(options: SendEmailOptions): Promise<any> {
        if (!configurations.email.enabled) {
            logger.warn('Email is disabled, returning empty promise...');
            return Promise.resolve();
        }

        const email = {
            from: this.from,
            to: options.email,
            subject: options.subject,
            text: options.content
        };

        // Nodemailer's callback uses any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Promise<any>((resolve: (data: any) => void, reject: (err: Error) => void) => {
            // Nodemailer's callback uses any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.client.sendMail(email, (err: Error, info: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(info);
                }
            });
        });
    }
}

const {
    from,
    key,
    user
} = configurations.email;

const emailHelper = new EmailHelper({
    from,
    key,
    user
});

export default emailHelper;
