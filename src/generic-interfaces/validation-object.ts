// Don't force explicit types, most of these are defined inline
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ValidationObject<QueryType = any, BodyType = any, ParamsType = any> {
    query: QueryType;
    body: BodyType;
    params: ParamsType;
}