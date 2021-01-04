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
    imageFileExists: boolean;
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

export interface BucketDefFileResult {
    parentDefFile: string;
    bucketDefFile: string;
    pgFilePathFromDefFile: string;
};

export interface FindFilesDefFileOptions {
    contentRootPath: string;
    defFilePath: string;
    bucketDefFiles: { [key: string]: BucketDefFileResult };
}

export interface FindFilesDefFileResult {
    pgFiles: { [key: string]: FindFilesPGFileResult };
    defFileRelativePath: string;
    defFileAbsolutePath: string;
    topicName: string;
    bucketDefFiles: { [key: string]: FindFilesDefFileResult};
}

export interface FindFilesOptions {
    filePath: string;
}

export interface FindFilesResult {
    defFiles: { [key: string]: FindFilesDefFileResult };
    bucketDefFiles: { [key: string]: BucketDefFileResult };
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
// const pgFileInDefFileRegex = /^\s*source_file\s*=\s*(.*?\.pg\s*$)/igm;
const pgFileInDefFileRegex = /^\s*source_file\s*=\s*(?:(group:\S*?|\S*?\.pg)\s*$)/igm;
const imageInPGFileRegex = /(?<!#.*)image\s*\(\s*('.+?'|".+?")\s*(?:,(?:\s|.)*?)?\)/g;

/**
 * This method determines the root directory of an upload
 * webwork course archive has the following structure: /${TOPIC_NAME}/templates/${TEMPLATE_CONTENT}
 * webwork custom archive or doombot's script have the following structure /${TEMPLATE_CONTENT}
 */
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

/**
 * This method processes each image file
 */
export const checkImageFiles = async ({ imageFilePathFromPgFile, pgFilePath }: FindFilesImageFileOptions): Promise<FindFilesImageFileResult> => {
    const imageFilePath = path.join(path.dirname(pgFilePath), imageFilePathFromPgFile);
    const imageFileResult: FindFilesImageFileResult = {
        imageFilePathFromPgFile: imageFilePathFromPgFile,
        imageFilePath: imageFilePath,
        imageFileName: path.basename(imageFilePathFromPgFile),
        imageFileExists: await fse.pathExists(imageFilePath),
    };
    return imageFileResult;
};

/**
 * This method processes each pg file
 * Iterate through each pg file and find assets (static images)
 */
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
                let imagePath = imageInPGFileMatch[1];
                // The capture group has the quotes in them, this strips those quotes off
                imagePath = imagePath.substring(1, imagePath.length - 1);
                pgFileResult.assetFiles.imageFiles[imagePath] = await checkImageFiles({ imageFilePathFromPgFile: imagePath, pgFilePath });
            });    
        }
    } catch (e) {
        logger.error(`Could not read pg file ${pgFilePath}`, e);
    }
    return pgFileResult;
};

/**
 * This method processes each def file
 * Iterate through each def file and find the pg files
 * Iterate through each pg file and find assets (static images)
 */
export const findFilesFromDefFile = async ({ contentRootPath, defFilePath, bucketDefFiles }: FindFilesDefFileOptions): Promise<FindFilesDefFileResult> => {
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
        pgFiles: {},
        bucketDefFiles: {}
    };
    const defFileContent = (await fsPromises.readFile (defFilePath)).toString();
    const pgFileInDefFileMatches = getAllMatches(pgFileInDefFileRegex, defFileContent);
    await pgFileInDefFileMatches.asyncForEach(async (pgFileInDefFileMatch) => {
        const pgFilePathFromDefFile = pgFileInDefFileMatch[1];
        if (pgFilePathFromDefFile.startsWith('group:')) {
            // DO EXAM THINGS
            bucketDefFiles[pgFilePathFromDefFile] = {
                bucketDefFile: `set${pgFilePathFromDefFile.substring('group:'.length)}.def`,
                parentDefFile: defFileRelativePath,
                pgFilePathFromDefFile: pgFilePathFromDefFile,
            };
        } else {
            const pgFileResult = await findFilesFromPGFile({ contentRootPath, pgFilePathFromDefFile });
            defFileResult.pgFiles[pgFilePathFromDefFile] = pgFileResult;    
        }
    });
    return defFileResult;
};

/**
 * This method will discover all def files in a given path
 * It then processes the def files:
 * Iterate through each def file and find the pg files
 * Iterate through each pg file and find assets (static images)
 */
export const findFiles = async ({ filePath }: FindFilesOptions): Promise<FindFilesResult> => {
    const contentRootPath = await getContentRoot(filePath);

    const defFiles = await findDefFiles(contentRootPath);
    const result: FindFilesResult = {
        defFiles: {},
        bucketDefFiles: {}
    };
    
    await defFiles.asyncForEach(async (defFilePath) => {
        const defFileResult = await findFilesFromDefFile({ contentRootPath, defFilePath, bucketDefFiles: result.bucketDefFiles });
        result.defFiles[defFileResult.defFileRelativePath] = defFileResult;
    });

    // associate buckets with parent def files
    Object.values(result.bucketDefFiles).forEach(bucketResult => {
        result.defFiles[bucketResult.parentDefFile].bucketDefFiles[bucketResult.bucketDefFile] = result.defFiles[bucketResult.bucketDefFile];
    });

    // Avoid processing buckets as topics
    // can not delete in the iteration above in case there are buckets of buckets
    // or shared buckets
    Object.values(result.bucketDefFiles).forEach(bucketResult => {
        delete result.defFiles[bucketResult.bucketDefFile];
    });

    return result;
};
