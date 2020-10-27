import Axios, { AxiosInstance, AxiosResponse } from 'axios';
import configurations from '../configurations';
import logger from './logger';

interface AttachmentHelperOptions {
    presignedUrlBaseUrl: string;
    presignedUrlBasePath: string;
    baseUrl: string;
};

interface RequestPresignedURLResponse {
    upload_url: string;
}

interface GetPresignedURLResponse {
    uploadURL: string;
    cloudFilename: string;
}

class AttachmentHelper {
    private presignedUrlBaseUrl: string;
    private presignedUrlBasePath: string;
    private baseUrl: string;

    private presignedAxios: AxiosInstance;
    // private attachmentAxios: AxiosInstance;

    constructor({
        presignedUrlBaseUrl,
        presignedUrlBasePath,
        baseUrl
    }: AttachmentHelperOptions) {
        this.presignedUrlBaseUrl = presignedUrlBaseUrl;
        this.presignedUrlBasePath = presignedUrlBasePath;
        // our application shouldn't be doing any fetching of attachments so this shouldn't be needed
        // if we were to use it we should have another axios instance
        this.baseUrl = baseUrl;

        this.presignedAxios = Axios.create({
            baseURL: this.presignedUrlBaseUrl,
        });
    }

    private requestNewPresignedURL = (): Promise<AxiosResponse<RequestPresignedURLResponse>> => {
        return this.presignedAxios.get(this.presignedUrlBasePath);
    };

    getNewPresignedURL = async (): Promise<GetPresignedURLResponse> => {
        const result = await this.requestNewPresignedURL();
        return {
            uploadURL: result.data.upload_url,
            cloudFilename: this.parseTokenFromPresignedURL(result.data.upload_url)
        };
    }

    parseTokenFromPresignedURL = (presignedURL: string): string => {
        // Get the pathname from the url and stip off leading /
        let { pathname } = new URL(presignedURL);
        if (pathname.indexOf('/') !== 0) {
            // This should never happen because even the below is true, if the url is invalid it throws an error instead
            // new URL('http://rederly.com').pathname === '/'
            logger.error(`Expected presignedURL "${presignedURL}" to start with / but it didn't`);
        } else {
            pathname = pathname.substring(1);
            if (pathname.indexOf('/') >= 0) {
                /**
                 * This shouldn't happen unless something changes in which case we would remove this log
                 * If for instance the path added some prefix i.e. /a/b/c/${FILENAME} depending on how it handles it we could have an error
                 * If we had nesting in the future though where the path could be levels deep this would make sense
                 * I was going to make the assumption and take the last token of split('/') but I think since there is a valid case I'll leave it with just a warning
                 */
                logger.warn(`The pathname "${pathname}" is several levels deep which was not the case when implemented, this might result in errors`);
            }
        }
        return pathname;
    };

}

const options = configurations.attachments;
const attachmentHelper = new AttachmentHelper(options);
export default attachmentHelper;
