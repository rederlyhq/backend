import * as _ from 'lodash';
import 'joi-extract-type';
import * as FormData from 'form-data';
import logger from './logger';

interface UnmergeStrategyOptions {
    key: string;
    array: Array<string | Blob>;
    form: FormData;
}

type UnmergeStrategyFunction = ({ key, array, form }: { key: string; array: Array<string | Blob>; form: FormData }) => void;

export const unmergeStrategies = {
    // unmerge strategies for arrays contained in objects -> form-data
    // arrays should be included in the form-data with unique keys for OpenLab
    unmergeUniqueKeysByIndex: ({ key, array, form }: UnmergeStrategyOptions): void => {
        array.forEach((value: string | Blob, index: number) => {
            form.append(`${key}${index + 1}`, value);
        });
    },
    // WeBWorK answer submission expects duplicated keys (for multiple-select problems)
    unmergeDuplicatingKey: ({ key, array, form }: UnmergeStrategyOptions): void => {
        array.forEach((value: string | Blob) => {
            form.append(key, value);
        });
    },
    unmergeJoinArray: (joinChar: string) => ({ key, array, form }: UnmergeStrategyOptions): void => {
        form.append(key, array.join(joinChar));
    }
};

class FormHelper {
    /**
     * This function converts objects into FormData
     * @param object the object to be converted
     * @param unmerge *optional* the subroutine tasked with handling arrays inside `object`
     * @returns the FormData converted from `object`
     */
    objectToFormData = ({
        object,
        unmerge,
    }: {
        object: { [key: string]: unknown };
        unmerge?: UnmergeStrategyFunction;
    }): FormData => {
        const formData = new FormData();
        for (const key in object) {
            const value = object[key] as unknown;
            // append throws error if value is null
            // We thought about stripping this with lodash above but decided not to
            // This implementation let's use put a breakpoint and debug
            // As well as the fact that it is minorly more efficient
            if (_.isNil(value)) {
                continue;
            }

            if (_.isArray(value)) {
                if (_.isNil(unmerge)) {
                    logger.error('FormHelper: object contains an array -- but no merge strategy was provided!');
                }
                unmerge?.({key, array: value, form: formData});
            } else {
                formData.append(key, value);
            }
        }
        return formData;
    };
}

const formHelper = new FormHelper();
export default formHelper;
