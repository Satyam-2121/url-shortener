const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

test('cache commands fail promptly after Redis disconnects', {
  timeout: 10000,
  skip: spawnSync('redis-server', ['--version']).status !== 0 && 'redis-server is required',
}, async (t) => {
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
  const redis = spawn('redis-server', [
    '--bind', '127.0.0.1', '--port', String(port), '--save', '', '--appendonly', 'no',
  ]);
  t.after(async () => {
    if (redis.exitCode === null && redis.pid) {
      const stopped = once(redis, 'exit');
      redis.kill('SIGTERM');
      await stopped;
    }
  });
  await new Promise((resolve, reject) => {
    redis.once('error', reject);
    redis.once('exit', code => reject(new Error(`Redis exited: ${code}`)));
    let output = '';
    redis.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('Ready to accept connections')) resolve();
    });
  });
  const source = fs.readFileSync(path.join(__dirname, '../src/db/redis.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, process: { env: { REDIS_URL: `redis://127.0.0.1:${port}` } },
    console: { log() {}, error() {} },
    require(name) { return name === 'dotenv/config' ? {} : require(name); },
  });
  const client = exports.redisClient;
  t.after(() => { if (client.isOpen) client.destroy(); });
  await exports.connectRedis();
  await client.set('code', 'https://example.com/');
  const reconnecting = new Promise(resolve => client.once('reconnecting', resolve));
  const stopped = once(redis, 'exit');
  redis.kill('SIGTERM');
  await stopped;
  await reconnecting;
  let timeout;
  try {
    await assert.rejects(Promise.race([
      client.get('code'),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('cache request remained pending')), 1000); }),
    ]), error => !/remained pending/.test(error.message));
  } finally {
    clearTimeout(timeout);
  }
});
