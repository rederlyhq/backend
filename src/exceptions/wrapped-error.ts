import * as _ from 'lodash';
import RederlyError from './rederly-error';

export default class WrappedError extends RederlyError {
    private cause?: Error;
    private msg: string;

    constructor(message: string, cause?: Error) {
        super(message);
        this.name = this.constructor.name;
        this.msg = message;
        this.cause = cause;
    }

    get combinedStack(): string {
        if (_.isNil(this.cause)) {
            return this.stack ?? '';
        } else {
            return `${this.stack}\nCaused by:\n${this.cause.stack}`;
        }
    }
}
