#!/usr/bin/env node

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const archiver = require('archiver');
const ignore = require('ignore');

(async function main() {
  try {
    const root = await resolveRepoRoot(process.cwd());
    process.chdir(root);

    const stamp = ts();
    const desiredName = process.argv[2];
    const outName = sanitizeZipName(desiredName || `ReliaBill_${stamp}.zip`);
    const outPath = path.join(root, outName);

    const zipignorePath = path.join(root, '.zipignore');
    const patterns = await readZipIgnore(zipignorePath);

    patterns.push(outName);

    const ig = ignore().add(patterns);

    const files = await listFilesFiltered(root, ig, outName);

    if (files.length === 0) {
      console.error('No files to archive after applying .zipignore rules.');
      process.exit(2);
    }

    await zipFiles(root, files, outPath);

    const stats = fs.statSync(outPath);
    console.log(`\n Created: ${outName}`);
    console.log(`Files: ${files.length}`);
    console.log(`Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  } catch (err) {
    console.error('Zip failed:', err?.stack || err?.message || err);
    process.exit(1);
  }
})();


async function resolveRepoRoot(start) {
  let dir = start;
  while (true) {
    if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function sanitizeZipName(name) {
  const base = name.replace(/[/\\]/g, '');
  return base.endsWith('.zip') ? base : `${base}.zip`;
}

async function readZipIgnore(filePath) {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    if (!lines.some((l) => l === '!.env.example')) lines.push('!.env.example');
    return lines;
  } catch {
    return [
      'node_modules/',
      '.git/',
      '.env',
      '.env.*',
      '!.env.example',
      '**/.next/',
      '**/dist/',
      '**/build/',
      '**/*.zip',
      '.DS_Store',
      'Thumbs.db',
    ];
  }
}

async function listFilesFiltered(root, ig, outName) {
  const result = [];
  await walk(root, '');
  return result;

  async function walk(absDir, relDir) {
    const entries = await fsp.readdir(absDir, { withFileTypes: true });
    for (const ent of entries) {
      const rel = path.posix.join(relDir, ent.name.replace(/\\/g, '/'));

      if (rel === outName) continue;

      if (ent.isDirectory()) {
        if (ig.ignores(rel + '/')) continue;
        await walk(path.join(absDir, ent.name), rel);
      } else if (ent.isFile()) {
        if (ig.ignores(rel)) continue;
        result.push(rel);
      }
    }
  }
}

function zipFiles(root, files, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    output.on('error', reject);
    archive.on('warning', (err) => {
      console.warn('archive warning:', err.message);
    });
    archive.on('error', reject);

    archive.pipe(output);

    for (const rel of files) {
      const abs = path.join(root, rel);
      archive.file(abs, { name: rel });
    }

    archive.finalize().catch(reject);
  });
}
