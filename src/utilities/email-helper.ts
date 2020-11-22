import configurations from '../configurations';
import logger from '../utilities/logger';
import nodemailer = require('nodemailer');
import Mail = require('nodemailer/lib/mailer');
import _ = require('lodash');
// There is no type def for sendgrid-transport
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sgTransport = require('nodemailer-sendgrid-transport');

interface EmailHelperOptions {
    user: string;
    key: string;
    from: string;
}

interface SendEmailOptions {
    email: string;
    content?: string;
    html?: string;
    subject: string;
    replyTo?: string;
    // attachments: File;
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

        if (!_.isNil(options.content) && !_.isNil(options.html)) {
            logger.error('Email requires either content (text) or html to be set.');
        }

        const email: Mail.Options = {
            from: this.from,
            to: options.email,
            subject: options.subject,
            ...(options.content ? {text: options.content} : {html: options.html}),
            ...(options.replyTo ? {headers: {'Reply-To': options.replyTo }} : undefined)
        };

        // Nodemailer's callback uses any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Promise<any>((resolve: (data: any) => void, reject: (err: Error) => void) => {
            // Nodemailer's callback uses any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.client.sendMail(email, (err: Error | null, info: any) => {
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
