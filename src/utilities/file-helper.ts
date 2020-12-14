import fse = require('fs-extra');
import path = require('path');
import logger from './logger';

const fsPromises = fse.promises;

export const listFilters = {
    endsWith: (endsWith: string) => (filePath: string): boolean => {
        return filePath.endsWith(endsWith);
    }
};

export const recursiveListFilesInDirectory = async (filePath: string, result: string[], filter: (filePath: string) => boolean): Promise<string[]> => {
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
