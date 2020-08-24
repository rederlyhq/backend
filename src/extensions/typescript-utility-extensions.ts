// https://medium.com/@KevinBGreene/typescript-modeling-required-fields-with-mapped-types-f7bf17688786
// PartialWithRequiredFields<User, 'email' | 'firstName'>;
export type PartialWithRequiredFields<T, K extends keyof T> = {
    [X in Exclude<keyof T, K>]?: T[X]
} & {
    [P in K]-?: T[P]
}
