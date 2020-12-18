import { listFilters, recursiveListFilesInDirectory } from '../file-helper';
import * as fse from 'fs-extra';
import * as path from 'path';
import logger from '../logger';
import RederlyError from '../../exceptions/rederly-error';
import { getAllMatches } from '../string-helper';
const fsPromises = fse.promises;

export interface FindFilesImageFileOptions {
    imageFilePathFromPgFile: string;
    pgFilePath: string;
}

export interface FindFilesImageFileResult {
    imageFilePathFromPgFile: string;
    imageFilePath: string;
    imageFileName: string;
    resolvedRendererPath?: string;
}

export interface FindFilesPGFileOptions {
    contentRootPath: string;
    pgFilePathFromDefFile: string;
}

export interface FindFilesPGFileResult {
    pgFilePathFromDefFile: string;
    pgFilePathOnDisk: string;
    pgFileName: string;
    pgFileExists: boolean;
    resolvedRendererPath?: string;
    assetFiles: {
        imageFiles: { [key: string]: FindFilesImageFileResult };
    };
}

export interface FindFilesDefFileOptions {
    contentRootPath: string;
    defFilePath: string;
}

export interface FindFilesDefFileResult {
    pgFiles: { [key: string]: FindFilesPGFileResult };
    defFileRelativePath: string;
    defFileAbsolutePath: string;
    topicName: string;
}

export interface FindFilesOptions {
    filePath: string;
}

export interface FindFilesResult {
    defFiles: { [key: string]: FindFilesDefFileResult };
}

export const findDefFiles = (filePath: string): Promise<Array<string>> => {
    return recursiveListFilesInDirectory(filePath, [], listFilters.endsWith('.def', false));
};

/**
 * Regex maintains state so in order to safely use the regular expression (especially async) we should create a new one for each request
 * example:
 * const r = /^\s*source_file\s*=\s*(.*?\.pg\s*$)/igm;
 * r.test('source_file=a.pg') // true
 * r.test('source_file=ab.pg') // false
 * r.test('source_file=ab.pg') // true
 */
const pgFileInDefFileRegex = /^\s*source_file\s*=\s*(.*?\.pg\s*$)/igm;
const imageInPGFileRegex = /image\s*\(\s*(?:(?:'(.+?)')|(?:"(.+?)"))\s*(?:,.*)?\)/g;

const getContentRoot = async (filePath: string): Promise<string> => {
    const files = await fsPromises.readdir(filePath);
    if (files.length === 1) {
        try {
            const templatesPath = path.join(filePath, files[0], 'templates');
            const templatesDirStat = await fsPromises.lstat(templatesPath);
            if (templatesDirStat.isDirectory()) {
                return path.resolve(templatesPath);
            }
        } catch (e) {
            logger.error('Could not stat templates', e);
        }
    }
    return path.resolve(filePath);
};

export const checkImageFiles = ({ imageFilePathFromPgFile, pgFilePath }: FindFilesImageFileOptions): FindFilesImageFileResult => {
    const imageFilePath = path.join(path.dirname(pgFilePath), imageFilePathFromPgFile);
    const imageFileResult: FindFilesImageFileResult = {
        imageFilePathFromPgFile: imageFilePathFromPgFile,
        imageFilePath: imageFilePath,
        imageFileName: path.basename(imageFilePathFromPgFile)
    };
    return imageFileResult;
};

export const findFilesFromPGFile = async ({ contentRootPath, pgFilePathFromDefFile }: FindFilesPGFileOptions): Promise<FindFilesPGFileResult> => {
    const pgFilePath = path.join(contentRootPath, pgFilePathFromDefFile);
    const pgFileName = path.basename(pgFilePath);
    const pgFileResult: FindFilesPGFileResult = {
        pgFilePathFromDefFile: pgFilePathFromDefFile,
        pgFilePathOnDisk: pgFilePath,
        pgFileName: pgFileName,
        pgFileExists: await fse.pathExists(pgFilePath),
        assetFiles: {
            imageFiles: {}
        }
    };
    try {
        if (pgFileResult.pgFileExists) {
            const pgFileStats = await fsPromises.lstat(pgFilePath);
            if (!pgFileStats.isFile()) {
                throw new RederlyError(`${pgFilePath} is not a file`);
            }
            const pgFileContent = (await fsPromises.readFile(pgFilePath)).toString();
            const imageInPGFileMatches = getAllMatches(imageInPGFileRegex, pgFileContent);
            await imageInPGFileMatches.asyncForEach(async (imageInPGFileMatch) => {
                const imagePath = imageInPGFileMatch[1] ?? imageInPGFileMatch[2];
                pgFileResult.assetFiles.imageFiles[imagePath] = checkImageFiles({ imageFilePathFromPgFile: imagePath, pgFilePath });
            });    
        }
    } catch (e) {
        logger.error(`Could not read pg file ${pgFilePath}`, e);
    }
    return pgFileResult;
};

export const findFilesFromDefFile = async ({ contentRootPath, defFilePath }: FindFilesDefFileOptions): Promise<FindFilesDefFileResult> => {
    const defFileRelativePath = path.relative(contentRootPath, defFilePath);
    let topicName = path.basename(defFileRelativePath, path.extname(defFileRelativePath));
    if(topicName.substring(0, 3).toLowerCase() === 'set') {
        topicName = topicName.substring(3);
    } else {
        logger.warn(`Def file ${topicName} does not start with set`);
    }
    
    const defFileResult: FindFilesDefFileResult = {
        defFileAbsolutePath: defFilePath,
        defFileRelativePath: defFileRelativePath,
        topicName: topicName,
        pgFiles: {}
    };
    const defFileContent = (await fsPromises.readFile (defFilePath)).toString();
    const pgFileInDefFileMatches = getAllMatches(pgFileInDefFileRegex, defFileContent);
    await pgFileInDefFileMatches.asyncForEach(async (pgFileInDefFileMatch) => {
        const pgFilePathFromDefFile = pgFileInDefFileMatch[1];
        const pgFileResult = await findFilesFromPGFile({ contentRootPath, pgFilePathFromDefFile });
        defFileResult.pgFiles[pgFilePathFromDefFile] = pgFileResult;

    });
    return defFileResult;
};

export const findFiles = async ({ filePath }: FindFilesOptions): Promise<FindFilesResult> => {
    const contentRootPath = await getContentRoot(filePath);

    const defFiles = await findDefFiles(contentRootPath);
    const result: FindFilesResult = {
        defFiles: {}
    };
    await defFiles.asyncForEach(async (defFilePath) => {
        const defFileResult = await findFilesFromDefFile({ contentRootPath, defFilePath });
        result.defFiles[defFileResult.defFileRelativePath] = defFileResult;
    });

    return result;
};
