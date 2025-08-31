#!/usr/bin/env node

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { execSync } = require('child_process');
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

    const patterns = await loadIgnorePatterns(root, outName);
    const ig = ignore().add(patterns);

    let files = [];
    if (fs.existsSync(path.join(root, '.git'))) {
      const raw = execSync('git ls-files -z', { cwd: root });
      files = raw.toString('utf8').split('\0').filter(Boolean);
      files = files.filter((rel) => rel !== outName && !ig.ignores(rel));
    } else {
      files = await listFilesFiltered(root, ig, outName);
    }

    const existing = [];
    const skipped = [];
    for (const rel of files) {
      const abs = path.join(root, rel);
      if (fs.existsSync(abs)) existing.push(rel);
      else skipped.push(rel);
    }
    if (existing.length === 0) {
      console.error('No files to archive after applying ignore rules.');
      process.exit(2);
    }

    await zipFiles(root, existing, outPath);

    const stats = fs.statSync(outPath);
    console.log(`\n Created: ${outName}`);
    console.log(`Files: ${existing.length}`);
    if (skipped.length) console.log(`Skipped missing: ${skipped.length}`);
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
  const base = String(name).replace(/[/\\]/g, '');
  return base.endsWith('.zip') ? base : `${base}.zip`;
}

async function loadIgnorePatterns(root, outName) {
  const base = [
    'node_modules/**',
    '.pnpm/**',
    '.pnpm-store/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/.turbo/**',
    '**/.cache/**',
    '**/.vercel/**',
    '**/.sst/**',
    '**/.serverless/**',
    '.git/**',
    '.github/**',
    '.githooks/**',
    '.gitlab/**',
    '.vscode/**',
    '.idea/**',
    '.env',
    '.env.*',
    '!/.env.example',
    '*.local',
    '*.pid',
    '*.swp',
    '*.tmp',
    '*.log',
    'pnpm-debug.log',
    'coverage/**',
    '**/__tests__/**',
    '**/__mocks__/**',
    '**/*.test.*',
    '**/*.spec.*',
    'tmp/**',
    'sandbox/**',
    '**/*.zip',
    'storage/**',
  ];

  const candidates = ['.archiveignore', '.zipignore'];
  let user = [];
  for (const file of candidates) {
    const p = path.join(root, file);
    if (fs.existsSync(p)) {
      try {
        let raw = await fsp.readFile(p, 'utf8');
        raw = raw.replace(/^\uFEFF/, '');
        user = raw
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'));
        break;
      } catch {}
    }
  }

  const patterns = [...base, ...user];
  patterns.push(outName);
  patterns.push(`./${outName}`);

  if (!patterns.some((p) => p.replace(/^!\/*/, '') === '.env.example')) {
    patterns.push('!/.env.example');
  }

  return patterns;
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
    archive.on('warning', (err) => console.warn('archive warning:', err.message));
    archive.on('error', reject);

    archive.pipe(output);

    for (const rel of files) {
      const abs = path.join(root, rel);
      if (fs.existsSync(abs)) archive.file(abs, { name: rel });
    }

    archive.finalize().catch(reject);
  });
}
