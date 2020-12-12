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
const destFile = process.argv[2] || 'dist';
const buildDir = 'build';
console.log(`Starting to package project into ${destFile}`);

/**
 * Initially wasn't going to do async
 * however removeDirSync seems to be working async
 * also it is faster to copy everything at once
 */
(async () => {
    if (!await fs.pathExists(builtDirectory)) {
        throw new Error ('you hve to build first');
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
        'node_modules',
        'package.json',
        'package-lock.json'
    ];
    
    const promises = filesToCopy.map(async fileToCopy => {
        const dest = `${buildDir}/${fileToCopy}`;
        console.log(`Copying ${fileToCopy} ==> "${dest}"`);
        await fs.copy(fileToCopy, dest, {recursive: true});
        console.log(`Finished copying ${fileToCopy} ==> "${dest}"`);
    });
    await Promise.all(promises);
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

    const tarPromise = new Promise((resolve, reject) => {
        console.log('Packing into tgz');
        const file = `${distDirectory}/${destFile}.tgz`;
        const tarArchive = archiver('tar', {
            gzip: true
        });
        let errored = false;
        tarArchive.on('error', err => {
            errored = true;
            reject(err);
        });

        tarArchive.on('close', () => {
            if (errored) {
                console.error('Tar archive already errored and now it is closing, ignoring');
            } else {
                console.log(`Tarring ${buildDir} ==> ${file} complete`);
                resolve(tarArchive.pointer());
            }
        });

        const outputStream = fs.createWriteStream(file);
        tarArchive.pipe(outputStream);
        tarArchive.directory(buildDir, buildDir);
        tarArchive.finalize();
    });

    const zipPromise = new Promise((resolve, reject) => {
        console.log('Packing into zip');
        const file = `${distDirectory}/${destFile}.zip`;
        const zipArchive = archiver('zip');
        let errored = false;
        zipArchive.on('error', err => {
            errored = true;
            reject(err);
        });

        zipArchive.on('close', () => {
            if (errored) {
                console.error('Zip archive already errored and now it is closing, ignoring');
            } else {
                console.log(`Zipping ${buildDir} ==> ${file} complete`);
                resolve(zipArchive.pointer());
            }
        });

        const outputStream = fs.createWriteStream(file);
        zipArchive.pipe(outputStream);
        zipArchive.directory(buildDir, buildDir);
        zipArchive.finalize();
    });

    await Promise.all([tarPromise, zipPromise]);
    console.log('Packaging complete');
})();
