export default class NotFoundError extends Error {
    public name: string;
    constructor(message: string) {
        super(message);
        this.name = "NotFoundError";
    }
}