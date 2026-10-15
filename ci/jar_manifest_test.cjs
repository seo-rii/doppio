'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {test} = require('node:test');
const runtimeRoot = path.resolve(process.env.DOPPIO_RELEASE_CLI_ROOT ||
  path.join(__dirname, '../build/release-cli'));
const {parseManifest} = require(path.join(runtimeRoot, 'src/manifest'));
const {manifestHasMultiReleaseTrue, UnindexedClasspathJar} = require(path.join(runtimeRoot, 'src/classpath'));
const JAR = require(path.join(runtimeRoot, 'src/jar')).default;

for (const ending of ['\n', '\r\n', '\r']) {
  for (const value of ['true', 'TRUE', 'True']) {
    test(`Multi-Release uses the main section (${JSON.stringify(ending)}, ${value})`, () => {
      const manifest = lines => lines.join(ending) + ending;
      assert.equal(manifestHasMultiReleaseTrue(manifest([
        'Manifest-Version: 1.0', `Multi-Release: ${value}`, '',
        'Name: example/Entry.class', 'Multi-Release: false', '',
      ])), true);
      assert.equal(manifestHasMultiReleaseTrue(manifest([
        'Manifest-Version: 1.0', '', 'Name: example/Entry.class', `Multi-Release: ${value}`, '',
      ])), false);
      assert.equal(manifestHasMultiReleaseTrue(manifest([
        'Manifest-Version: 1.0', 'Multi-Release: TR', ' UE', '',
      ])), true);
    });
  }
}

test('Manifest preserves sections, colons, value whitespace, and UTF-8 folding at byte boundaries', () => {
  const korean = Buffer.from('한😀글', 'utf8');
  const bytes = Buffer.concat([
    Buffer.from('Manifest-Version: 1.0\r\nMain-Class: example.Main\r\nImplementation-URL: https://example.test/a:b\r\nX-Value: '),
    korean.subarray(0, 2), Buffer.from('\r\n '), korean.subarray(2, 5),
    Buffer.from('\r\n '), korean.subarray(5),
    Buffer.from('  \r\n\r\nName: example/Entry.class\r\nMain-Class: wrong.Main\r\n\r\n'),
  ]);
  const manifest = parseManifest(bytes);
  assert.equal(manifest.mainAttributes['main-class'], 'example.Main');
  assert.equal(manifest.mainAttributes['implementation-url'], 'https://example.test/a:b');
  assert.equal(manifest.mainAttributes['x-value'], '한😀글  ');
  assert.equal(manifest.entries.length, 1);
  assert.equal(manifest.entries[0].name, 'example/Entry.class');
  assert.equal(manifest.entries[0].attributes['main-class'], 'wrong.Main');
  assert.equal(manifestHasMultiReleaseTrue('Manifest-Version: 1.0\nMulti-Release: true \n\n'), false);
});

test('Large entry sections do not repeatedly enumerate accumulated attributes', () => {
  const headerCount = 4000;
  const headers = Array.from({length: headerCount}, (_, i) => `X-${i}: value-${i}\n`).join('');
  const source = `Manifest-Version: 1.0\n\nName: example/Entry.class\n${headers}\n`;
  const originalKeys = Object.keys;
  let enumeratedKeys = 0, manifest;
  // Count section-wide work instead of relying on a timing threshold that can
  // vary with CI load. One complete enumeration is linear; one per header is not.
  Object.keys = object => {
    const keys = originalKeys(object);
    enumeratedKeys += keys.length;
    return keys;
  };
  try {
    manifest = parseManifest(source);
  } finally {
    Object.keys = originalKeys;
  }
  assert.equal(manifest.entries.length, 1);
  assert.equal(manifest.entries[0].name, 'example/Entry.class');
  assert.equal(manifest.entries[0].attributes['x-0'], 'value-0');
  assert.equal(manifest.entries[0].attributes[`x-${headerCount - 1}`], `value-${headerCount - 1}`);
  assert.ok(enumeratedKeys <= 2 * (headerCount + 1),
    `entry parsing enumerated ${enumeratedKeys} keys for ${headerCount} headers`);
});

