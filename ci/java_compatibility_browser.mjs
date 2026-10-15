import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const adapterPath = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(adapterPath), '..');
const outputLimitBytes = 8 * 1024 * 1024;

function requireCondition(value, message) {
  if (!value) throw new Error(message);
}

function fileHash(filename) {
  const hash = crypto.createHash('sha256');
  const descriptor = fs.openSync(filename, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (;;) {
      const bytes = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (!bytes) break;
      hash.update(buffer.subarray(0, bytes));
    }
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest('hex');
}

function inventory(directory) {
  const files = [];
  function visit(candidate, relative) {
    const stat = fs.lstatSync(candidate);
    requireCondition(!stat.isSymbolicLink(), 'Browser inputs must not contain symbolic links.');
    if (stat.isDirectory()) {
      const listing = Object.create(null);
      for (const name of fs.readdirSync(candidate).sort()) {
        listing[name] = visit(path.join(candidate, name), relative ? `${relative}/${name}` : name);
      }
      return listing;
    }
    requireCondition(stat.isFile(), 'Browser inputs must be regular files or directories.');
    files.push({ path: relative, sha256: fileHash(candidate) });
    return null;
  }
  requireCondition(fs.lstatSync(directory).isDirectory(), 'A browser input directory is required.');
  const listing = visit(directory, '');
  return { listing, files,
    sha256: crypto.createHash('sha256').update(JSON.stringify({ listing, files })).digest('hex') };
}

function repositoryFile(repoRoot, filename) {
  const resolved = path.resolve(repoRoot, filename);
  const relative = path.relative(repoRoot, fs.realpathSync(resolved));
  requireCondition(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative) && fs.lstatSync(resolved).isFile(),
  'Browser runtime inputs must be regular files within the repository.');
  return resolved;
}

