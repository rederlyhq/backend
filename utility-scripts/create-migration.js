#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const moment = require('moment');
const fs = require('fs');

const skeletonFilePath = `${__dirname}/assets/migration-skeleton.ts`;
// I wonder if there is a better way to do this
// I could have also done this earlier however I feel like it is less likely to have a collision with the more verbose pattern (from what I appended above)
const basePath = skeletonFilePath.substring(0, skeletonFilePath.indexOf('/utility-scripts/assets/migration-skeleton.ts'));

const migrationFileName = `${moment().utc().format('yyyyMMDDHHmmss')}-${process.argv[2] ?? 'NAME'}.ts`;

const migrationFilePath = `${basePath}/src/database/migrations/${migrationFileName}`;

console.log(`Copying ${skeletonFilePath} ==> ${migrationFilePath}`);
fs.copyFileSync(skeletonFilePath, migrationFilePath);
