import { generateDirectoryWhitespaceMap, listFilters, recursiveListFilesInDirectory } from '../file-helper';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as _ from 'lodash';
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
    whitespaceMap: { [key: string]: string[] };
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
    bucketDefFiles: { [key: string]: [BucketDefFileResult] };
    whitespaceMap: { [key: string]: string[] };
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
    bucketDefFiles: { [key: string]: [BucketDefFileResult] };
}

export const findDefFiles = (filePath: string): Promise<Array<string>> => {
    return recursiveListFilesInDirectory(filePath, [], listFilters.endsWith('.def', false));
};

const pgFileInDefFileRegex = /^\s*source_file\s*=\s*(?:(group:\S*?|\S*?\.pg)\s*$)/igm;
const httpNegativeLookAhead = '(?!\\s*https?:)';
const assetInPgFileExtensions = '(?:' + // Non capture group to or all the extensions together
[
    '[gG][iI][fF]', // gif
    '[aA]?[pP][nN][gG]', // or apng, png
    '[jJ][pP][eE]?[gG]', // or jpg, jpeg
    '[sS][vV][gG]', // or svg
    '[wW][eE][bB][pP]', // or webp
]
.join('|') // or extensions together
 + ')'; // close non extension capture group

const perlQuotes: Array<[string, string]> = [
    ['"', '"'], // Double quotes
    ["'", "'"], // single quotes
    ['`', '`'], // Backticks
    ['qw\\s*\\(', '\\)'], // qw
    ['qq\\s*\\(', '\\)'], // qq
    ['q\\s*\\(', '\\)'], // q
];

const insideQuoteChacterRegex = (quote: string): string => {
    // if is normal quote
    if (quote === '"' || quote === "'") {
        return `[^${quote}]`;
    } else {
        return '.';
    }
};

export const imageInPGFileRegex = new RegExp(
    [
        '(?<!#.*)(?:', // Comment, using non capture group to spread amongst or
        `(?:image\\s*\\(\\s*(${perlQuotes.map(perlQuote => `${perlQuote[0]}${httpNegativeLookAhead}.+?${perlQuote[1]}`).join('|')})\\s*(?:,(?:\\s|.)*?)?\\))`, // image call
        '|(', // pipe for regex or with capture non image, asset looking strings
        perlQuotes.map(perlQuote => `(?:${perlQuote[0]}${httpNegativeLookAhead}${insideQuoteChacterRegex(perlQuote[0])}*?\.${assetInPgFileExtensions}${perlQuote[1]})`).join('|'), // String check regex
        ')', // close asset looking strings
        ')', // end non capture group for negative look behind
    ].join(''), 'g'
);

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
            // Having a templates directory is only the case for a course archive, so this is not an error
            logger.debug('Could not stat templates', e);
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
export const findFilesFromPGFile = async ({ contentRootPath, pgFilePathFromDefFile, whitespaceMap }: FindFilesPGFileOptions): Promise<FindFilesPGFileResult> => {
    let pgFilePath = path.join(contentRootPath, pgFilePathFromDefFile);

    let fileExists = await fse.pathExists(pgFilePath);
    for(let i = 0; !fileExists && i < (whitespaceMap[pgFilePath]?.length ?? 0); i++) {
        const tryPath = whitespaceMap[pgFilePath][i];
        fileExists = await fse.pathExists(tryPath);
        if (fileExists) {
            if (whitespaceMap[pgFilePath].length > 1) {
                logger.warn(`The original pg file path given did not exist and there were ${whitespaceMap[pgFilePath].length} paths that matched without whitespace, used the ${i} one`);
            }
            logger.debug(`findFilesFromPGFile: Whitespace fix translated "${pgFilePath}" ==> "${tryPath}" `);
            pgFilePath = tryPath;
            break;
        }
    }

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
                let imagePath: string = imageInPGFileMatch[1] ?? imageInPGFileMatch[2];

                perlQuotes.some(quote => {
                    const insideRegex = new RegExp(`${quote[0]}(.*)${quote[1]}`, 'g');
                    const matches = getAllMatches(insideRegex, imagePath);
                    if (matches.length > 1) {
                        logger.warn(`findFilesFromPGFile: insideRegex expected 1 match but got ${matches.length}`);
                    }
                    // Will not be nil if different quotes
                    if (!_.isNil(matches.first)) {
                        // index 1 should be first capture group, should not be nil
                        if (_.isNil(matches.first[1])) {
                            logger.error(`findFilesFromPGFile: No capture group for quote ${quote[0]}`);
                        } else {
                            imagePath = matches.first[1];
                        }
                        // bow out
                        return true;
                    }
                    return false;
                });
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
export const findFilesFromDefFile = async ({ contentRootPath, defFilePath, bucketDefFiles, whitespaceMap }: FindFilesDefFileOptions): Promise<FindFilesDefFileResult> => {
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
            bucketDefFiles[pgFilePathFromDefFile] = bucketDefFiles[pgFilePathFromDefFile] ?? [];
            bucketDefFiles[pgFilePathFromDefFile].push({
                bucketDefFile: `set${pgFilePathFromDefFile.substring('group:'.length)}.def`,
                parentDefFile: defFileRelativePath,
                pgFilePathFromDefFile: pgFilePathFromDefFile,
            });
        } else {
            const pgFileResult = await findFilesFromPGFile({ contentRootPath, pgFilePathFromDefFile, whitespaceMap });
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
    const whitespaceMap = await generateDirectoryWhitespaceMap(filePath);

    const defFiles = await findDefFiles(contentRootPath);
    const result: FindFilesResult = {
        defFiles: {},
        bucketDefFiles: {}
    };
    
    await defFiles.asyncForEach(async (defFilePath) => {
        const defFileResult = await findFilesFromDefFile({ contentRootPath, defFilePath, bucketDefFiles: result.bucketDefFiles, whitespaceMap });
        result.defFiles[defFileResult.defFileRelativePath] = defFileResult;
    });

    // associate buckets with parent def files
    Object.values(result.bucketDefFiles).forEach((bucketResults: BucketDefFileResult[]) => {
        bucketResults.forEach(bucketResult => {
            result.defFiles[bucketResult.parentDefFile].bucketDefFiles[bucketResult.bucketDefFile] = result.defFiles[bucketResult.bucketDefFile];
        });
    });

    // Avoid processing buckets as topics
    // can not delete in the iteration above in case there are buckets of buckets
    // or shared buckets
    Object.values(result.bucketDefFiles).forEach(bucketResults => {
        bucketResults.forEach(bucketResult => {
            delete result.defFiles[bucketResult.bucketDefFile];
        });
    });

    return result;
};
