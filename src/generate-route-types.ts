const fs = require('fs');
const path = require('path');
import './extensions/array-extension';
import * as _ from 'lodash';

const getPathStat = (filePath: string): any => {
    return new Promise((resolve, reject) => {
        fs.stat(filePath, (error: any, stats: any) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stats);
        })
    });
}

const isDirectory = async (filePath: string): Promise<boolean> => {
    return (await getPathStat(filePath)).isDirectory();
}
const listFilesInDirectory = (filePath: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        fs.readdir(filePath, (err: any, files: string[]) => {
            if (err) {
                reject(err);
                return;
            };
            resolve(files);
        });
    })
}

const recursiveListFilesInDirectory = async (filePath: string, result: string[], filter: (filePath: string) => boolean): Promise<any> => {
    const isDir = await isDirectory(filePath);
    if (isDir) {
        const files = await listFilesInDirectory(filePath);
        // TODO fix async for each
        const promises:any = files.asyncForEach(async (listFilePath) => {
            const resultPath = path.resolve(path.join(filePath, listFilePath));
            return await recursiveListFilesInDirectory(resultPath, result, filter);
        });
        await Promise.all(promises);
    } else {
        if (filter(filePath)) {
            result.push(filePath);
        }
    }
    return result;
}

const writeFile = (filePath: string, fileContent: string) => {
    return new Promise((resolve, reject) => {
        const options = {
            encoding: 'utf8',
            flag: 'w'
        };
        fs.writeFile(filePath, fileContent, options, (err: any) => {
            if (err) {
                reject(err);
                return;
            }
        })
    })
}


(async () => {
    const result: string[] = [];
    await recursiveListFilesInDirectory('./', result, (filePath: string) => {
        return filePath.endsWith('-route-validation.ts');
    });
    result.asyncForEach(async (validationFilePath) => {
        const validationFileName = path.basename(validationFilePath);
        const validationObject = require(validationFilePath);
        let requestTypeFileContent = '';
        requestTypeFileContent +=
`
/**
 * THIS FILE IS AUTO GENERATED
 * DO NOT MODIFY!!!
 * TO UPDATE THIS FILE CHANGE THE SCHEMES IN THE \`-route-validation.ts\` FILES
 * THEN RUN \`npm run generate-route-types\`
 */

import * as Joi from '@hapi/joi';
import 'joi-extract-type'
import * as validations from './${path.parse(validationFileName).name}'
`;

        Object.keys(validationObject).forEach((key:string) => {
            requestTypeFileContent +=
`
namespace ${_.upperFirst(key).replace(/Validation$/, '')}Request {
    export type params = Joi.extractType<typeof validations.${key}.params>;
    export type query = Joi.extractType<typeof validations.${key}.query>;
    export type body = Joi.extractType<typeof validations.${key}.body>;
};
`;
        });

        const requestTypeFilePath = validationFilePath.replace(/-validation.ts$/, '-request-types.ts');
        await writeFile(requestTypeFilePath, requestTypeFileContent);
    })
})()