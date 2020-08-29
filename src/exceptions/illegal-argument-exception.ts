import RederlyExtendedError from './rederly-extended-error';

export default class IllegalArgumentException extends RederlyExtendedError {
    public name: string;
    constructor(message: string) {
        super(message);
        this.name = 'IllegalArgumentException';
    }
}
