import * as _ from 'lodash';

export default class WrappedError extends Error {
    private cause?: Error;
    private msg: string;
    private _stack?: string;

    constructor(message: string, cause?: Error) {
        super(message);
        this.name = this.constructor.name;
        this.msg = message;
        this.cause = cause;
        this._stack = this.stack;
        // this.stack = "${this.stack}\nCaused by:\n${cause.stack}")
        Object.defineProperty(this, 'stack', {
            get: function () {
                if (_.isNil(this.cause)) {
                    return this._stack;
                } else {
                    return `${this._stack}\nCaused by:\n${this.cause.stack}`;
                }
                // return 'extended ' + this._stack;
            },
            set: function (value) {
                this._stack = value;
            }
        });
    }

    toJSON(): Partial<WrappedError> {
        return _.omit(this, '_stack');
    }
}
