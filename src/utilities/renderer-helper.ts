import axios from 'axios';
import configurations from '../configurations';

const rendererAxios = axios.create({
    baseURL: configurations.renderer.url,
    responseType: 'json',
});

interface GetProblemParameters {
    sourceFilePath: string;
    problemSeed: number;
    formURL: string;
    baseURL?: string;
    outputformat?: string;
    showSolution?: boolean;
    problemSource?: boolean;
    format?: string;
    lanugage?: string;
    showHints?: boolean;
    showSolutions?: boolean;
    permissionLevel?: number;
    problemNumber?: number;
    numCorrect?: number;
    numIncorrect?: number;
    processAnswers?: boolean;
}

class RendererHelper {
    async getProblem({
        sourceFilePath,
        problemSource,
        problemSeed,
        formURL,
        baseURL = '/',
        outputformat = 'single',
        lanugage,
        showHints,
        showSolutions,
        permissionLevel,
        problemNumber,
        numCorrect,
        numIncorrect,
        processAnswers,
        format = 'json',
        
    }: GetProblemParameters): Promise<unknown> {
        const resp = await rendererAxios.get('/rendered', {
            params: {
                sourceFilePath,
                problemSource,
                problemSeed,
                formURL,
                baseURL,
                outputformat,
                format,
                lanugage,
                showHints,
                showSolutions,
                permissionLevel,
                problemNumber,
                numCorrect,
                numIncorrect,
                processAnswers,
            },
        });

        return resp.data;
    }
}

const rendererHelper = new RendererHelper();
export default rendererHelper;
