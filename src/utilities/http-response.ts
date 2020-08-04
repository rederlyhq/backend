interface HttpResponse {
    message?: string;
    // This is a generic object type for passing data down to the user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    statusCode: number;
    status: string;
}

// data is any object to pass back to the user
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createObject = (status: string, statusCode: number, message?: string, data?: any): HttpResponse => {
    const resp: HttpResponse = {
        statusCode,
        status
    };
    if (message !== undefined) {
        resp.message = message;
    }
    if (data !== undefined) {
        resp.data = data;
    }
    return resp;
};

export default {
    // Data is any object that you want to pass to the user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Ok: (message?: string, data?: any): HttpResponse => createObject("Ok", 200, message, data),
    // Data is any object that you want to pass to the user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Created: (message?: string, data?: any): HttpResponse => createObject("Created", 201, message, data),
    // Data is any object that you want to pass to the user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Accepted: (message?: string, data?: any): HttpResponse => createObject("Accepted", 202, message, data),
};