// The server exposes only the bundles, bootstrap inventory, and registered case
// directories. It does not expose the checkout or unrelated temporary files.
export async function createAssetServer({ repoRoot = defaultRepoRoot,
  runtimePath = 'build/release/doppio.js' } = {}) {
  repoRoot = fs.realpathSync(repoRoot);
  const runtime = repositoryFile(repoRoot, runtimePath);
  const browserfs = repositoryFile(repoRoot, 'node_modules/browserfs/dist/browserfs.min.js');
  const vendorRoot = path.join(repoRoot, 'vendor');
  const vendor = inventory(vendorRoot);
  const cases = new Map();
  let caseNumber = 0;
  const html = '<!doctype html><meta charset="utf-8"><title>Doppio compatibility fixture</title>' +
    '<script src="/assets/browserfs.min.js"></script><script src="/assets/doppio.js"></script>';
  function fileWithin(directory, relative) {
    const filename = path.resolve(directory, relative);
    const route = path.relative(directory, filename);
    if (!route || route === '..' || route.startsWith(`..${path.sep}`) || path.isAbsolute(route)) return null;
    let candidate = directory;
    for (const component of route.split(path.sep)) {
      candidate = path.join(candidate, component);
      if (!fs.existsSync(candidate) || fs.lstatSync(candidate).isSymbolicLink()) return null;
    }
    return fs.statSync(filename).isFile() ? filename : null;
  }
  const server = http.createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405).end();
        return;
      }
      if (pathname === '/favicon.ico') {
        response.writeHead(204).end();
        return;
      }
      let data;
      let filename;
      let contentType;
      if (pathname === '/') { data = html; contentType = 'text/html; charset=utf-8'; }
      else if (pathname === '/assets/doppio.js') { filename = runtime; contentType = 'text/javascript'; }
      else if (pathname === '/assets/browserfs.min.js') { filename = browserfs; contentType = 'text/javascript'; }
      else if (pathname === '/runtime/listings.json') {
        data = JSON.stringify({ vendor: vendor.listing }); contentType = 'application/json';
      } else if (pathname.startsWith('/runtime/vendor/')) {
        filename = fileWithin(vendorRoot, pathname.slice('/runtime/vendor/'.length));
      } else {
        const match = /^\/cases\/(\d+)\/(listings\.json|files\/(.+))$/.exec(pathname);
        const entry = match && cases.get(match[1]);
        if (entry && match[2] === 'listings.json') {
          data = JSON.stringify(entry.inventory.listing); contentType = 'application/json';
        } else if (entry) filename = fileWithin(entry.directory, match[3]);
      }
      if (data === undefined && !filename) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { 'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': data === undefined ? fs.statSync(filename).size : Buffer.byteLength(data),
        'Cache-Control': 'no-store' });
      if (request.method === 'HEAD') response.end();
      else if (data !== undefined) response.end(data);
      else {
        const stream = fs.createReadStream(filename);
        stream.on('error', () => response.destroy());
        stream.pipe(response);
      }
    } catch {
      response.writeHead(400).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const original = { runtime: fileHash(runtime), browserfs: fileHash(browserfs), vendor: vendor.sha256 };
  return {
    baseUrl,
    provenance: { runtime: { path: runtime, sha256: original.runtime },
      browserfs: { path: browserfs, sha256: original.browserfs },
      bootstrap: { path: vendorRoot, sha256: original.vendor, files: vendor.files } },
    registerClasses(classesPath) {
      const directory = fs.realpathSync(classesPath);
      const entry = { directory, inventory: inventory(directory) };
      const id = String(++caseNumber);
      cases.set(id, entry);
      return { id, listingUrl: `${baseUrl}/cases/${id}/listings.json`,
        fileBaseUrl: `${baseUrl}/cases/${id}/files/` };
    },
    unregisterClasses(id) { cases.delete(id); },
    verifyIntegrity() {
      requireCondition(fileHash(runtime) === original.runtime && fileHash(browserfs) === original.browserfs &&
        inventory(vendorRoot).sha256 === original.vendor, 'Browser runtime inputs changed during execution.');
      return { status: 'verified', runtimeSha256: original.runtime, browserfsSha256: original.browserfs,
        bootstrapSha256: original.vendor };
    },
    async close() {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}

export function browserCookies({ repoRoot = defaultRepoRoot, baseUrl, environment = process.env }) {
  let value = environment.DOPPIO_DEV_BYPASS_WAF_COOKIE;
  if (value === undefined) {
    const sourcePath = path.join(repoRoot, 'ci/pages_browser_smoke.mjs');
    if (fs.existsSync(sourcePath)) {
      const source = fs.readFileSync(sourcePath, 'utf8');
      value = /name:\s*['"]dev_bypass_waf['"],\s*value:\s*(['"])([^'"\r\n]*)\1/.exec(source)?.[2];
    }
  }
  const cookies = value ? [{ name: 'dev_bypass_waf', value }] : [];
  if (environment.DOPPIO_BROWSER_COOKIES_JSON) {
    let configured;
    try { configured = JSON.parse(environment.DOPPIO_BROWSER_COOKIES_JSON); }
    catch { throw new Error('DOPPIO_BROWSER_COOKIES_JSON must contain a JSON cookie array.'); }
    requireCondition(Array.isArray(configured), 'DOPPIO_BROWSER_COOKIES_JSON must contain a JSON cookie array.');
    for (const cookie of configured) {
      requireCondition(typeof cookie?.name === 'string' && cookie.name.length > 0 &&
        typeof cookie.value === 'string', 'Configured browser cookies require a name and value.');
      const duplicate = cookies.findIndex((entry) => entry.name === cookie.name);
      if (duplicate !== -1) cookies.splice(duplicate, 1);
      cookies.push({ name: cookie.name, value: cookie.value, path: cookie.path || '/' });
    }
  }
  return cookies.map((cookie) => ({ ...cookie, domain: new URL(baseUrl).hostname, path: cookie.path || '/' }));
}

export async function createBrowserSession({ repoRoot = defaultRepoRoot,
  runtimePath = 'build/release/doppio.js' } = {}) {
  repoRoot = fs.realpathSync(repoRoot);
  const assets = await createAssetServer({ repoRoot, runtimePath });
  let browser;
  try {
    const executablePath = process.env.DOPPIO_CHROMIUM_EXECUTABLE || chromium.executablePath();
    browser = await chromium.launch({ executablePath, headless: true });
    const cookies = browserCookies({ repoRoot, baseUrl: assets.baseUrl });
    const provenance = { ...assets.provenance, node: process.version,
      playwright: require('playwright/package.json').version, chromium: browser.version(),
      chromiumExecutable: { path: executablePath, sha256: fileHash(executablePath) },
      adapter: { path: adapterPath, sha256: fileHash(adapterPath) } };
    let closed = false;
    let active = false;
    return {
      provenance,
      verifyIntegrity() {
        const verified = assets.verifyIntegrity();
        requireCondition(fileHash(executablePath) === provenance.chromiumExecutable.sha256 &&
          fileHash(adapterPath) === provenance.adapter.sha256,
        'Browser executable or adapter changed during execution.');
        return { ...verified, chromiumExecutableSha256: provenance.chromiumExecutable.sha256,
          adapterSha256: provenance.adapter.sha256 };
      },
      async execute({ classesPath, mainClass, jarPath, arguments: programArguments = [], timeoutMs,
        standardInput = '', maxOutputBytes = outputLimitBytes }) {
        requireCondition(!closed && !active, 'Browser sessions require one active execution at a time.');
        requireCondition(((typeof mainClass === 'string' && mainClass.length > 0 && jarPath === undefined) ||
          (mainClass === undefined && typeof jarPath === 'string' && jarPath.startsWith('/classes/') &&
            !jarPath.split('/').includes('..'))) &&
          Array.isArray(programArguments) && programArguments.every((argument) => typeof argument === 'string'),
        'A main class or /classes/ JAR path and string program arguments are required.');
        requireCondition(typeof standardInput === 'string' && Buffer.byteLength(standardInput, 'utf8') <= 1024 * 1024,
          'Browser standard input must be a UTF-8 string of at most 1048576 bytes.');
        requireCondition(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 &&
          Number.isSafeInteger(maxOutputBytes) && maxOutputBytes > 0,
        'Positive execution timeout and output limits are required.');
        active = true;
        const started = Date.now();
        const launchArguments = jarPath === undefined ? ['-cp', '/classes', mainClass] : ['-jar', jarPath];
        const record = { command: ['chromium', 'Doppio.VM.CLI', ...launchArguments, ...programArguments],
          cwd: '/work', timeoutMs, status: 'running', exitCode: null, signal: null, timedOut: false,
          outputLimitExceeded: false, stdout: '', stderr: '', error: null, browserErrors: [] };
        const chunks = { stdout: [], stderr: [] };
        let capturedBytes = 0;
        let context;
        let registered;
        let timer;
        let stop;
        const stopped = new Promise((resolve) => { stop = resolve; });
        const browserError = (message) => { record.browserErrors.push(message); stop(); };
        try {
          registered = assets.registerClasses(classesPath);
          context = await browser.newContext({ locale: 'en-US', timezoneId: 'UTC' });
          await context.addCookies(cookies);
          const page = await context.newPage();
          page.on('pageerror', (error) => browserError(error.message));
          page.on('crash', () => browserError('Chromium page crashed.'));
          page.on('console', (message) => {
            if (message.type() === 'error') browserError(message.text());
          });
          page.on('requestfailed', (request) => browserError(
            `${request.failure()?.errorText || 'Request failed'} ${new URL(request.url()).pathname}`));
          page.on('response', (response) => {
            if (response.status() >= 400) browserError(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);
          });
          await page.exposeBinding('__compatibilityOutput', (_source, stream, encoded) => {
            const bytes = Buffer.from(encoded, 'base64');
            const remaining = Math.max(0, maxOutputBytes - capturedBytes);
            chunks[stream].push(bytes.subarray(0, remaining));
            capturedBytes += bytes.length;
            if (capturedBytes > maxOutputBytes) { record.outputLimitExceeded = true; stop(); }
          });
          timer = setTimeout(() => { record.timedOut = true; stop(); }, timeoutMs);
          const execution = (async () => {
            await page.goto(assets.baseUrl, { waitUntil: 'load', timeout: timeoutMs });
            record.exitCode = await page.evaluate(async ({ baseUrl, registered, launchArguments, programArguments,
              standardInput, maxOutputBytes }) => {
              const BFS = window.BrowserFS;
              const load = (listingUrl, fileBaseUrl) => new Promise((resolve, reject) => {
                BFS.FileSystem.XmlHttpRequest.FromURL(listingUrl,
                  (error, filesystem) => error ? reject(error) : resolve(filesystem), fileBaseUrl);
              });
              const runtime = await load(`${baseUrl}/runtime/listings.json`, `${baseUrl}/runtime/`);
              const classes = await load(registered.listingUrl, registered.fileBaseUrl);
              const filesystem = new BFS.FileSystem.MountableFileSystem();
              BFS.initialize(filesystem);
              filesystem.mount('/sys', runtime);
              filesystem.mount('/classes', classes);
              filesystem.mount('/tmp', new BFS.FileSystem.InMemory());
              filesystem.mount('/work', new BFS.FileSystem.InMemory());
              const process = BFS.BFSRequire('process');
              process.initializeTTYs();
              // Feed the same finite UTF-8 stream as the native/Node oracle.
              // push(null) closes the readable side, unlike TTY.end().
              if (standardInput.length) process.stdin.push(new (BFS.BFSRequire('buffer').Buffer)(standardInput, 'utf8'));
              process.stdin.push(null);
              process.chdir('/work');
              process.env.LANG = 'C.UTF-8';
              process.env.LC_ALL = 'C.UTF-8';
              process.env.TZ = 'UTC';
              let outputDelivery = Promise.resolve();
              let outputBytes = 0;
              for (const stream of ['stdout', 'stderr']) {
                process[stream].on('data', (data) => {
                  const remaining = Math.max(0, maxOutputBytes + 1 - outputBytes);
                  if (!remaining) return;
                  const bytes = data.slice(0, remaining);
                  outputBytes += bytes.length;
                  const encoded = bytes.toString('base64');
                  outputDelivery = outputDelivery.then(() => window.__compatibilityOutput(stream, encoded));
                });
              }
              // BrowserFS starts readable streams on its nextTick queue. Let
              // both streams enter flowing mode before even a synchronous CLI
              // callback can complete, then drain final writes before returning.
              await new Promise((resolve) => process.nextTick(resolve));
              return new Promise((resolve, reject) => {
                try {
                  window.Doppio.VM.CLI([...launchArguments, ...programArguments],
                    { doppioHomePath: '/sys', tmpDir: '/tmp' },
                    (exitCode) => new Promise((drained) => process.nextTick(drained))
                      .then(() => outputDelivery).then(() => resolve(exitCode), reject));
                } catch (error) { reject(error); }
              });
            }, { baseUrl: assets.baseUrl, registered, launchArguments, programArguments, standardInput, maxOutputBytes });
          })();
          const settled = execution.catch((error) => { record.error = error.message; });
          await Promise.race([settled, stopped]);
        } catch (error) {
          record.error = error.message;
        } finally {
          clearTimeout(timer);
          if (context) await context.close().catch((error) => { record.error ||= error.message; });
          if (registered) assets.unregisterClasses(registered.id);
          active = false;
        }
        for (const stream of ['stdout', 'stderr']) {
          const bytes = Buffer.concat(chunks[stream]);
          try {
            record[stream] = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
          } catch {
            record[`${stream}Base64`] = bytes.toString('base64');
            record.error = `Invalid UTF-8 in browser ${stream}; original bytes recorded as base64.`;
          }
        }
        record.durationMs = Date.now() - started;
        record.status = record.timedOut ? 'timeout' : record.outputLimitExceeded ? 'output-limit' :
          record.error || record.browserErrors.length ? 'error' : record.exitCode === 0 ? 'passed' : 'failed';
        return record;
      },
      async close() {
        if (closed) return;
        closed = true;
        try { await browser.close(); } finally { await assets.close(); }
      },
    };
  } catch (error) {
    try { if (browser) await browser.close(); } finally { await assets.close(); }
    throw error;
  }
}
