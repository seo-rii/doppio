'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');

// Compile the actual parser and CLI source; JVM execution has a separate native
// comparison gate in cli_launch_test.mjs.
const captures = [], cache = new Map();
class FakeJVM {
  static getDefaultOptions() { return {bootstrapClasspath: ['/bootstrap.jar']}; }
  constructor(options) { captures.push(options); }
  setPrintJITCompilation() {}
}
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.resolve(__dirname, '../src', name + '.ts');
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  cache.set(name, loaded);
  loaded.require = request => {
    if (request === './jvm') return {__esModule: true, default: FakeJVM};
    if (request === './util') return {merge: Object.assign};
    if (request === './logging') return {LogLevel: {ERROR: 10}, setLogLevel() {}};
    if (request.startsWith('./')) return load(request.slice(2));
    return require(request);
  };
  const source = (name === 'java_cli' ? 'const RELEASE = true;\n' : '') + fs.readFileSync(filename, 'utf8');
  loaded._compile(ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5,
      ignoreDeprecations: '6.0'}
  }).outputText, filename);
  return loaded.exports;
}
const {OptionParser} = load('option_parser');
const {assertionDirectives, assertionStatus} = load('assertions');
const {validateResponsiveness} = load('responsiveness');
const java = load('java_cli').default;
function options(args, defaults = {}) {
  const before = captures.length;
  java(args, {doppioHomePath: '/doppio', launcherName: 'doppio', ...defaults},
    () => assert.fail('Valid CLI options must construct a JVM.'));
  assert.equal(captures.length, before + 1);
  return captures.at(-1);
}
function enabled(args, name, system = false) {
  return assertionStatus(assertionDirectives(options([...args, 'Main'])), name, system);
}

test('preserves every application argument and never mutates argv', () => {
  const parser = new OptionParser({default: {jar: {type: 3, stopParsing: true},
    cp: {type: 3}, D: {type: 4}}});
  const raw = ['', ' ', '  padded  ', '\t', '\n', '한글', '𐐀😀', '-ea'];
  for (const prefix of [['Main'], ['-jar', '경로 with spaces.jar']]) {
    const argv = Object.freeze([...prefix, ...raw]);
    const parsed = parser.parse(argv).default;
    assert.deepEqual(parsed.unparsedArgs(), prefix[0] === 'Main' ? ['Main', ...raw] : raw);
    assert.deepEqual(argv, [...prefix, ...raw]);
  }
  const parsed = parser.parse(['-cp', ' /경로 with spaces/ ', '-Dkey=  value  ', 'Main']).default;
  assert.equal(parsed.stringOption('cp', null), ' /경로 with spaces/ ');
  assert.equal(parsed.mapOption('D').key, '  value  ');
  assert.deepEqual(parser.parse(['']).default.unparsedArgs(), ['']);
});

test('retains canonical ordered option occurrences across aliases and repetitions', () => {
  const parser = new OptionParser({default: {enable: {alias: 'e', type: 2}, disable: {alias: 'd', type: 2}}});
  assert.deepEqual(parser.parse(['-e', '-disable:pkg...', '-enable:pkg.C', '-d', 'Main'])
    .default.orderedOptions(), [
      {name: 'enable', value: true}, {name: 'disable', value: 'pkg...'},
      {name: 'enable', value: 'pkg.C'}, {name: 'disable', value: true}
    ]);
});

test('reads native classpath from X options without requiring a default list', () => {
  assert.deepEqual(options(['-Xnative-classpath', 'native path:한글', 'Main']).nativeClasspath,
    ['native path', '한글']);
  assert.deepEqual(options(['-Xnative-classpath', 'later', 'Main'], {nativeClasspath: ['earlier']})
    .nativeClasspath, ['earlier', 'later']);
});

test('assertion defaults and system defaults follow command line order independently', () => {
  for (const [flags, expected] of [
    [['-ea', '-da'], false], [['-da', '-ea'], true],
    [['-enableassertions', '-disableassertions', '-ea'], true]
  ]) assert.equal(enabled(flags, 'pkg.Main'), expected);
  for (const [flags, expected] of [
    [['-esa', '-dsa'], false], [['-dsa', '-esa'], true],
    [['-esa', '-da'], true], [['-ea'], false]
  ]) assert.equal(enabled(flags, 'java.lang.String', true), expected);
});

test('assertion specificity and repeated target order match Java rules', () => {
  assert.equal(enabled(['-ea:pkg...', '-da:pkg...'], 'pkg.C'), false);
  assert.equal(enabled(['-da:pkg...', '-ea:pkg...'], 'pkg.sub.C'), true);
  assert.equal(enabled(['-ea:pkg.C', '-da:pkg...'], 'pkg.C'), true);
  assert.equal(enabled(['-ea:pkg...', '-da:pkg.C', '-ea'], 'pkg.C'), false);
  assert.equal(enabled(['-ea:pkg...', '-da:pkg.sub...'], 'pkg.sub.C'), false);
  assert.equal(enabled(['-da:pkg.sub...', '-ea:pkg...'], 'pkg.sub.C'), false);
  assert.equal(enabled(['-ea:pkg...'], 'other.C'), false);
  assert.equal(enabled(['-ea:...'], 'Main'), true);
  assert.equal(enabled(['-ea:...'], 'pkg.Main'), false);
  assert.equal(enabled(['-ea:java.lang.String', '-dsa'], 'java.lang.String', true), true);
});

test('legacy API options seed ordered directives without broadening selected enables', () => {
  const directives = assertionDirectives({enableAssertions: ['pkg.C'], disableAssertions: ['pkg.C']});
  assert.equal(assertionStatus(directives, 'pkg.C', false), true);
  assert.equal(assertionStatus(directives, 'other.C', false), false);
  const defaults = {enableAssertions: true, assertionDirectives: [{enabled: true, scope: 'class', target: 'pkg.C'}]};
  const result = options(['-da', 'Main'], defaults);
  assert.equal(assertionStatus(assertionDirectives(result), 'pkg.C', false), true);
  assert.equal(assertionStatus(assertionDirectives(result), 'other.C', false), false);
  assert.equal(defaults.assertionDirectives.length, 1);
});

test('responsiveness rejects invalid and overflowing numeric budgets', () => {
  for (const value of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER, 2147483648]) {
    assert.throws(() => validateResponsiveness(value), RangeError);
  }
  for (const value of [1, 1000, 100000, 2147483647]) assert.equal(validateResponsiveness(value), value);
  const oldOut = process.stdout.write, oldErr = process.stderr.write;
  try {
    process.stdout.write = process.stderr.write = () => true;
    for (const value of ['0', '-1', '1.5', 'Infinity', '9'.repeat(400), '2147483648']) {
      let code;
      const before = captures.length;
      java([`-Xresponsiveness:${value}`, 'Main'], {doppioHomePath: '/doppio', launcherName: 'doppio'},
        result => { code = result; });
      assert.equal(code, 1);
      assert.equal(captures.length, before);
    }
  } finally {
    process.stdout.write = oldOut;
    process.stderr.write = oldErr;
  }
  assert.equal(options(['-Xresponsiveness:100000', 'Main']).responsiveness, 100000);
});
