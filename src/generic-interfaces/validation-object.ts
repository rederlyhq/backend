// TODO figure out how to use this with joi-extra types
// with this used it won't infer the types and just call it any
// Don't force explicit types, most of these are defined inline
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ValidationObject<QueryType = any, BodyType = any, ParamsType = any> {
    query: QueryType;
    body: BodyType;
    params: ParamsType;
}