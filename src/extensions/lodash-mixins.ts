import * as _ from 'lodash';

// https://stackoverflow.com/a/49942988
declare module 'lodash' {
    interface LoDashStatic {
        // deepMapKeys<T>(obj: T, fn: (value: unknown, key: string, keyPath?: string) => unknown, keyPath?: string): unknown;
        deepKeys(obj: unknown, keyPath?: string): string[];
        isSomething<T>(value: T | null | undefined): value is T;
        pickWithArrays(obj: unknown, ...paths: string[]): unknown;
        removeArrayIndexesFromDeepKeys(paths: string[]): string[];
    }
}

_.mixin({
    deepKeys: (obj: unknown, keyPath?: string): Array<string> => {
        const results: string[][] = [];
        const result: string[] = [];
        results.push(result);

        if (_.isArray(obj)) {
            const mapResults = _.map(obj, (elm: unknown, index: number) => {
                const newKeyPath = keyPath ? `${keyPath}[${index}]` : `[${index}]`;
                return _.deepKeys(elm, newKeyPath);
            });
            return _.flatten(mapResults);
        } else {
            _.forOwn(obj, (value: unknown, key: string) => {
                const newKeyPath = keyPath ? `${keyPath}.${key}` : key;
                if(_.isPlainObject(value) || _.isArray(value)) {
                    results.push(_.deepKeys(value, newKeyPath));
                } else {
                    result.push(newKeyPath);
                }
            });    
        }
        return _.flatten(results);
    },
    removeArrayIndexesFromDeepKeys: (paths: string[]): string[] => {
        const r = /\[\d+\]/g;
        const adjustedPaths = paths.map(path => path.replace(r, '[]'));
        return _.uniq(adjustedPaths);
    },
    isSomething: _.negate(_.isNil),
    pickWithArrays: (obj: unknown, ...paths: string[]) => {
        const length = paths.length;
        const result = {};
        let index = -1;
        while (++index < length) {
            const path = paths[index];
            const arrIndex = path.indexOf('[].');
            if (arrIndex >= 0) {
                const arrPath = path.substring(0,arrIndex);
                const arr = _.isEmpty(arrPath) ? obj : _.get(obj, arrPath);
                let arrIndexIterator = -1;
                const arrLength = arr.length;
                while (++arrIndexIterator < arrLength) {
                    // This only replaces the first one
                    // If there are multiple they will get handled on future interations
                    paths.push(path.replace('[]', `[${arrIndexIterator}]`));
                }
                paths.splice(index, 1);
                --index;
            } else {
                const getResult = _.get(obj, path);
                _.set(result, path, getResult);
            }
        }
        return result;
    }
});
