import RederlyExtendedError from './rederly-extended-error';

export default class IllegalArgumentException extends RederlyExtendedError {
    public name: string;
    constructor(message: string, data?: unknown) {
        super(message, data);
        this.name = 'IllegalArgumentException';
    }
}
