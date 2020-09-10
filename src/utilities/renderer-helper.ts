import axios from 'axios';
import configurations from '../configurations';
import Role from '../features/permissions/roles';
import * as _ from 'lodash';
import * as Joi from '@hapi/joi';
import 'joi-extract-type';
import * as FormData from 'form-data';
import * as qs from 'qs';

const rendererAxios = axios.create({
    baseURL: configurations.renderer.url,
    responseType: 'json',
});

export const RENDERER_ENDPOINT = '/rendered';

export enum OutputFormat {
    SINGLE = 'single',
    SIMPLE = 'simple'
}

export interface GetProblemParameters {
    sourceFilePath?: string;
    problemSeed?: number;
    formURL: string;
    baseURL?: string;
    outputformat?: OutputFormat;
    problemSource?: boolean;
    format?: string;
    lanugage?: string;
    showHints?: boolean;
    showSolutions?: boolean | number;
    permissionLevel?: number | number;
    problemNumber?: number;
    numCorrect?: number;
    numIncorrect?: number;
    processAnswers?: boolean;
    formData?: any;
}

/* eslint-disable @typescript-eslint/camelcase */
export const rendererResponseValidationScheme = Joi.object({
    answers: Joi.object().pattern(/\w+/, Joi.object({
        _filter_name: Joi.string().optional(), // Should be required, but we've seen problem source mess with the object with and drop the field
        correct_ans: Joi.any().optional(), // I have seen string and number // REQUIRED BUT I SAW AN EXISTING PROBLEM WHERE AnSwEr0002 only had a name
        original_student_ans: Joi.string().allow('').optional(), // TODO more validation with form data? // Should be required, but we've seen problem source mess with the object with and drop the field
        preview_latex_string: Joi.string().allow('').allow(null).optional(), // TODO has special characters that seem to block string // Should be required, but we've seen problem source mess with the object with and drop the field
        score: Joi.number().min(0).max(1).optional(), // Should be required, but we've seen problem source mess with the object with and drop the field
        student_ans: Joi.string().allow('').optional(), // Should be required, but we've seen problem source mess with the object with and drop the field
        correct_ans_latex_string: Joi.string().optional(), // TODO I don't see this in the object
        entry_type: Joi.string().allow(null).optional(),
        // ans_label: Joi.string().required(), // DOCUMENT SAYS DO NOT KEEP
        // ans_message: Joi.string().required(), // DOCUMENT SAYS DO NOT KEEP
        // ans_name: Joi.string().required(), // DOCUMENT SAYS DO NOT KEEP
        // preview_text_string: Joi.string().required(), // DOCUMENT STATES AS INCONSISTENT
        // type: Joi.string().required(), // DOCUMENT SAYS DO NOT KEEP
        // done: Joi.any(), // Was null don't know what type it is
        // error_flag: Joi.any(), // Was null don't know what type it is // DOCUMENT NOT SURE, OMITTING
        // error_message: Joi.string().required(), // Was empty string when not set // DOCUMENT NOT SURE, OMITTING 
        // extra: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // firstElement: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // ignoreInfinity: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // ignoreStrings: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // implicitList: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // isPreview: Joi.any().required(), // DOCUMENT SAYS DO NOT KEEP
        // list_type: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // ordered: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // partialCredit: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // removeParens: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // requireParenMatch: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // short_type: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // showCoordinateHints: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // showEqualErrors: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // showHints: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // showLengthHints: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // showParenHints: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // showTypeWarnings: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // showUnionReduceWarnings: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // student_formula: Joi.any().optional(), // DOCUMENT NOT SURE, OMITTING
        // student_value: Joi.any().optional(), // DOCUMENT NOT SURE, OMITTING
        // studentsMustReduceUnions: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // typeMatch: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
    })).required(),
    debug: Joi.object({
        // TODO are these required or optional
        debug: Joi.array().items(Joi.string()).required(),
        internal: Joi.array().items(Joi.string()).required(),
        perl_warn: Joi.string().allow('').required(),
        pg_warn: Joi.array().items(Joi.string()).required(),
        render_warn: Joi.array().items(Joi.string()).optional(), // THIS FIELD IS NEW, replace with required 
        // TODO add renderer version when implemented
        // TODO add problem version when implemented
    }).optional(), // THIS FIELD IS NEW, replace with required
    flags: Joi.object({
        // comment: Joi.any().optional(), // DOCUMENT STATES AS INCONSISTENT
        // PROBLEM_GRADER_TO_USE: Joi.any(), // DOCUMENT SAYS DO NOT KEEP
        // recordSubmittedAnswers: Joi.any(), // DOCUMENT SAYS DO NOT KEEP
        // refreshCachedImages: Joi.any(), // DOCUMENT SAYS DO NOT KEEP
        // showpartialCorrectAnswers: Joi.any(), // DOCUMENT SAYS DO NOT KEEP
        // showHint: Joi.any(), // DOCUMENT NOT SURE, OMITTING
        ANSWER_ENTRY_ORDER: Joi.array().items(Joi.string()).required(),
        KEPT_EXTRA_ANSWERS: Joi.array().items(Joi.string()).required(),
        showHintLimit: Joi.number().required(),
        showPartialCorrectAnswers: Joi.number().min(0).max(1).optional(),
        solutionExists: Joi.number().min(0).max(1).required(),
        hintExists: Joi.number().min(0).max(1).required(),
    }).required(),
    form_data: Joi.any().required(),
    problem_result: Joi.object({
        errors: Joi.string().allow('').required(),
        msg: Joi.string().allow('').required(),
        score: Joi.number().min(0).max(1).required(),
        type: Joi.string().required(),
    }).required(),
    // problem_state: Joi.any(), // DOCUMENT SAYS DO NOT KEEP
    renderedHTML: Joi.string().optional(), // We need to parse this out and delete before saving in the database
}).required();
/* eslint-enable @typescript-eslint/camelcase */
export type RendererResponse = Joi.extractType<typeof rendererResponseValidationScheme>;

