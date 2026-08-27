import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(repoRoot, 'package.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const requiredEntries = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'bin/doppio',
  'bin/doppio-dev',
  'bin/doppio-fast-dev',
  'bin/doppioh',
  'dist/dev-cli/console/download_jdk.js',
  'dist/dev-cli/console/runner.js',
  'dist/doppio.jar',
  'dist/fast-dev-cli/console/runner.js',
  'dist/release/doppio.js',
  'dist/release-cli/console/doppioh.js',
  'dist/release-cli/console/runner.js',
  'dist/release-cli/src/doppiojvm.js',
  'dist/typings/src/doppiojvm.d.ts',
  'docs/README.md',
  'docs/modern-java.md',
  'docs/support.md',
  'install.js',
  'package.json',
  'prepack.cjs',
  'types/public.d.ts'
];

function resolveNpmCli() {
  const executableDirectory = path.dirname(process.execPath);
  const candidates = [];
  if (process.env.npm_execpath !== undefined && path.basename(process.env.npm_execpath).toLowerCase() === 'npm-cli.js') {
    candidates.push(process.env.npm_execpath);
  }
  candidates.push(
    path.join(executableDirectory, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.resolve(executableDirectory, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')
  );
  for (const pathEntry of (process.env.PATH ?? '').split(path.delimiter)) {
    if (pathEntry.length > 0) {
      candidates.push(path.join(pathEntry, 'node_modules', 'npm', 'bin', 'npm-cli.js'));
    }
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return fs.realpathSync(candidate);
    }
  }
  throw new Error(`Unable to locate npm-cli.js next to ${process.execPath}.`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 45 * 60 * 1000,
    ...options
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}.\n${output}`);
  }
  return result.stdout;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function snapshotTrackedFiles() {
  const trackedOutput = run('git', ['ls-files', '-z'], {cwd: repoRoot});
  const snapshot = [];
  for (const relativePath of trackedOutput.split('\0').filter(Boolean)) {
    const absolutePath = path.join(repoRoot, relativePath);
    let stat;
    try {
      stat = fs.lstatSync(absolutePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      snapshot.push({path: relativePath, type: 'missing'});
      continue;
    }
    const contents = stat.isSymbolicLink() ? Buffer.from(fs.readlinkSync(absolutePath)) : fs.readFileSync(absolutePath);
    snapshot.push({
      path: relativePath,
      mode: stat.mode & 0o777,
      type: stat.isSymbolicLink() ? 'link' : stat.isFile() ? 'file' : 'other',
      sha256: crypto.createHash('sha256').update(contents).digest('hex')
    });
  }
  return snapshot;
}

function parsePackOutput(output) {
  const trimmed = output.trim();
  const jsonStart = trimmed.lastIndexOf('\n[');
  return JSON.parse(jsonStart === -1 ? trimmed : trimmed.slice(jsonStart + 1));
}

function validatePackagedRelativeLinks(packageRoot, relativePaths) {
  for (const relativePath of relativePaths) {
    const contents = fs.readFileSync(path.join(packageRoot, relativePath), 'utf8');
    const targets = [];
    if (relativePath.endsWith('.md')) {
      for (const match of contents.matchAll(/\]\(([^)]+)\)/g)) {
        targets.push(match[1]);
      }
    } else if (relativePath.endsWith('.html')) {
      for (const match of contents.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
        targets.push(match[1]);
      }
    }

    for (let target of targets) {
      target = target.trim().replace(/^<|>$/g, '').split('#', 1)[0].split('?', 1)[0];
      if (target.length === 0 || target.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(target)) {
        continue;
      }
      const resolvedTarget = path.resolve(packageRoot, path.dirname(relativePath), decodeURIComponent(target));
      assert.ok(
        resolvedTarget === packageRoot || resolvedTarget.startsWith(`${packageRoot}${path.sep}`),
        `${relativePath} links outside the package: ${target}`
      );
      assert.ok(fs.existsSync(resolvedTarget), `${relativePath} has a broken packaged relative link: ${target}`);
    }
  }
}

assert.equal(manifest.name, 'doppiojvm');
assert.equal(manifest.version, '0.6.0');
assert.deepEqual(manifest.engines, {node: '>=24 <25'});
assert.equal(manifest.main, 'dist/release-cli/src/doppiojvm.js');
assert.equal(manifest.browser, 'dist/release/doppio.js');
assert.equal(manifest.types, 'types/public.d.ts');
assert.deepEqual(manifest.files, [
  'CHANGELOG.md',
  'bin',
  'dist',
  'docs/README.md',
  'docs/modern-java.md',
  'docs/support.md',
  'install.js',
  'prepack.cjs',
  'types/public.d.ts'
]);
assert.equal(manifest.scripts.prepack, 'node ./prepack.cjs');
assert.equal(manifest.scripts.install, 'node ./install.js');
assert.equal(manifest.scripts.prepublish, undefined);

for (const [name, relativePath] of Object.entries(manifest.bin)) {
  assert.ok(fs.existsSync(path.join(repoRoot, relativePath)), `bin.${name} points to a missing file`);
}
for (const relativePath of [manifest.main, manifest.browser, manifest.types, 'install.js', 'prepack.cjs']) {
  assert.ok(typeof relativePath === 'string' && relativePath.length > 0, 'package entry paths must be strings');
}

const workflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'package-artifact.yml'), 'utf8');
assert.match(workflow, /node-version:\s*24/);
assert.match(workflow, /java-version:\s*17/);
assert.match(workflow, /run:\s*yarn ci:check-package-artifact/);
const npmCli = resolveNpmCli();
const trackedFilesBeforePack = snapshotTrackedFiles();

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-package-'));
const staleSentinel = path.join(repoRoot, 'dist', 'package-artifact-stale-sentinel.txt');
try {
  fs.mkdirSync(path.dirname(staleSentinel), {recursive: true});
  fs.writeFileSync(staleSentinel, 'normal npm pack must remove this stale dist file\n');

  const packOutput = run(
    process.execPath,
    [npmCli, 'pack', '--json', '--silent', '--pack-destination', temporaryDirectory],
    {cwd: repoRoot}
  );
  const packResult = parsePackOutput(packOutput);
  assert.equal(packResult.length, 1, 'npm pack must produce exactly one archive');
  assert.equal(packResult[0].filename, `doppiojvm-${manifest.version}.tgz`);
  assert.ok(!fs.existsSync(staleSentinel), 'normal npm pack did not run the clean prepack build');
  assert.deepEqual(
    snapshotTrackedFiles(),
    trackedFilesBeforePack,
    'normal npm pack changed tracked source files or Java test oracles'
  );
  assert.ok(packResult[0].size > 0 && packResult[0].size < 16 * 1024 * 1024, 'npm archive size is unexpected');

  const archiveEntries = new Set(packResult[0].files.map((file) => file.path));
  for (const requiredEntry of requiredEntries) {
    assert.ok(archiveEntries.has(requiredEntry), `${requiredEntry} is missing from the npm archive`);
  }
  assert.ok(!archiveEntries.has('dist/package-artifact-stale-sentinel.txt'), 'stale dist content leaked into the archive');
  for (const excludedDirectory of ['build', 'ci', 'classes', 'src', 'website', 'vendor']) {
    assert.ok(
      ![...archiveEntries].some((entry) => entry.startsWith(`${excludedDirectory}/`)),
      `${excludedDirectory}/ leaked into the npm archive`
    );
  }
  assert.ok(
    ![...archiveEntries].some(
      (entry) =>
        entry.startsWith('docs/assets/') ||
        entry.startsWith('docs/examples/') ||
        entry.startsWith('docs/playground/')
    ),
    'generated or non-self-contained browser content leaked into the npm archive'
  );

  const archivePath = path.join(temporaryDirectory, packResult[0].filename);
  const fixtureJavaHome = path.join(temporaryDirectory, 'fixture-java-home');
  fs.mkdirSync(path.join(fixtureJavaHome, 'lib', 'ext'), {recursive: true});
  fs.writeFileSync(path.join(fixtureJavaHome, '.doppio-install-fixture'), 'doppio-install-test-fixture-v1\n');
  fs.writeFileSync(path.join(fixtureJavaHome, 'lib', 'rt.jar'), 'local package lifecycle fixture\n');
  writeJson(path.join(fixtureJavaHome, 'jdk.json'), {
    url: 'https://github.com/plasma-umass/doppio_jcl/releases/download/v3.2/java_home.tar.gz',
    classpath: ['lib/rt.jar', 'lib/doppio.jar']
  });
  fs.writeFileSync(
    path.join(fixtureJavaHome, 'jdk.json.d.ts'),
    'declare const JDKInfo: { url: string; classpath: string[] };\nexport = JDKInfo;\n'
  );

  const consumerRoot = path.join(temporaryDirectory, 'consumer');
  fs.mkdirSync(path.join(consumerRoot, 'src'), {recursive: true});
  writeJson(path.join(consumerRoot, 'package.json'), {
    name: 'doppio-package-consumer',
    private: true,
    type: 'module',
    dependencies: {
      doppiojvm: `file:${archivePath}`
    },
    devDependencies: {
      typescript: '6.0.3',
      vite: '4.5.14'
    }
  });

  const isolatedEnvironment = {
    ...process.env,
    DOPPIO_INSTALL_TEST_JDK: fixtureJavaHome,
    DOPPIO_INSTALL_TEST_ONLY: '1',
    NODE_ENV: 'test',
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_ignore_scripts: 'false'
  };
  delete isolatedEnvironment.NODE_PATH;

  run(
    process.execPath,
    [npmCli, 'install', '--no-package-lock'],
    {cwd: consumerRoot, env: isolatedEnvironment}
  );
  for (let attempt = 0; attempt < 2; attempt += 1) {
    run(
      process.execPath,
      [npmCli, 'rebuild', 'doppiojvm'],
      {cwd: consumerRoot, env: isolatedEnvironment}
    );
  }

  const installedRoot = path.join(consumerRoot, 'node_modules', 'doppiojvm');
  const installedManifest = JSON.parse(fs.readFileSync(path.join(installedRoot, 'package.json'), 'utf8'));
  assert.equal(installedManifest.version, '0.6.0');
  assert.equal(installedManifest.main, manifest.main);
  assert.equal(installedManifest.browser, manifest.browser);
  assert.equal(installedManifest.types, manifest.types);
  for (const requiredEntry of requiredEntries) {
    assert.ok(fs.existsSync(path.join(installedRoot, requiredEntry)), `installed package is missing ${requiredEntry}`);
  }
  validatePackagedRelativeLinks(
    installedRoot,
    [...archiveEntries].filter((entry) => /\.(?:html|md)$/i.test(entry))
  );
  assert.match(
    fs.readFileSync(path.join(installedRoot, 'README.md'), 'utf8'),
    /https:\/\/github\.com\/seo-rii\/doppio\/tree\/modern\/docs\/examples/,
    'the packaged README must link to the modern-branch example sources'
  );

  const installedVendor = fs.realpathSync(path.join(installedRoot, 'vendor'));
  assert.ok(!installedVendor.startsWith(fs.realpathSync(repoRoot)), 'installed vendor directory points into the repository');
  for (const buildType of ['dev', 'dev-cli', 'fast-dev', 'fast-dev-cli', 'release', 'release-cli']) {
    const vendorLink = path.join(installedRoot, 'dist', buildType, 'vendor');
    assert.ok(fs.lstatSync(vendorLink).isSymbolicLink(), `${buildType}/vendor must be a link`);
    assert.equal(fs.realpathSync(vendorLink), installedVendor, `${buildType}/vendor points to the wrong package`);
  }
  assert.deepEqual(
    fs.readFileSync(path.join(installedRoot, 'vendor', 'java_home', 'lib', 'doppio.jar')),
    fs.readFileSync(path.join(installedRoot, 'dist', 'doppio.jar')),
    'install lifecycle did not place the packaged doppio.jar in the fixture JDK'
  );

  const apiOutput = run(
    process.execPath,
    [
      '-e',
      `const api = require('doppiojvm');
const shape = {
  topLevel: Object.keys(api).sort(),
  vmHasHeap: Object.hasOwn(api.VM, 'Heap'),
  vmJvm: typeof api.VM.JVM,
  logLevelValues: [
    api.Debug.Logging.LogLevel.ERROR,
    api.Debug.Logging.LogLevel.DEBUG,
    api.Debug.Logging.LogLevel.TRACE,
    api.Debug.Logging.LogLevel.VTRACE
  ],
  logLevelName: api.Debug.Logging.LogLevel[1],
  currentLogLevel: api.Debug.Logging.logLevel,
  sequenceMatcher: typeof api.Debug.Difflib.SequenceMatcher,
  sequenceTextDiff: typeof api.Debug.Difflib.SequenceMatcher.prototype.text_diff,
  doppioTestRun: typeof api.Testing.DoppioTest.prototype.run
};
process.stdout.write(JSON.stringify(shape));`
    ],
    {cwd: consumerRoot, env: isolatedEnvironment}
  );
  const apiShape = JSON.parse(apiOutput);
  const expectedValueExports = ['Debug', 'Heap', 'Testing', 'VM'];
  assert.deepEqual(apiShape.topLevel, expectedValueExports, 'packaged API value exports changed');
  assert.equal(apiShape.vmHasHeap, false, 'VM invented a Heap export');
  assert.equal(apiShape.vmJvm, 'function');
  assert.deepEqual(apiShape.logLevelValues, [1, 5, 9, 10]);
  assert.equal(apiShape.logLevelName, 'ERROR');
  assert.equal(apiShape.currentLogLevel, 1);
  assert.equal(apiShape.sequenceMatcher, 'function');
  assert.equal(apiShape.sequenceTextDiff, 'function');
  assert.equal(apiShape.doppioTestRun, 'function');

  const requireFromConsumer = createRequire(path.join(consumerRoot, 'package.json'));
  const typescript = requireFromConsumer('typescript');
  const declarationPath = path.join(installedRoot, installedManifest.types);
  const declaration = typescript.createSourceFile(
    declarationPath,
    fs.readFileSync(declarationPath, 'utf8'),
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS
  );
  const declarationValueExports = [];
  for (const statement of declaration.statements) {
    const exported = statement.modifiers?.some((modifier) => modifier.kind === typescript.SyntaxKind.ExportKeyword);
    if (!exported) {
      continue;
    }
    if (typescript.isClassDeclaration(statement) || typescript.isFunctionDeclaration(statement)) {
      if (statement.name !== undefined) {
        declarationValueExports.push(statement.name.text);
      }
    } else if (typescript.isVariableStatement(statement)) {
      for (const declarationItem of statement.declarationList.declarations) {
        assert.ok(typescript.isIdentifier(declarationItem.name), 'public value exports must use identifiers');
        declarationValueExports.push(declarationItem.name.text);
      }
    }
  }
  assert.deepEqual(
    declarationValueExports.sort(),
    expectedValueExports,
    'published declaration value exports do not match the CommonJS API'
  );

  for (const [binName, relativePath] of Object.entries(manifest.bin)) {
    const executable = path.resolve(installedRoot, relativePath);
    const result = spawnSync(process.execPath, [executable, '-help'], {
      cwd: consumerRoot,
      encoding: 'utf8',
      env: isolatedEnvironment,
      timeout: 60 * 1000
    });
    if (result.error) {
      throw result.error;
    }
    assert.ok([0, 1].includes(result.status), `${binName} -help exited with ${result.status}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /Usage:/, `${binName} did not print its help`);
  }

  fs.writeFileSync(
    path.join(consumerRoot, 'src', 'browser-consumer.js'),
`import {Debug, Heap, Testing, VM} from 'doppiojvm';

const heap = new Heap(64);
heap.store_word(0, 0x12345678);
const matcher = new Debug.Difflib.SequenceMatcher(['same'], ['same']);
if (
  heap.get_word(0) !== 0x12345678 ||
  typeof VM.JVM !== 'function' ||
  Object.hasOwn(VM, 'Heap') ||
  Debug.Logging.LogLevel.ERROR !== 1 ||
  Debug.Logging.logLevel !== Debug.Logging.LogLevel.ERROR ||
  !Array.isArray(matcher.text_diff(3)) ||
  typeof Testing.DoppioTest.prototype.run !== 'function'
) {
  throw new Error('Doppio browser exports did not execute correctly.');
}

export const browserConsumerResult = 'browser-consumer-ok';
`
  );
  fs.writeFileSync(
    path.join(consumerRoot, 'vite.config.mjs'),
`import {defineConfig} from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/browser-consumer.js',
      fileName: () => 'consumer.js',
      formats: ['es']
    },
    minify: false,
    target: 'es2022'
  }
});
`
  );

  const vitePackage = requireFromConsumer.resolve('vite/package.json');
  run(process.execPath, [path.join(path.dirname(vitePackage), 'bin', 'vite.js'), 'build'], {
    cwd: consumerRoot,
    env: isolatedEnvironment
  });
  const browserOutput = run(
    process.execPath,
    [
      '-e',
      "globalThis.window = globalThis; globalThis.self = globalThis; " +
        "import('./dist/consumer.js').then((module) => process.stdout.write(module.browserConsumerResult));"
    ],
    {cwd: consumerRoot, env: isolatedEnvironment}
  );
  assert.equal(browserOutput, 'browser-consumer-ok');

  fs.writeFileSync(
    path.join(consumerRoot, 'type-consumer.ts'),
`import {
  Debug,
  Heap,
  Testing,
  VM,
  type DoppioTestInstance,
  type JVM,
  type JVMOptions,
  type LogLevel
} from 'doppiojvm';

const options: JVMOptions = {doppioHomePath: '.', intMode: true};
const heap: Heap = new Heap(64);
const word: number = heap.get_word(0);
const jvmConstructor = VM.JVM;
let jvmInstance: JVM | undefined;
const difference: string | null = Testing.diff('same', 'same');
const errorLevel: LogLevel = Debug.Logging.LogLevel.ERROR;
const currentLevel: LogLevel = Debug.Logging.logLevel;
Debug.Logging.setLogLevel(errorLevel);
const matcher = new Debug.Difflib.SequenceMatcher(['same'], ['same']);
const diffLines: string[] = matcher.text_diff(3);
declare const test: DoppioTestInstance;
test.run(
  (callback) => void callback,
  (error: Error | null) => void error
);
// @ts-expect-error Heap is a top-level export, not a VM namespace member.
VM.Heap;
void options;
void word;
void jvmConstructor;
void jvmInstance;
void difference;
void currentLevel;
void diffLines;
`
  );
  writeJson(path.join(consumerRoot, 'tsconfig.json'), {
    compilerOptions: {
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      noEmit: true,
      skipLibCheck: false,
      strict: true,
      target: 'ES2022',
      types: []
    },
    files: ['type-consumer.ts']
  });
  const typescriptPackage = requireFromConsumer.resolve('typescript/package.json');
  run(process.execPath, [path.join(path.dirname(typescriptPackage), 'bin', 'tsc')], {
    cwd: consumerRoot,
    env: isolatedEnvironment
  });

  if (process.env.DOPPIO_PACKAGE_OUTPUT_DIR !== undefined) {
    const outputDirectory = path.resolve(repoRoot, process.env.DOPPIO_PACKAGE_OUTPUT_DIR);
    const requiredOutputDirectory = path.join(repoRoot, 'build', 'package-artifact');
    assert.equal(outputDirectory, requiredOutputDirectory, 'DOPPIO_PACKAGE_OUTPUT_DIR must target build/package-artifact');
    const outputBasename = process.env.DOPPIO_PACKAGE_ARTIFACT_BASENAME;
    assert.match(
      outputBasename ?? '',
      /^doppiojvm-0\.6\.0-[0-9a-f]{40}-[1-9][0-9]*\.tgz$/,
      'DOPPIO_PACKAGE_ARTIFACT_BASENAME must identify the commit and run attempt'
    );
    fs.mkdirSync(outputDirectory, {recursive: true});
    fs.copyFileSync(archivePath, path.join(outputDirectory, outputBasename));
  }

  console.log(`npm artifact smoke passed: ${packResult[0].filename} (${packResult[0].size} bytes).`);
} finally {
  fs.rmSync(staleSentinel, {force: true});
  fs.rmSync(temporaryDirectory, {recursive: true, force: true});
}
