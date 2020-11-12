interface Array<T> {
    asyncForEach: (callbackfn: (value: T, index: number, array: T[]) => Promise<unknown>) => Promise<unknown[]>;
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

Object.defineProperty(Array.prototype, 'first', {
    get(this: Array<unknown>) {
        return this[0];
    },
    enumerable: false,
    configurable: true
});
