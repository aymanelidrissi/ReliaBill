#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const glob = require('glob');

const ZIP_NAME = `reliabill-${new Date().toISOString().replace(/[:.]/g,'-')}.zip`;
console.log(`Creating ${ZIP_NAME} …`);

const output = fs.createWriteStream(ZIP_NAME);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Done! ${archive.pointer()} total bytes`);
});
archive.on('error', err => { throw err; });

archive.pipe(output);

const exclude = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  '.next/**',
  'generated/**',
  '*.zip',
  'pnpm-lock.yaml',
  'yarn.lock',
  'package-lock.json',
  '.DS_Store'
];

glob.sync('**/*', { nodir: true, ignore: exclude }).forEach(file => {
  archive.file(file, { name: file });
});

archive.finalize();
