import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';
import { browserCookies, createAssetServer, createBrowserSession } from './java_compatibility_browser.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const executable = process.env.DOPPIO_CHROMIUM_EXECUTABLE || chromium.executablePath();

function environment(context, runtime = 'window.Doppio = {};') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-browser-adapter-test-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  function write(relative, value) {
    const filename = path.join(root, relative);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, value);
    return filename;
  }
  write('build/release/doppio.js', runtime);
  write('node_modules/browserfs/dist/browserfs.min.js', fs.readFileSync(
    path.join(repoRoot, 'node_modules/browserfs/dist/browserfs.min.js')));
  write('vendor/java_home/jdk.json', '{"classpath":[]}');
  write('vendor/java_home/lib/sample.jar', Buffer.from([0, 1, 2, 255]));
  const classesPath = path.join(root, 'classes');
  write('classes/fixture/Main.class', Buffer.from([0xca, 0xfe, 0xba, 0xbe]));
  return { root, write, classesPath };
}

test('asset server exposes exact bundle, bootstrap and registered fixture routes', async (context) => {
  const fixture = environment(context);
  const server = await createAssetServer({ repoRoot: fixture.root });
  context.after(() => server.close());
  const registered = server.registerClasses(fixture.classesPath);
  assert.deepEqual(await (await fetch(`${server.baseUrl}/runtime/listings.json`)).json(),
    { vendor: { java_home: { 'jdk.json': null, lib: { 'sample.jar': null } } } });
  assert.deepEqual(await (await fetch(registered.listingUrl)).json(), { fixture: { 'Main.class': null } });
  const bytes = await (await fetch(`${registered.fileBaseUrl}fixture/Main.class`)).arrayBuffer();
  assert.deepEqual(Buffer.from(bytes), Buffer.from([0xca, 0xfe, 0xba, 0xbe]));
  const head = await fetch(`${server.baseUrl}/runtime/vendor/java_home/lib/sample.jar`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), '4');
  assert.equal(await head.text(), '');
  assert.equal((await fetch(`${server.baseUrl}/package.json`)).status, 404);
  assert.equal((await fetch(`${registered.fileBaseUrl}%2e%2e%2f%2e%2e%2fvendor/java_home/jdk.json`)).status, 404);
  server.unregisterClasses(registered.id);
  assert.equal((await fetch(registered.listingUrl)).status, 404);
  assert.equal(server.verifyIntegrity().status, 'verified');
});

test('browser server rejects symbolic links in bootstrap and compiled input inventories', async (context) => {
  const fixture = environment(context);
  fs.symlinkSync(path.join(fixture.root, 'vendor/java_home/jdk.json'),
    path.join(fixture.classesPath, 'linked.class'));
  const server = await createAssetServer({ repoRoot: fixture.root });
  context.after(() => server.close());
  assert.throws(() => server.registerClasses(fixture.classesPath), /symbolic links/);
  fs.symlinkSync(path.join(fixture.root, 'build/release/doppio.js'),
    path.join(fixture.root, 'vendor/link.js'));
  await assert.rejects(createAssetServer({ repoRoot: fixture.root }), /symbolic links/);
});

test('browser runtime integrity detects bundle, BrowserFS and bootstrap mutations', async (context) => {
  for (const relative of ['build/release/doppio.js', 'node_modules/browserfs/dist/browserfs.min.js',
    'vendor/java_home/jdk.json']) {
    const fixture = environment(context);
    const server = await createAssetServer({ repoRoot: fixture.root });
    context.after(() => server.close());
    fixture.write(relative, 'modified');
    assert.throws(() => server.verifyIntegrity(), /changed during execution/);
  }
  const fixture = environment(context);
  const server = await createAssetServer({ repoRoot: fixture.root });
  context.after(() => server.close());
  fs.mkdirSync(path.join(fixture.root, 'vendor/added-empty-directory'));
  assert.throws(() => server.verifyIntegrity(), /changed during execution/);
});

test('browser cookies use local configuration or environment without a source-code constant', (context) => {
  const fixture = environment(context);
  fixture.write('ci/pages_browser_smoke.mjs', "name: 'dev_bypass_waf', value: 'local-test-cookie'");
  const baseUrl = 'http://127.0.0.1:12345';
  assert.deepEqual(browserCookies({ repoRoot: fixture.root, baseUrl, environment: {} }),
    [{ name: 'dev_bypass_waf', value: 'local-test-cookie', domain: '127.0.0.1', path: '/' }]);
  const configured = browserCookies({ repoRoot: fixture.root, baseUrl,
    environment: { DOPPIO_DEV_BYPASS_WAF_COOKIE: 'environment-test-cookie',
      DOPPIO_BROWSER_COOKIES_JSON: JSON.stringify([{ name: 'additional', value: 'additional-test-cookie' }]) } });
  assert.equal(configured[0].value, 'environment-test-cookie');
  assert.equal(configured[1].name, 'additional');
  assert.throws(() => browserCookies({ repoRoot: fixture.root, baseUrl,
    environment: { DOPPIO_BROWSER_COOKIES_JSON: 'invalid' } }), /JSON cookie array/);
});

