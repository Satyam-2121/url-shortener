const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const express = require('express');

test('HEAD previews redirect without increasing visit counts', async (t) => {
  let visits = 0;
  let app;
  const pool = { async query(sql, [code]) {
    if (sql.includes('UPDATE')) { visits++; return { rows: [] }; }
    return { rows: code === 'abc123' ? [{ original_url: 'https://example.com/' }] : [] };
  } };
  const fakeExpress = Object.assign(() => {
    app = express();
    app.listen = () => {};
    return app;
  }, { json: express.json });
  const source = fs.readFileSync(path.join(__dirname, '../src/server.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(compiled, {
    exports: {}, process: { env: {} }, URL, console,
    require(name) {
      if (name === 'express') return fakeExpress;
      if (name === './db/postgres') return { pool };
      if (name === './db/redis') return { redisClient: { isReady: false }, connectRedis() {} };
      if (name === './services/url.service') return { createShortUrl() {} };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const preview = await fetch(`${base}/abc123`, { method: 'HEAD', redirect: 'manual' });
  assert.equal(preview.status, 302);
  assert.equal(preview.headers.get('location'), 'https://example.com/');
  assert.equal(visits, 0);
  const missing = await fetch(`${base}/missing`, { method: 'HEAD', redirect: 'manual' });
  assert.equal(missing.status, 404);
  assert.equal(visits, 0);
  const visit = await fetch(`${base}/abc123`, { redirect: 'manual' });
  assert.equal(visit.status, 302);
  assert.equal(visits, 1);
});
