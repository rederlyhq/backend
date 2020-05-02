export default class AlreadyExistsError extends Error{
    public name: string;
    constructor(message: string) {
        super(message);
        this.name = "AlreadyExistsError";
    }
}