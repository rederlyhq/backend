export default class NoAssociatedUniversityError extends Error{
    public name: string;
    constructor(message: string) {
        super(message);
        this.name = "NoAssociatedUniversityError";
    }
}