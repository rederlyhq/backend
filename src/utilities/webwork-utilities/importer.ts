import { listFilters, recursiveListFilesInDirectory } from '../file-helper';
import * as fse from 'fs-extra';
import * as path from 'path';
import logger from '../logger';
import RederlyError from '../../exceptions/rederly-error';
import { getAllMatches } from '../string-helper';
const fsPromises = fse.promises;

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
                return templatesPath;
            }
        } catch (e) {
            logger.error('Could not stat templates', e);
        }
    }
    return filePath;
};

interface FindFilesAssetFileResult {
    assetFilePathFromPgFile: string;
}

interface FindFilesPGFileResult {
    pgFilePathFromDefFile: string;
    assetFiles: { [key: string]: FindFilesAssetFileResult };
}

interface FindFilesDefFileResult {
    pgFiles: { [key: string]: FindFilesPGFileResult };
    defFilePath: string;
}

interface FindFilesResult {
    defFiles: { [key: string]: FindFilesDefFileResult };
}

export const findFiles = async (filePath: string): Promise<FindFilesResult> => {
    const contentRootPath = await getContentRoot(filePath);

    // return recursiveListFilesInDirectory(filePath, [], listFilters.matches(/\.def$|\.pg/i));
    const defFiles = await findDefFiles(filePath);
    const result: FindFilesResult = {
        defFiles: {}
    };
    await defFiles.asyncForEach(async (defFilePath) => {
        const defFileResult: FindFilesDefFileResult = {
            defFilePath: defFilePath,
            pgFiles: {}
        };
        result.defFiles[defFilePath] = defFileResult;
        const defFileContent = (await fsPromises.readFile (defFilePath)).toString();
        const pgFileInDefFileMatches = getAllMatches(pgFileInDefFileRegex, defFileContent);
        await pgFileInDefFileMatches.asyncForEach(async (pgFileInDefFileMatch) => {
            const pgFilePathFromDefFile = pgFileInDefFileMatch[1];
            const pgFilePath = path.join(contentRootPath, pgFilePathFromDefFile);
            const pgFileResult: FindFilesPGFileResult = {
                pgFilePathFromDefFile: pgFilePath,
                assetFiles: {}
            };
            defFileResult.pgFiles[pgFilePath] = pgFileResult;
            try {
                const pgFileStats = await fsPromises.lstat(pgFilePath);
                if (!pgFileStats.isFile()) {
                    throw new RederlyError(`${pgFilePath} is not a file`);
                }
                const pgFileContent = (await fsPromises.readFile(pgFilePath)).toString();
                const imageInPGFileMatches = getAllMatches(imageInPGFileRegex, pgFileContent);
                await imageInPGFileMatches.asyncForEach(async (imageInPGFileMatch) => {
                    const imagePath = imageInPGFileMatch[1] ?? imageInPGFileMatch[2];
                    const assetFileResult: FindFilesAssetFileResult = {
                        assetFilePathFromPgFile: imagePath
                    };
                    pgFileResult.assetFiles[imagePath] = assetFileResult;
                    console.log(`imagePath: ${imagePath}`);
                });
            } catch (e) {
                // logger.error(`Could not find pg file ${pgFilePath}`, e);
            }
            // console.log(pgFilePath);
        });
    });
    return result;
};
