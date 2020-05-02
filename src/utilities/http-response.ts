interface HttpResponse {
    message?: string,
    data?: any,
    statusCode: number,
    status: string
}

const createObject = (status: string, statusCode: number, message?: string, data?: any): HttpResponse => {
    const resp:HttpResponse = {
        statusCode,
        status
    }
    if (message !== undefined) {
        resp.message = message;
    }
    if (data !== undefined) {
        resp.data = data;
    }
    return resp;
}

export default {
    Ok: (message?: string, data?: any) => createObject("Ok", 200, message, data),
    Created: (message?: string, data?: any) => createObject("Created", 201, message, data),
    Accepted: (message?: string, data?: any) => createObject("Accepted", 202, message, data),
};