// scripts/dev-login.js
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3333';
const email = process.env.DEV_LOGIN_EMAIL;
const password = process.env.DEV_LOGIN_PASSWORD;
if (!email || !password) {
  console.error('Missing DEV_LOGIN_EMAIL or DEV_LOGIN_PASSWORD in .env');
  process.exit(1);
}

async function main() {
  const res = await fetch(`${BASE_URL}/auth/verify-credentials`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    console.error('Login failed:', res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const token = data.accessToken;
  if (!token) {
    console.error('No accessToken in response:', data);
    process.exit(1);
  }

  const envPath = path.resolve('.env');
  let env = '';
  try { env = fs.readFileSync(envPath, 'utf8'); } catch {}
  if (env.includes('\nAPI_TOKEN=')) {
    env = env.replace(/\nAPI_TOKEN=.*(\r?\n|$)/, `\nAPI_TOKEN=${token}\n`);
  } else if (env.startsWith('API_TOKEN=')) {
    env = env.replace(/^API_TOKEN=.*(\r?\n|$)/, `API_TOKEN=${token}\n`);
  } else {
    if (env.length && !env.endsWith('\n')) env += '\n';
    env += `API_TOKEN=${token}\n`;
  }
  fs.writeFileSync(envPath, env, 'utf8');

  console.log('Saved API_TOKEN in .env:', token.slice(0,20) + '…');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
