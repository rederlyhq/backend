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
}

class RendererHelper {
    async getProblem(getProblemParameters: GetProblemParameters): Promise<any> {
        const resp = await rendererAxios.get('/rendered', {
            params: {
                sourceFilePath: getProblemParameters.sourceFilePath,
                problemSeed: getProblemParameters.problemSeed,
                formURL: getProblemParameters.formURL,
                template:'simple',
                format:'json',
            },
        });
        
        return resp.data;
    }
}

const rendererHelper = new RendererHelper();
export default rendererHelper;