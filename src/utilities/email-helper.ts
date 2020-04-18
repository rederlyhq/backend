import configurations from '../configurations';
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');

interface EmailHelperOptions {
    user: string,
    key: string,
    from: string,
}

interface SendEmailOptions {
    content: string,
    email: string,
    subject: string
}

class EmailHelper {
    private user: string;
    private key: string;
    private from: string;

    private client:any;

    constructor(options: EmailHelperOptions) {
        this.user = options.user;
        this.key = options.key;
        this.from = options.from;

        const clientOptions = {
            auth: {
              api_user: this.user,
              api_key: this.key, // TODO figure out why api key doesn't work
            }
          }
        
        this.client = nodemailer.createTransport(sgTransport(clientOptions));
        
    }

    sendEmail(options: SendEmailOptions): Promise<any> {
        if(!configurations.email.enabled) {
            console.warn('Email is disabled, returning empty promise...');
            return Promise.resolve();
        }
        
        const email = {
            from: this.from,
            to: options.email,
            subject: options.subject,
            text: options.content
          };
          
          return new Promise<any>((resolve: (data: any) => void, reject: (err: any) => void) => {
            this.client.sendMail(email, function(err:any, info:any){
                if (err){
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