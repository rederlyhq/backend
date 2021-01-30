interface Array<T> {
    asyncForEach: (callbackfn: (value: T, index: number, array: T[]) => Promise<unknown>) => Promise<unknown[]>;
    sequentialAsyncForEach: (callbackfn: (value: T, index: number, array: T[]) => Promise<unknown>) => Promise<unknown[]>;
    first?: T;
}

Array.prototype.asyncForEach = function <T>(callbackfn: (value: T, index: number, array: T[]) => Promise<unknown>): Promise<unknown[]> {
    const promises: Promise<unknown>[] = [];
    this.forEach((value: T, index: number, array: T[]) => {
        const promise = callbackfn(value, index, array);
        promises.push(promise);
    });
    return Promise.all(promises);
};

Array.prototype.sequentialAsyncForEach = async function <T>(callbackfn: (value: T, index: number, array: T[]) => Promise<unknown>): Promise<unknown[]> {
    const results: unknown[] = [];
    for (let i = 0; i < this.length; ++i) {
        results.push(await callbackfn(this[i], i, this));
    };
    return results;
};

Object.defineProperty(Array.prototype, 'first', {
    get(this: Array<unknown>) {
        return this[0];
    },
    enumerable: false,
    configurable: true
});