const fakeRuntime = `window.Doppio = { VM: { CLI(args, options, done) {
  const process = BrowserFS.BFSRequire('process');
  const Buffer = BrowserFS.BFSRequire('buffer').Buffer;
  const fs = BrowserFS.BFSRequire('fs');
  const mode = args[2];
  if (mode === 'throw') throw new Error('fixture launcher exception');
  if (mode === 'pageerror') { setTimeout(() => { throw new Error('fixture page exception'); }); return; }
  if (mode === 'http-error') { fetch('/missing-fixture-asset'); return; }
  if (mode === 'hang') return;
  if (mode === 'output-limit') { process.stdout.write('x'.repeat(200)); done(0); return; }
  if (mode === 'invalid-utf8') { process.stdout.write(new Buffer([255])); done(0); return; }
  if (mode === 'input') {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => input += chunk);
    process.stdin.on('end', () => { process.stdout.write(input); done(0); });
    return;
  }
  process.stdout.write('héllo\\n');
  process.stderr.write('diagnostic\\n');
  if (mode === 'arguments') process.stdout.write(JSON.stringify({
    args, options, cwd: process.cwd(), timezone: process.env.TZ,
    classBytes: fs.readFileSync('/classes/fixture/Main.class').toString('hex'),
    writable: (fs.writeFileSync('/work/example', 'written'), fs.readFileSync('/work/example', 'utf8')),
    cookieNames: document.cookie.split('; ').map((cookie) => cookie.split('=')[0])
  }) + '\\n');
  done(mode === 'nonzero' ? 7 : 0);
} } };`;

test('Chromium adapter captures streams, arguments and errors and recovers after failed cases',
  { skip: !fs.existsSync(executable) && 'Install Playwright Chromium or set DOPPIO_CHROMIUM_EXECUTABLE.' },
  async (context) => {
    const fixture = environment(context, fakeRuntime);
    fixture.write('ci/pages_browser_smoke.mjs', "name: 'dev_bypass_waf', value: 'browser-test-cookie'");
    const session = await createBrowserSession({ repoRoot: fixture.root });
    context.after(() => session.close());
    const execute = (mainClass, overrides = {}) => session.execute({ classesPath: fixture.classesPath,
      mainClass, timeoutMs: 10_000, arguments: [], ...overrides });
    const passed = await execute('arguments', { arguments: ['one', 'two with spaces', '☕'] });
    assert.equal(passed.status, 'passed', JSON.stringify(passed));
    assert.equal(passed.exitCode, 0);
    assert.equal(passed.stderr, 'diagnostic\n');
    assert.ok(passed.stdout.startsWith('héllo\n'));
    const captured = JSON.parse(passed.stdout.split('\n')[1]);
    assert.deepEqual(captured.args, ['-cp', '/classes', 'arguments', 'one', 'two with spaces', '☕']);
    const jar = await session.execute({classesPath: fixture.classesPath,
      jarPath: '/classes/한글 app.jar', timeoutMs: 10_000,
      arguments: ['arguments', '', ' ', '\t\n', '-ea']});
    assert.equal(jar.status, 'passed', JSON.stringify(jar));
    const jarCaptured = JSON.parse(jar.stdout.split('\n')[1]);
    assert.deepEqual(jarCaptured.args, ['-jar', '/classes/한글 app.jar', 'arguments', '', ' ', '\t\n', '-ea']);
    await assert.rejects(session.execute({classesPath: fixture.classesPath,
      jarPath: '/classes/../outside.jar', timeoutMs: 10_000}), /main class or .* JAR path/);
    assert.equal(captured.cwd, '/work');
    assert.equal(captured.timezone, 'UTC');
    assert.equal(captured.classBytes, 'cafebabe');
    const input = 'first\r\nβeta\rtail\n';
    const scripted = await execute('input', { standardInput: input });
    assert.equal(scripted.status, 'passed');
    assert.equal(scripted.stdout, input);
    assert.equal((await execute('input', { standardInput: '' })).stdout, '');
    await assert.rejects(execute('input', { standardInput: 'x'.repeat(1024 * 1024 + 1) }), /at most 1048576/);
    assert.equal(captured.writable, 'written');
    assert.ok(captured.cookieNames.includes('dev_bypass_waf'));
    assert.equal((await execute('nonzero')).exitCode, 7);
    assert.equal((await execute('nonzero')).status, 'failed');
    const thrown = await execute('throw');
    assert.equal(thrown.status, 'error');
    assert.match(thrown.error, /fixture launcher exception/);
    const pageError = await execute('pageerror');
    assert.equal(pageError.status, 'error');
    assert.ok(pageError.browserErrors.some((error) => error.includes('fixture page exception')));
    const requestError = await execute('http-error');
    assert.equal(requestError.status, 'error');
    assert.ok(requestError.browserErrors.some((error) => error.includes('HTTP 404')));
    const timeout = await execute('hang', { timeoutMs: 1500 });
    assert.equal(timeout.status, 'timeout');
    assert.equal(timeout.timedOut, true);
    const output = await execute('output-limit', { maxOutputBytes: 100 });
    assert.equal(output.status, 'output-limit');
    assert.equal(Buffer.byteLength(output.stdout), 100);
    const invalid = await execute('invalid-utf8');
    assert.equal(invalid.status, 'error');
    assert.equal(invalid.stdoutBase64, '/w==');
    assert.equal((await execute('normal')).status, 'passed');
    assert.match(session.provenance.runtime.sha256, /^[0-9a-f]{64}$/);
    assert.match(session.provenance.chromium, /^\d+\./);
    assert.equal(session.verifyIntegrity().status, 'verified');
  });
