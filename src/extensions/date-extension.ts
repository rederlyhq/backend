import * as moment from 'moment';

// We need this declare because this file has an import
declare global {
    interface Date {
        toMoment(): moment.Moment;
    }
}
​
Date.prototype.toMoment = function (): moment.Moment {
    return moment(this);
};
