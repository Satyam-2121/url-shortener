const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadConfig(file, env, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, '../src/db', file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  vm.runInNewContext(outputText, {
    exports: {}, process: { env }, console,
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected import: ${name}`);
    },
  });
}

test('PostgreSQL uses the configured database credentials', () => {
  let options;
  loadConfig('postgres.ts', {
    DB_USER: 'app', DB_PASSWORD: 'test-password', DB_HOST: 'postgres',
    DB_PORT: '5432', DB_NAME: 'url_shortener',
  }, {
    dotenv: { config() {} },
    pg: { Pool: class { constructor(value) { options = value; } } },
  });
  assert.deepEqual({ ...options }, {
    user: 'app', password: 'test-password', host: 'postgres',
    port: 5432, database: 'url_shortener',
  });
});

for (const configuredUrl of [undefined, 'redis://redis:6379']) {
  test(`Redis connects to ${configuredUrl || 'the local default'}`, () => {
    let options;
    loadConfig('redis.ts', { REDIS_URL: configuredUrl }, {
      'dotenv/config': {},
      redis: { createClient(value) { options = value; return { on() {} }; } },
    });
    assert.equal(options.url, configuredUrl || 'redis://localhost:6379');
  });
}
