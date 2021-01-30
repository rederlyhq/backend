#!/usr/bin/env node
// Not typescript
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs-extra');
const childProcess = require('child_process');
const archiver = require('archiver');

// set -e;
// mkdir build;
// mv ts-built build;
// mv package*.json build;
// mv node_modules build;
// mv assets build;
// zip -r ${{ steps.get_file_name.outputs.result }} build;

const builtDirectory = 'ts-built';

const {
    REDERLY_PACKAGER_ARCHIVE = null,
    REDERLY_PACKAGER_ARCHIVE_ZIP = null,
    REDERLY_PACKAGER_ARCHIVE_TAR = null,
    REDERLY_PACKAGER_DEST_FILE = null,
    REDERLY_PACKAGER_PRESERVE_NODE_MODULES = null,
} = process.env;

console.log(`Env: ${JSON.stringify({
    REDERLY_PACKAGER_ARCHIVE,
    REDERLY_PACKAGER_ARCHIVE_ZIP,
    REDERLY_PACKAGER_ARCHIVE_TAR,
    REDERLY_PACKAGER_DEST_FILE,
    REDERLY_PACKAGER_PRESERVE_NODE_MODULES
}, null, 2)}`);

const destFile = process.argv[2] || REDERLY_PACKAGER_DEST_FILE || 'dist';

const buildDir = 'build';
console.log(`Starting to package project into ${destFile}`);

/**
 * Initially wasn't going to do async
 * however removeDirSync seems to be working async
 * also it is faster to copy everything at once
 */
(async () => {
    if (!await fs.pathExists(builtDirectory)) {
        throw new Error ('you have to build first');
    }
    if (await fs.pathExists(buildDir)) {
        console.log('Cleaning build directory');
        await fs.remove(buildDir, {
            recursive: true
        });
    }
    
    await fs.mkdir(buildDir, {
        recursive: true
    });
    const filesToCopy = [
        'assets',
        builtDirectory,
        'package.json',
        'package-lock.json',
    ];
    
    const copyFilePromises = filesToCopy.map(async fileToCopy => {
        const dest = `${buildDir}/${fileToCopy}`;
        console.log(`Copying ${fileToCopy} ==> "${dest}"`);
        await fs.copy(fileToCopy, dest, {recursive: true});
        console.log(`Finished copying ${fileToCopy} ==> "${dest}"`);
    });

    if (REDERLY_PACKAGER_PRESERVE_NODE_MODULES !== 'false') {
        const fileToCopy = 'node_modules';
        const dest = `${buildDir}/${fileToCopy}`;
        console.log(`Copying ${fileToCopy} ==> "${dest}"`);
        const nodeModulesPromise = fs.copy(fileToCopy, dest, {recursive: true});
        copyFilePromises.push(nodeModulesPromise);
        console.log(`Finished copying ${fileToCopy} ==> "${dest}"`);
    } else {
        const fileToMove = 'node_modules';
        const dest = `${buildDir}/${fileToMove}`;
        console.log(`Moving ${fileToMove} ==> "${dest}"`);
        const nodeModulesPromise = fs.move(fileToMove, dest, {recursive: true});
        copyFilePromises.push(nodeModulesPromise);
        console.log(`Finished moving ${fileToMove} ==> "${dest}"`);
    }

    const dockerFileSource = 'built.dockerfile';
    const dockerFileDest = `${buildDir}/Dockerfile`;
    console.log(`Copying ${dockerFileSource} ==> "${dockerFileDest}"`);
    await fs.copy(dockerFileSource, dockerFileDest);
    console.log(`Finished copying ${dockerFileSource} ==> "${dockerFileDest}"`);

    await Promise.all(copyFilePromises);

    console.log('Pruning dependencies');
    await new Promise((resolve, reject) => {
        childProcess.exec('npm prune --production', {
            cwd: buildDir
        }, (error, out, err) => {
            console.log(`Prune out: ${out}`);
            console.error(`Prune err: ${err}`);
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });

    const distDirectory = 'package-outputs';
    if (await fs.pathExists(distDirectory)) {
        await fs.remove(distDirectory, {
            recursive: true
        });
    }
    await fs.mkdir(distDirectory);

    const createArchive = (format, options, outputFile, inputDirectory) => new Promise((resolve, reject) => {
        console.log(`Packing into ${outputFile}`);
        const archive = archiver(format, options);
        let errored = false;
        archive.on('error', err => {
            errored = true;
            reject(err);
        });

        archive.on('close', () => {
            if (errored) {
                console.error(`Archive ${inputDirectory} ==> ${outputFile} already errored and now it is closing, ignoring`);
            } else {
                console.log(`Archive ${inputDirectory} ==> ${outputFile} complete`);
                resolve(archive.pointer());
            }
        });

        const outputStream = fs.createWriteStream(outputFile);
        archive.pipe(outputStream);
        archive.directory(inputDirectory, inputDirectory);
        archive.finalize();
    });

    const archivePromises = [];
    if (REDERLY_PACKAGER_ARCHIVE !== 'false' && REDERLY_PACKAGER_ARCHIVE_TAR !== 'false') {
        const tarPromise = createArchive('tar', {
            gzip: true
        }, `${distDirectory}/${destFile}.tgz`, buildDir);
        archivePromises.push(tarPromise);    
    } else {
        console.log('REDERLY_PACKAGER_ARCHIVE or REDERLY_PACKAGER_ARCHIVE_TAR is set to false, skipping tar');
    }

    if (REDERLY_PACKAGER_ARCHIVE !== 'false' && REDERLY_PACKAGER_ARCHIVE_ZIP !== 'false') {
        const zipPromise = createArchive('zip', null, `${distDirectory}/${destFile}.zip`, buildDir);
        archivePromises.push(zipPromise);    
    } else {
        console.log('REDERLY_PACKAGER_ARCHIVE or REDERLY_PACKAGER_ARCHIVE_ZIP is set to false, skipping zip');
    }

    await Promise.all(archivePromises);
    console.log('Packaging complete');
})();
