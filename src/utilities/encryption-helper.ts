import bcrypt = require('bcrypt');
import configurations from '../configurations';

const {
    costFactor
} = configurations.auth;

export function hashPassword(password: string) {
    return bcrypt.hash(password, costFactor)
    .then((result:any) => {
        if(result) {
            return result;
        } else {
            throw new Error('No result obtained from bcrypt');
        }
    })
}

export function comparePassword(password:string, hash:string) {
    return bcrypt.compare(password, hash);
}