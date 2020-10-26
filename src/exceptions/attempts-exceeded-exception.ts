import IllegalArgumentException from './illegal-argument-exception';

export default class AttemptsExceededException extends IllegalArgumentException {
    public name: string;
    constructor(message: string, data?: unknown) {
        super(message, data);
        this.name = 'AttemptsExceededException';
    }
}
