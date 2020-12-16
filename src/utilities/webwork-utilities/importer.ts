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
                return path.resolve(templatesPath);
            }
        } catch (e) {
            logger.error('Could not stat templates', e);
        }
    }
    return path.resolve(filePath);
};

interface FindFilesAssetFileResult {
    assetFilePathFromPgFile: string;
    assetFilePath: string;
}

interface FindFilesPGFileResult {
    pgFilePathFromDefFile: string;
    pgFilePathOnDisk: string;
    assetFiles: { [key: string]: FindFilesAssetFileResult };
}

interface FindFilesDefFileResult {
    pgFiles: { [key: string]: FindFilesPGFileResult };
    defFileRelativePath: string;
    defFileAbsolutePath: string;
}

interface FindFilesResult {
    defFiles: { [key: string]: FindFilesDefFileResult };
}

export const findFilesFromDefFile = async (contentRootPath: string, defFilePath: string): Promise<FindFilesDefFileResult> => {
    const defFileRelativePath = path.relative(contentRootPath, defFilePath);
    const defFileResult: FindFilesDefFileResult = {
        defFileAbsolutePath: defFilePath,
        defFileRelativePath: defFileRelativePath,
        pgFiles: {}
    };
    const defFileContent = (await fsPromises.readFile (defFilePath)).toString();
    const pgFileInDefFileMatches = getAllMatches(pgFileInDefFileRegex, defFileContent);
    await pgFileInDefFileMatches.asyncForEach(async (pgFileInDefFileMatch) => {
        const pgFilePathFromDefFile = pgFileInDefFileMatch[1];
        const pgFilePath = path.join(contentRootPath, pgFilePathFromDefFile);
        const pgFileResult: FindFilesPGFileResult = {
            pgFilePathFromDefFile: pgFilePathFromDefFile,
            pgFilePathOnDisk: pgFilePath,
            assetFiles: {}
        };
        defFileResult.pgFiles[pgFilePathFromDefFile] = pgFileResult;
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
                    assetFilePathFromPgFile: imagePath,
                    assetFilePath: path.join(path.dirname(pgFilePath), imagePath),
                };
                pgFileResult.assetFiles[imagePath] = assetFileResult;
                console.log(`imagePath: ${imagePath}`);
            });
        } catch (e) {
            // logger.error(`Could not find pg file ${pgFilePath}`, e);
        }
        // console.log(pgFilePath);
    });
    return defFileResult;
};

export const findFiles = async (filePath: string): Promise<FindFilesResult> => {
    const contentRootPath = await getContentRoot(filePath);

    const defFiles = await findDefFiles(contentRootPath);
    const result: FindFilesResult = {
        defFiles: {}
    };
    await defFiles.asyncForEach(async (defFilePath) => {
        const defFileResult = await findFilesFromDefFile(contentRootPath, defFilePath);
        result.defFiles[defFileResult.defFileRelativePath] = defFileResult;
    });
    return result;
};
