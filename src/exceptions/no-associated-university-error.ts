import NotFoundError from './not-found-error';

export default class NoAssociatedUniversityError extends NotFoundError {
    public name: string;
    constructor(message: string) {
        super(message);
        this.name = 'NoAssociatedUniversityError';
    }
}
