import * as _ from 'lodash';

interface AnyKeyDictionary<ItemType> {
    [key: string]: ItemType[];
    [key: number]: ItemType[];
};

// https://stackoverflow.com/a/49942988
declare module 'lodash' {
    interface LoDashStatic {
        // deepMapKeys<T>(obj: T, fn: (value: unknown, key: string, keyPath?: string) => unknown, keyPath?: string): unknown;
        deepKeys(obj: unknown, keyPath?: string): string[];
        isSomething<T>(value: T | null | undefined): value is T;
        pickWithArrays(obj: unknown, ...paths: string[]): unknown;
        removeArrayIndexesFromDeepKeys(paths: string[]): string[];
        diffObject<BaseObjectType, ObjectToCompareType>(baseObject: BaseObjectType, objectToCompare: ObjectToCompareType): [keyof ObjectToCompareType, unknown][];
        assignEntries <ObjectType>(obj: ObjectType, changes: [string | number | symbol, unknown][]): ObjectType;
        assignChanges <ObjectType, ChangesType>(obj: ObjectType, changes: ChangesType): ObjectType;
        keyByWithArrays <ItemType extends object>(arr: Array<ItemType>, key: keyof ItemType): AnyKeyDictionary<ItemType>;
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
    },
    diffObject: <BaseObjectType, ObjectToCompareType>(baseObject: BaseObjectType, objectToCompare: ObjectToCompareType): [keyof ObjectToCompareType, unknown][] => {
        return _.differenceWith(Object.entries(objectToCompare), Object.entries(baseObject), (a, b) => {
            return a[0] === b[0] && _.isEqual(a[1], b[1]);
        }) as [keyof ObjectToCompareType, unknown][];
    },
    assignEntries: <ObjectType>(obj: ObjectType, changes: [string | number | symbol, unknown][]): ObjectType => {
        changes.forEach(change => {
            // For assign it becomes difficult to be type safe
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (obj as any)[change[0]] = change[1];
        });
        return obj;
    },
    /*
    Example
    ```
    const result = _.assignChanges({
        a: 1,
        b: 2,
        c: 3,
    }, {
        a: 1,
        b: 4,
        d: 5
    });
    ```
    Expected result
    ```
    a 1
    b 4
    c 3
    d 5
    ```
    */
    assignChanges: <ObjectType, ChangesType>(obj: ObjectType, changes: ChangesType): ObjectType => {
        const actualChanges = _.diffObject(obj, changes);
        return _.assignEntries(obj, actualChanges);
    },
    keyByWithArrays: <ItemType extends object>(arr: Array<ItemType>, key: keyof ItemType): AnyKeyDictionary<ItemType> => {
        return _.reduce(arr, (agg: AnyKeyDictionary<ItemType>, n: ItemType): AnyKeyDictionary<ItemType> => {
            const aggKey = n[key] as unknown as string | number;
            if (_.isNil(agg[aggKey])) {
                agg[aggKey] = [n];
            } else {
                agg[aggKey].push(n);
            }
            return agg;
        }, {});
    }    
});
