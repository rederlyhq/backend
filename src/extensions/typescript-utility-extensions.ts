// https://medium.com/@KevinBGreene/typescript-modeling-required-fields-with-mapped-types-f7bf17688786
// PartialWithRequiredFields<User, 'email' | 'firstName'>;
export type PartialWithRequiredFields<T, K extends keyof T> = {
    [X in Exclude<keyof T, K>]?: T[X]
} & {
    [P in K]-?: T[P]
}
// https://stackoverflow.com/a/51956054
// type KnownKeys<T> = {
//     [K in keyof T]: string extends K ? never : number extends K ? never : K
// } extends { [_ in keyof T]: infer U } ? U : never;

// export type RemoveIndex<T extends Record<any,any>> = Pick<T, KnownKeys<T>>;

// export type DeepRemoveIndex<T> = RemoveIndex<{
//     [P in keyof T]: DeepRemoveIndex<T[P]>;
// }>;

export type AddIndexSignature<DataType> = DataType & {
    [key: string]: unknown;
    [key: number]: unknown;
};

// These two could be combined but vscode seems to get confused and it makes debugging harder
type RecursiveAddIndexSignature<DataType> = {
    [P in keyof DataType]: AddIndexSignature<DeepAddIndexSignature<DataType[P]>>;
};

export type DeepAddIndexSignature<DataType> = AddIndexSignature<RecursiveAddIndexSignature<DataType>>;

// https://stackoverflow.com/a/61132308
// type DeepPartial<T> = {
//     [P in keyof T]?: DeepPartial<T[P]>;
// };
