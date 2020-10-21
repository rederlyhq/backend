import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as path from 'path';

const DEFAULT_SCHEDULER_URL = 'http://localhost:3003';

const BASE_PATH = '';
const SET_JOB_ENDPOINT = path.posix.join(BASE_PATH, '/set_job/');
const LIST_SCHEDULED_JOBS_ENDPOINT = path.posix.join(BASE_PATH, '/list_scheduled_jobs/');
const LIST_FAILED_JOBS_ENDPOINT = path.posix.join(BASE_PATH, '/list_failed_jobs/');
const GET_JOB_ENDPOINT = path.posix.join(BASE_PATH, '/get_job/');
const DELETE_EVENT_ENDPOINT = path.posix.join(BASE_PATH, '/delete_job/');

export interface SchedulerHelperConfigurations {
    apiKey: string;
    baseURL?: string;
};

export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
}

export interface WebHookScheduleEvent {
    // NOT IMPLEMENTED ON SCHEDULER SIDE
    method: HttpMethod;
    url: string;
    // NOT IMPLEMENTED ON SCHEDULER SIDE
    headers?: string;
    data?: unknown;
    // NOT IMPLEMENTED ON SCHEDULER SIDE
    timeout?: number;
    // NOT IMPLEMENTED ON SCHEDULER SIDE
    sslCertBypass?: boolean;
};


interface ScheduleJob {
    id: string;
    time: Date;
    webHookScheduleEvent: WebHookScheduleEvent;
}

interface GetJobOptions {
    id: string;
}

interface DeleteJobOptions {
    id: string;
}

export class SchedulerHelper {
    private readonly apiKey: string;
    private readonly axios: AxiosInstance;
    
    constructor({
        apiKey,
        baseURL = DEFAULT_SCHEDULER_URL
    }: SchedulerHelperConfigurations) {
        this.apiKey = apiKey;
        this.axios = axios.create({
            baseURL: baseURL,
            responseType: 'json',
        });
    }

    listScheduledJobs = async (): Promise<AxiosResponse<unknown>> => {
        const result = await this.axios.get(LIST_SCHEDULED_JOBS_ENDPOINT, {
            // NOT IMPLEMENTED ON SCHEDULER SIDE
            headers: {
                'X-API-Key': this.apiKey
            }
        });
        return result;
    }

    listFailedJobs = async (): Promise<AxiosResponse<unknown>> => {
        const result = await this.axios.get(LIST_FAILED_JOBS_ENDPOINT, {
            // NOT IMPLEMENTED ON SCHEDULER SIDE
            headers: {
                'X-API-Key': this.apiKey
            }
        });
        return result;
    }

    getJob = async ({
        id,
    }: GetJobOptions): Promise<AxiosResponse<unknown>> => {
        const result = await this.axios.get(GET_JOB_ENDPOINT, {
            // NOT IMPLEMENTED ON SCHEDULER SIDE
            headers: {
                'X-API-Key': this.apiKey
            },
            params: {
                id,
            }
        });
        return result;
    }

    deleteJob = async ({
        id,
    }: DeleteJobOptions): Promise<AxiosResponse<unknown>> => {
        const result = await this.axios.post(DELETE_EVENT_ENDPOINT, {
            id: id
        }, {
            // NOT IMPLEMENTED ON SCHEDULER SIDE
            headers: {
                'X-API-Key': this.apiKey
            }
        });
        return result;
    }

    setJob = async ({
        id,
        time,
        webHookScheduleEvent: {
            method,
            url,
            data,
            headers = 'User-Agent: NULL',
            timeout = 30,
            sslCertBypass = false,
        }
    }: ScheduleJob): Promise<AxiosResponse<unknown>> => {
        try {
            const result = await this.axios.post(SET_JOB_ENDPOINT, {
                id: id,
                time: time,
                webHookScheduleEvent: {
                    method: method,
                    url: url,
                    data: data,
                    headers: headers,
                    timeout: timeout,
                    sslCertBypass: sslCertBypass
                }
            }, {
                headers: {
                    'X-API-Key': this.apiKey
                }
            });
            return result;
        } catch (e) {
            throw e;
        }
    }
}

const schedulerHelper = new SchedulerHelper({
    // apiKey: 'b85363e0f3876895b02b2dc630f09626'
    apiKey: '9cb638fda0429506a2a6afd23accaa52',
    // baseURL: 'http://ec2-18-223-247-120.us-east-2.compute.amazonaws.com:3012'
    baseURL: DEFAULT_SCHEDULER_URL
});
export default schedulerHelper;
