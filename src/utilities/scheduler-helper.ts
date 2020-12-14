import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as path from 'path';
import configurations from '../configurations';

const BASE_PATH = '';
const SET_JOB_ENDPOINT = path.posix.join(BASE_PATH, '/set_job/');
const LIST_SCHEDULED_JOBS_ENDPOINT = path.posix.join(BASE_PATH, '/list_scheduled_jobs/');
const LIST_FAILED_JOBS_ENDPOINT = path.posix.join(BASE_PATH, '/list_failed_jobs/');
const GET_JOB_ENDPOINT = path.posix.join(BASE_PATH, '/get_job/');
const DELETE_EVENT_ENDPOINT = path.posix.join(BASE_PATH, '/delete_job/');

export interface SchedulerHelperConfigurations {
    apiKey: string;
    baseURL: string;
    schedulerRequestTimeout: number;
    schedulerResponseTimeout: number;
};

export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
}

export interface WebHookScheduleEvent {
    url: string;
    data?: unknown;
    // NOT IMPLEMENTED ON SCHEDULER SIDE (all below this line)
    method?: HttpMethod;
    headers?: string;
    timeout?: number;
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
    private readonly schedulerResponseTimeout: number;

    constructor({
        apiKey,
        baseURL,
        schedulerRequestTimeout,
        schedulerResponseTimeout
    }: SchedulerHelperConfigurations) {
        this.apiKey = apiKey;
        this.schedulerResponseTimeout = schedulerResponseTimeout;
        this.axios = axios.create({
            baseURL: baseURL,
            responseType: 'json',
            timeout: schedulerRequestTimeout
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
            method = HttpMethod.POST,
            url,
            data,
            headers = 'User-Agent: NULL',
            timeout = this.schedulerResponseTimeout,
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
    // Not implemented
    apiKey: '9cb638fda0429506a2a6afd23accaa52',
    baseURL: configurations.scheduler.basePath,
    schedulerRequestTimeout: configurations.scheduler.schedulerRequestTimeout,
    schedulerResponseTimeout: configurations.scheduler.schedulerResponseTimeout,
});
export default schedulerHelper;
