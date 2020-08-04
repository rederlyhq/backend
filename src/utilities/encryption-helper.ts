import bcrypt = require('bcrypt');
import configurations from '../configurations';

const {
    costFactor
} = configurations.auth;

export function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, costFactor)
        .then((result: string) => {
            if (result) {
                return result;
            } else {
                throw new Error('No result obtained from bcrypt');
            }
        })
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}