class RendererHelper {
    getOutputFormatForPermission = (permissionLevel: number): OutputFormat => {
        if (permissionLevel < 10) {
            return OutputFormat.SINGLE;
        } else {
            return OutputFormat.SIMPLE;
        }
    };

    getPermissionForRole = (role: Role): number => {
        switch (role) {
            case Role.STUDENT:
                return 0;
            case Role.PROFESSOR:
                return 10;
            case Role.ADMIN:
                return 20;
            default:
                return -1;
        }
    }

    getOutputFormatForRole = (role: Role): OutputFormat => this.getOutputFormatForPermission(this.getPermissionForRole(role));

    cleanRendererResponseForTheDatabase = (resp: RendererResponse): Partial<RendererResponse> => {
        // I don't know if this method could be used if we needed nested keys
        // I'm back and forth between using _.pick and joi validation
        return _.pick(resp, [
            'form_data'
        ]);
    }

    cleanRendererResponseForTheResponse = (resp: RendererResponse): Partial<RendererResponse> => {
        // I don't know if this method could be used if we needed nested keys
        // I'm back and forth between using _.pick and joi validation
        return _.pick(resp, [
            'renderedHTML'
        ]);
    }
        if (typeof (resp) === 'string') {
            resp = JSON.parse(resp);
        }
        resp = resp as object;
        const result = await new Promise<RendererResponse>((resolve, reject) => {
            const onValidationComplete = (err: Joi.ValidationError, validated: any): void => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(validated);
            };

            Joi.validate(resp, rendererResponseValidationScheme, {
                abortEarly: true,
                allowUnknown: true,
                stripUnknown: true,
            }, onValidationComplete);
        });

        return result;
    };


    async getProblem({
        sourceFilePath,
        problemSource,
        problemSeed,
        formURL,
        baseURL = '/',
        outputformat,
        lanugage,
        showHints,
        showSolutions,
        permissionLevel,
        problemNumber,
        numCorrect,
        numIncorrect,
        processAnswers,
        format = 'json',
        formData
    }: GetProblemParameters): Promise<unknown> {
        let resultFormData: FormData | null = null;
        const params = {
            sourceFilePath,
            problemSource,
            problemSeed,
            formURL,
            baseURL,
            outputformat,
            format,
            lanugage,
            showHints: _.isNil(showHints) ? undefined : Number(showHints),
            showSolutions: Number(showSolutions),
            permissionLevel,
            problemNumber,
            numCorrect,
            numIncorrect,
            processAnswers,
        };
        formData = {
            ...formData,
            ...params
        };
        if (!_.isNil(formData)) {
            resultFormData = new FormData();

            for (const key in formData) {
                // append throws error if value is null
                if (_.isNil(formData[key])) {
                    continue;
                }

                if (_.isArray(formData[key])) {
                    formData[key].forEach((data: any) => {
                        resultFormData?.append(key, data);
                    });
                } else {
                    resultFormData?.append(key, formData[key]);
                }
                // resultFormData.append(formData[key], key);
            }
        }
        try {
            const submitParams = {
                body: formData,
                method: 'post',
            };

            // const resp = await fetch(`${configurations.renderer.url}/${RENDERER_ENDPOINT}?${qs.stringify(_({
            //     sourceFilePath,
            //     problemSource,
            //     problemSeed,
            //     formURL,
            //     baseURL,
            //     outputformat,
            //     format,
            //     lanugage,
            //     showHints: _.isNil(showHints) ? undefined : Number(showHints),
            //     showSolutions: Number(showSolutions),
            //     permissionLevel,
            //     problemNumber,
            //     numCorrect,
            //     numIncorrect,
            //     processAnswers,
            // }).omitBy(_.isUndefined).value())}`, submitParams);

            // const resp = await rendererAxios.get(RENDERER_ENDPOINT, {
            const resp = await rendererAxios.post(RENDERER_ENDPOINT, resultFormData?.getBuffer(), {
                headers: resultFormData?.getHeaders()
            });

            return resp.data;
        } catch (e) {
            throw e;
        }
    }
}

const rendererHelper = new RendererHelper();
export default rendererHelper;
