// https://schneidenbach.gitbooks.io/typescript-cookbook/content/nameof-operator.html
export const nameof = <T>(name: keyof T): unknown => name;

// https://gist.github.com/Navix/6c25c15e0a2d3cd0e5bce999e0086fc9
export type DeepPartial<T> = T extends Function ? T : (T extends object ? { [P in keyof T]?: DeepPartial<T[P]>; } : T);

export type EnumDictionary<T extends string | symbol | number, U> = {
    [K in T]?: U;
};
