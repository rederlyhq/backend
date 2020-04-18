require('dotenv').config();
import configurations from './configurations';
const enableddMarker = new Array(20).join('*');
const disableddMarker = new Array(20).join('#');
if(configurations.email.enabled) {
    console.log(`${enableddMarker} EMAIL ENABLED ${enableddMarker}`);
} else {
    console.log(`${disableddMarker} EMAIL DISABLED ${disableddMarker}`);
}

import './database';
import './server';

// import emailHelper from './utilities/email-helper';

// emailHelper.sendEmail({
//     content: "New email",
//     email: "tommylettieri@gmail.com",
//     subject: "TESTEST"
// })