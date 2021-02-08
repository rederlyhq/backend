// interface Object {
//     asyncForOwn: (callbackfn: (value: unknown, key: string) => Promise<unknown>) => Promise<unknown[]>;
// }

import _ = require('lodash');

export const asyncForOwn = function<T> (object: Record<string | number, T>, callbackfn: (value: T, key: string | number) => Promise<unknown>): Promise<unknown[]> {
    const promises: Promise<unknown>[] = [];
    _.forOwn(object,
        (value: T, key: string) => {
            const promise = callbackfn(value, key);
            promises.push(promise);
        }
        );
    return Promise.all(promises);
};
