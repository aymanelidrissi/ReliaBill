#!/usr/bin/env node
const BASE_URL = process.env.BASE_URL || 'http://localhost:3333';
const TOKEN = process.env.API_TOKEN;

if (!TOKEN) {
  console.error('X API_TOKEN not set. Run: pnpm login:token');
  process.exit(1);
}

(async () => {
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const text = await res.text();
    const ok = res.ok ? 'O' : 'X';
    console.log(`${ok} GET /auth/me  → ${res.status}`);
    try {
      console.log(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      console.log(text);
    }
    process.exit(res.ok ? 0 : 2);
  } catch (err) {
    console.error('X Request failed:', err?.message || err);
    process.exit(1);
  }
})();
