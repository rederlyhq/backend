import * as pug from 'pug';

// Pug playground doesn't specifically need the database.
// import { sync } from '../database';

export const run = async (): Promise<void> => {
    const test = pug.compileFile('assets/emails/verification/html.pug');
    console.log(test({verifyToken: 'test123'}));
};
