import bcrypt = require('bcrypt');

export function hashPassword(password: string) {
    // TODO add cost factor to configurations
    return bcrypt.hash(password, 8)
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