#!/usr/bin/env -S npx ts-node

import fs = require('fs');
import path = require('path');
import '../src/extensions';
import '../src/global-error-handlers';
import * as _ from 'lodash';
import { recursiveListFilesInDirectory, listFilters } from '../src/utilities/file-helper';

const fsPromises = fs.promises;

(async (): Promise<void> => {
    const result: string[] = [];
    await recursiveListFilesInDirectory('./', result, listFilters.endsWith('-route-validation.ts'));
    await result.asyncForEach(async (validationFilePath) => {
        const validationFileName = path.basename(validationFilePath);
        // Since this is a code generator we need to require dynamic paths
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const validationObject = require(validationFilePath);
        let requestTypeFileContent = '';
        requestTypeFileContent +=
            `/* eslint-disable @typescript-eslint/no-namespace */

/**
 * THIS FILE IS AUTO GENERATED
 * DO NOT MODIFY!!!
 * TO UPDATE THIS FILE CHANGE THE SCHEMES IN THE \`-route-validation.ts\` FILES
 * THEN RUN \`npm run generate-route-types\`
 */

import * as Joi from '@hapi/joi';
import 'joi-extract-type';
import * as validations from './${path.parse(validationFileName).name}';
`;

        Object.keys(validationObject).forEach((key: string) => {
            requestTypeFileContent +=
                `
export namespace ${_.upperFirst(key).replace(/Validation$/, '')}Request {
    export type params = Joi.extractType<typeof validations.${key}.params>;
    export type query = Joi.extractType<typeof validations.${key}.query>;
    export type body = Joi.extractType<typeof validations.${key}.body>;
};
`;
        });

        const requestTypeFilePath = validationFilePath.replace(/-validation.ts$/, '-request-types.ts');
        await fsPromises.writeFile(requestTypeFilePath, requestTypeFileContent, {
            encoding: 'utf8',
            flag: 'w'
        });
    });
})();
