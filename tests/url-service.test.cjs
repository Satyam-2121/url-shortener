const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadService(query, codes) {
  const source = fs.readFileSync(path.join(__dirname, '../src/services/url.service.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  let generated = 0;
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === '../db/postgres') return { pool: { query } };
      if (name === 'nanoid') return { nanoid: () => codes[generated++] };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

test('a duplicate short code is retried without overwriting the existing URL', async () => {
  const urls = new Map([['taken1', 'https://existing.example/']]);
  const calls = [];
  const service = loadService(async (sql, [originalUrl, shortCode]) => {
    calls.push(shortCode);
    assert.match(sql, /ON CONFLICT \(short_code\) DO NOTHING/);
    if (urls.has(shortCode)) return { rows: [] };
    urls.set(shortCode, originalUrl);
    return { rows: [{ original_url: originalUrl, short_code: shortCode }] };
  }, ['taken1', 'fresh1']);

  const result = await service.createShortUrl('https://new.example/');
  assert.equal(result.short_code, 'fresh1');
  assert.equal(result.original_url, 'https://new.example/');
  assert.deepEqual(calls, ['taken1', 'fresh1']);
  assert.equal(urls.get('taken1'), 'https://existing.example/');
});

test('successful inserts return immediately', async () => {
  let calls = 0;
  const row = { original_url: 'https://example.com/', short_code: 'fresh1' };
  const service = loadService(async () => { calls++; return { rows: [row] }; }, ['fresh1']);
  assert.equal(await service.createShortUrl(row.original_url), row);
  assert.equal(calls, 1);
});

test('repeated collisions stop after five attempts', async () => {
  let calls = 0;
  const service = loadService(async () => { calls++; return { rows: [] }; }, Array(5).fill('taken1'));
  await assert.rejects(service.createShortUrl('https://example.com/'), /unique short code/);
  assert.equal(calls, 5);
});

test('database errors propagate without retrying', async () => {
  let calls = 0;
  const failure = new Error('database unavailable');
  const service = loadService(async () => { calls++; throw failure; }, ['fresh1']);
  await assert.rejects(service.createShortUrl('https://example.com/'), error => error === failure);
  assert.equal(calls, 1);
});
