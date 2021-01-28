/* eslint-disable @typescript-eslint/no-namespace */
export namespace Constants {
    export namespace Application {
        export const REDERLY_CLS_NAMESPACE_NAME = 'rederly-backend-api';
        export const MIN_PASSWORD_LENGTH = 4;
        export const MAX_PASSWORD_LENGTH = 26;
    }
    export namespace ErrorMessage {
        export const NIL_SESSION_MESSAGE = 'After the authentication middleware we should not be able to get a null session';
        export const UNKNOWN_APPLICATION_ERROR_MESSAGE = 'An unknown application error occurred';
        export const UNKNOWN_DATABASE_ERROR_MESSAGE = 'An unknown database error occurred';
    }
    export namespace Database {
        export const MIN_INTEGER_VALUE = -2147483648;
        export const MAX_INTEGER_VALUE = 2147483647;
    }
    export namespace Course {
        // TODO this should be configurable by professor, however currently that is not support
        // By using this constant we can delete it when implemented and then all points in which it was used become exposed
        export const SHOW_SOLUTIONS_DELAY_IN_DAYS = 1;
        export const INFINITE_ATTEMPT_NUMBER = 0;
    }
};
