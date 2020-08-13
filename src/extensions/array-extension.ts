interface Array<T> {
    asyncForEach: (callbackfn: (value: T, index: number, array: T[]) => Promise<void>) => Promise<unknown[]>;
}

Array.prototype.asyncForEach = function <T>(callbackfn: (value: T, index: number, array: T[]) => Promise<void>): Promise<unknown[]> {
    const promises: Promise<unknown>[] = [];
    this.forEach((value: T, index: number, array: T[]) => {
        const promise = callbackfn(value, index, array);
        promises.push(promise);
    });
    return Promise.all(promises);
};
