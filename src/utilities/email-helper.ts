import configurations from '../configurations';
import logger from '../utilities/logger';
import nodemailer = require('nodemailer');
import Mail = require('nodemailer/lib/mailer');
import _ = require('lodash');
import * as Email from 'email-templates';
import RederlyError from '../exceptions/rederly-error';
import path = require('path');
import * as aws from 'aws-sdk';

interface EmailHelperOptions {
    user: string;
    key: string;
    from: string;
}

type TemplateOptions = GenericTemplateOptions | VerificationTemplateOptions;

type SendEmailOptions = TemplateOptions & {
    email: string;
    content?: string;
    subject?: string;
    replyTo?: string;
    // attachments: File;
}

interface GenericTemplateOptions {
    template: 'generic',
    locals: {
        SUBJECT_TEXT: string;
        BODY_TEXT: string;
    },
}

interface VerificationTemplateOptions {
    template: 'verification',
    locals: {
        verifyUrl: string | URL;
    },
}

// This allows us to use default attachments for templates without having to pass them into every function.
// We could do this in the constructor, but if the attachment isn't used, it gets added as an actual attackment.
const getTemplateAttachments = (template: 'generic' | 'verification') => {
    switch (template) {
        case 'verification':
            return [{
                filename: 'favicon.png',
                path: 'assets/emails/rederly_favicon.png',
                cid: 'favicon'
            },];
        case 'generic':
            return [
                {
                  filename: 'rederly_logo.png',
                  path: 'assets/emails/rederly-logo-dark.png',
                  cid: 'dark_logo'
                },
            ];
        default:
            // All templates should at least have default branding.
            logger.error(`An unknown template ${template} was used.`);
            return [];
    }
}

class EmailHelper {
    private user: string;
    private key: string;
    private from: string;

    private client: Mail;
    private mailer: Email;

    constructor(options: EmailHelperOptions) {
        this.user = options.user;
        this.key = options.key;
        this.from = options.from;

        this.client = nodemailer.createTransport({
            SES: new aws.SES({
                apiVersion: '2010-12-01',
                credentials: {
                    accessKeyId: configurations.email.awsAccessKeyId,
                    secretAccessKey: configurations.email.awsSecretKey,
                },
                region: configurations.email.awsRegion,
            }),
            sendingRate: configurations.email.sendingRate ?? undefined,
        });

        this.mailer = new Email({
            views: {
                root: path.resolve('assets/emails')
            },
            message: {
                from: this.from,
                // Default attachments for all emails without the email client automatically blocking them.
                // GMail and Outlook do not support base64 data-urls.
                attachments: [
                ]
            },
            transport: this.client,
            send: configurations.email.enabled,
        });
    }

    // Returns the object that sendgrid returns which is any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendEmail(options: SendEmailOptions): Promise<any> {
        if (_.isNil(options.content) && _.isNil(options.template)) {
            logger.error('Email requires either content (text) or template (pug) to be set.');
            throw new RederlyError('Missing content for email.');
        }

        const email: Mail.Options = {
            from: this.from,
            to: options.email,
            subject: options.subject,
            text: options.content,
            ...(options.replyTo ? {headers: {'Reply-To': options.replyTo }} : undefined)
        };

        if (options.template) {
            return this.mailer.send({
                template: options.template,
                message: {
                    ...email,
                    attachments: [
                        ...getTemplateAttachments(options.template),
                    ]
                },
                locals: options.locals,
            });
        } else {
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