test('Malformed headers and orphan continuations fail predictably', () => {
  for (const source of ['Not-A-Header\n', 'Main-Class:value\n', ' continuation\n',
    'Manifest-Version: 1.0\n\nMain-Class: entry.WithoutName\n']) {
    assert.throws(() => parseManifest(source), /Invalid manifest|must begin with Name/);
    assert.equal(manifestHasMultiReleaseTrue(source), false);
  }
});

test('The packaged unpacked-JAR API shares parsing and reports errors through its callback', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-jar-metadata-'));
  fs.mkdirSync(path.join(directory, 'META-INF'));
  const filename = path.join(directory, 'META-INF/MANIFEST.MF');
  const load = () => new Promise((resolve, reject) => {
    const jar = new JAR(directory, error => error ? reject(error) : resolve(jar));
  });
  try {
    fs.writeFileSync(filename, 'Manifest-Version: 1.0\nMain-Class: example.Main\n' +
      'Implementation-URL: https://example.test/a:b\nClass-Path: lib/ UPPER.JAR extensionless path%20with%20spaces/\n\n' +
      'Name: example/Entry.class\nMain-Class: wrong.Main\n\n');
    const jar = await load();
    assert.equal(jar.getAttribute('MAIN-CLASS'), 'example.Main');
    assert.equal(jar.getAttribute('Implementation-URL'), 'https://example.test/a:b');
    assert.deepEqual(jar.getClassPath(), ['lib/', 'UPPER.JAR', 'extensionless', 'path%20with%20spaces/']);
    const paths = jar.getClassPath();
    paths.push('mutation');
    assert.equal(jar.getClassPath().length, 4);
    fs.writeFileSync(filename, 'Manifest-Version: 1.0\nMalformed\n');
    await assert.rejects(load(), /Invalid manifest header/);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('Real archive class lookup honors main-section Multi-Release metadata', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-jar-classpath-'));
  const contents = path.join(directory, 'contents');
  const version = path.join(contents, 'META-INF/versions/17/example');
  fs.mkdirSync(version, {recursive: true});
  fs.mkdirSync(path.join(contents, 'example'));
  fs.writeFileSync(path.join(contents, 'example/Probe.class'), 'base-class-bytes');
  fs.writeFileSync(path.join(version, 'Probe.class'), 'version17-class-bytes');
  const tool = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin/jar') : 'jar';
  const cases = [
    ['uppercase', 'Manifest-Version: 1.0\r\nMulti-Release: TRUE\r\n\r\n', true],
    ['folded', 'Manifest-Version: 1.0\rMulti-Release: Tr\r ue\r\r', true],
    ['entry-only', 'Manifest-Version: 1.0\n\nName: example/Probe.class\nMulti-Release: true\n\n', false],
    ['entry-conflict', 'Manifest-Version: 1.0\nMulti-Release: true\n\nName: example/Probe.class\nMulti-Release: false\n\n', true],
  ];
  try {
    for (const [id, manifest, enabled] of cases) {
      fs.writeFileSync(path.join(contents, 'META-INF/MANIFEST.MF'), manifest);
      const filename = path.join(directory, id + '.jar');
      const result = spawnSync(tool, ['--create', '--no-manifest', '--file', filename, '-C', contents, '.'],
        {encoding: 'utf8', timeout: 15_000});
      assert.equal(result.status, 0, result.stderr || result.error?.message);
      const item = new UnindexedClasspathJar(filename);
      await new Promise((resolve, reject) => item.loadJar(error => error ? reject(error) : resolve()));
      assert.equal(item.tryLoadClassSync('example/Probe').toString(),
        enabled ? 'version17-class-bytes' : 'base-class-bytes', id);
      const data = await new Promise((resolve, reject) => item.loadClass('example/Probe',
        (error, data) => error ? reject(error) : resolve(data)));
      assert.equal(data.toString(), enabled ? 'version17-class-bytes' : 'base-class-bytes', id);
    }
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});
