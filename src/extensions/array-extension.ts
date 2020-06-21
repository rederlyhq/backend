interface Array<T> {
    asyncForEach: (callbackfn: (value: T, index: number, array: T[]) => Promise<void>) => void;
}

Array.prototype.asyncForEach = function<T>(callbackfn: (value: T, index: number, array: T[]) => Promise<void>): Promise<void>[] {
    const promises: Promise<void>[] = []
    this.forEach((value: T, index: number, array: T[]) => {
        const promise = callbackfn(value, index, array);
        promises.push(promise);
    });
    return promises;
}
