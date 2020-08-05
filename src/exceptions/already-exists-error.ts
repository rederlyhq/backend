import WrappedError from './wrapped-error';

export default class AlreadyExistsError extends WrappedError {
    public name: string;
    constructor(message: string, cause?: Error) {
        super(message, cause);
        this.name = 'AlreadyExistsError';
    }
}
