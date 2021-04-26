export interface HttpResponse<DataType, StatusCodeType extends number> {
    message: string;
    data: DataType;
    statusCode: StatusCodeType;
    status: string;
}

const createObject = <DataType, StatusCodeType extends number>(status: string, statusCode: StatusCodeType, message: string, data: DataType): HttpResponse<DataType, StatusCodeType> => {
    const resp = {
        statusCode: statusCode,
        status: status,
        message: message,
        data: data,
    };
    return resp;
};

export default {
    Ok: <DataType>(message: string, data: DataType): HttpResponse<DataType, 200> => createObject('Ok', 200, message, data),
    Created: <DataType>(message: string, data: DataType): HttpResponse<DataType, 201> => createObject('Created', 201, message, data),
    Accepted: <DataType>(message: string, data: DataType): HttpResponse<DataType, 202> => createObject('Accepted', 202, message, data),

    BadRequest: <DataType>(message: string, data: DataType): HttpResponse<DataType, 400> => createObject('Bad Request', 400, message, data),
    Unauthorized: <DataType>(message: string, data: DataType): HttpResponse<DataType, 401> => createObject('Unauthorized', 401, message, data),
};
