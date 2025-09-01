#!/usr/bin/env node
/* eslint-disable no-console */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function sh(args, opts = {}) {
  return execFileSync(args[0], args.slice(1), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

function curlJSON(args, body) {
  const full = ['curl', '-sS', ...args];
  if (body !== undefined) full.push('--data-binary', body);
  const out = sh(full);
  try { return JSON.parse(out); } catch (e) {
    console.error('Non-JSON response:', out);
    throw e;
  }
}

function fixEndpointIds(xml) {
  let out = xml;
  out = out.replace(
    /<cbc:EndpointID\s+schemeID="iso6523-actorid-upis">(\d{4}):([^<]+)<\/cbc:EndpointID>/g,
    (_m, eas, val) => `<cbc:EndpointID schemeID="${eas}">${val}</cbc:EndpointID>`
  );
  out = out.replace(
    /<cbc:EndpointID\s+schemeID="(\d{4})">(?:\1:)([^<]+)<\/cbc:EndpointID>/g,
    (_m, eas, val) => `<cbc:EndpointID schemeID="${eas}">${val}</cbc:EndpointID>`
  );
  return out;
}

(async function main() {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3333';
  let API_TOKEN = process.env.API_TOKEN || '';

  // 1) Ensure ReliaBill token
  if (!API_TOKEN) {
    const email = process.env.DEV_LOGIN_EMAIL;
    const password = process.env.DEV_LOGIN_PASSWORD;
    if (!email || !password) {
      console.error('Missing DEV_LOGIN_EMAIL/DEV_LOGIN_PASSWORD envs and no API_TOKEN present.');
      process.exit(1);
    }
    const login = curlJSON(['-X', 'POST', `${BASE_URL}/auth/verify-credentials`, '-H', 'Content-Type: application/json'], JSON.stringify({ email, password }));
    API_TOKEN = login.accessToken || '';
    if (!API_TOKEN) {
      console.error('Could not obtain accessToken from /auth/verify-credentials');
      process.exit(1);
    }
    process.env.API_TOKEN = API_TOKEN;
    console.log(`ReliaBill token OK (len: ${API_TOKEN.length})`);
  }

  // 2) Pick latest invoice (or use INV_ID env)
  let invId = process.env.INV_ID || '';
  if (!invId) {
    const invList = curlJSON(['-H', `Authorization: Bearer ${API_TOKEN}`, `${BASE_URL}/invoices?limit=1`]);
    invId = (invList.items && invList.items[0] && invList.items[0].id) || '';
  }
  if (!invId) {
    console.error('No invoice found. Create one first.');
    process.exit(1);
  }
  console.log(`Using invoice ${invId}`);

  // 3) Prepare (build UBL+PDF)
  const prep = curlJSON(['-X', 'POST', `${BASE_URL}/invoices/${invId}/prepare`, '-H', `Authorization: Bearer ${API_TOKEN}`, '-H', 'Content-Length: 0']);
  if (prep.status !== 'READY') {
    console.error('Prepare did not return READY:', prep);
    process.exit(1);
  }
  console.log('Prepared');

  // 4) Download XML
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relb.'));
  const xmlPath = path.join(tmpDir, `${invId}.xml`);
  sh(['curl', '-sS', `${BASE_URL}/invoices/${invId}/download-xml`, '-H', `Authorization: Bearer ${API_TOKEN}`, '-o', xmlPath]);
  const xml = fs.readFileSync(xmlPath, 'utf8');

  // 5) Fix EndpointID in memory
  const fixed = fixEndpointIds(xml);
  const fixedPath = path.join(tmpDir, `${invId}.fixed.xml`);
  fs.writeFileSync(fixedPath, fixed, 'utf8');

  // 6) A-Cube auth
  const ACUBE_BASE_URL = process.env.ACUBE_BASE_URL || 'https://peppol-sandbox.api.acubeapi.com';
  let ACUBE_API_KEY = process.env.ACUBE_API_KEY || '';
  if (!ACUBE_API_KEY) {
    const email = process.env.ACUBE_EMAIL;
    const password = process.env.ACUBE_PASSWORD;
    if (!email || !password) {
      console.error('Missing ACUBE_EMAIL/ACUBE_PASSWORD envs and no ACUBE_API_KEY present.');
      process.exit(1);
    }
    const resp = curlJSON(
      ['-X', 'POST', 'https://common-sandbox.api.acubeapi.com/login', '-H', 'Accept: application/json', '-H', 'Content-Type: application/json'],
      JSON.stringify({ email, password })
    );
    ACUBE_API_KEY = resp.token || '';
    if (!ACUBE_API_KEY) {
      console.error('Could not obtain A-Cube bearer token.');
      process.exit(1);
    }
    console.log(`A-Cube bearer acquired (len: ${ACUBE_API_KEY.length})`);
  }

  // 7) Send to A-Cube
  const sendOut = sh([
    'curl', '-i', '-sS', '-X', 'POST', `${ACUBE_BASE_URL}/invoices/outgoing/ubl`,
    '-H', `Authorization: Bearer ${ACUBE_API_KEY}`,
    '-H', 'Accept: application/problem+json, application/ld+json, application/json',
    '-H', 'Content-Type: application/xml',
    '--data-binary', `@${fixedPath}`
  ]);
  console.log(sendOut.split('\r\n\r\n').pop());

  try {
    const json = JSON.parse(sendOut.split('\r\n\r\n').pop());
    const invUuid = json.uuid;
    if (invUuid) {
      console.log(`▶ Polling A-Cube invoice ${invUuid} …`);
      for (let i = 0; i < 6; i++) {
        const info = curlJSON(['-H', `Authorization: Bearer ${ACUBE_API_KEY}`, `${ACUBE_BASE_URL}/invoices/${invUuid}`, '-H', 'Accept: application/json']);
        const msg = info.peppolMessage || {};
        console.log(`  • ${i + 1}/6 success=${msg.success} error=${msg.errorCode || '—'}`);
        if (msg.success === true || msg.success === false) break;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
      }
    }
  } catch {}
})();
