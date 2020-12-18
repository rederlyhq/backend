import fse = require('fs-extra');
import path = require('path');
import logger from './logger';
import * as _ from 'lodash';

const fsPromises = fse.promises;

type RecursiveListFilesInDirectoryFilterFunction = (filePath: string) => boolean;
export const listFilters = {
    /**
     * This method takes a string that a path must end with and returns a function that takes that path and compares
     * USAGE: await recursiveListFilesInDirectory('./', result, listFilters.endsWith('-route-validation.ts'));
     * @param endsWith The end of file paths to filter out
     */
    endsWith: (endsWith: string, caseSensitive = true) => (filePath: string): boolean => {
        let filePathTransformed = filePath;
        let endsWithTransformed = endsWith;
        if (caseSensitive === false) {
            filePathTransformed = filePath.toLowerCase();
            endsWithTransformed = endsWith.toLowerCase();
        }
        return filePathTransformed.endsWith(endsWithTransformed);
    },
    matches: (pattern: RegExp): RecursiveListFilesInDirectoryFilterFunction => (filePath: string): boolean => {
        return pattern.test(filePath);
    }
};

export const recursiveListFilesInDirectory = async (filePath: string, result: string[], filter: RecursiveListFilesInDirectoryFilterFunction): Promise<string[]> => {
    const fileStats = await fsPromises.lstat(filePath);
    if (fileStats.isDirectory()) {
        const files = await fsPromises.readdir(filePath);
        await files.asyncForEach(async (listFilePath: string) => {
            const resultPath = path.resolve(path.join(filePath, listFilePath));
            await recursiveListFilesInDirectory(resultPath, result, filter);
        });
    } else if (fileStats.isSymbolicLink()) {
        logger.debug(`recursiveListFilesInDirectory: skipping symbolic link: ${filePath}`);
    } else if (fileStats.isFile()) {
        if (filter(filePath)) {
            result.push(filePath);
        }
    } else if (fileStats.isSymbolicLink()) {
        logger.debug(`recursiveListFilesInDirectory: skipping symbolic link: ${filePath}`);
    } else {
        logger.error(`recursiveListFilesInDirectory: not a file, symbolic link, or directory: ${filePath}`);
    }
    return result;
};

export enum TAR_EXTENSION {
    GZ_SINGLE = '.tgz',
    GZ_DOUBLE = '.tar.gz'
}

export const determineTarExtension = (filename: string): TAR_EXTENSION | null => {
    const lower = filename.toLowerCase();
    if (lower.endsWith(TAR_EXTENSION.GZ_SINGLE)) return TAR_EXTENSION.GZ_SINGLE;
    else if (lower.endsWith(TAR_EXTENSION.GZ_DOUBLE)) return TAR_EXTENSION.GZ_DOUBLE;
    else return null;
};

export const stripTarGZExtension = (filename: string): string | null => {
    const tarExtension = determineTarExtension(filename);
    if (_.isNull(tarExtension)) return null;
    else return filename.substring(0, filename.length - tarExtension.length);
};
