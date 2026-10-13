'use strict';
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {before, after, test} = require('node:test');
const {compileClassFileMetadata} = require('./compile_classfile_metadata.cjs');
const root = path.resolve(__dirname, '..'), prefix = 'java/lang/classfile/';
const legacy = new Set(['instruction/DiscontinuedInstruction',
  'instruction/DiscontinuedInstruction$JsrInstruction', 'instruction/DiscontinuedInstruction$RetInstruction']);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const native = new Map(), facade = new Map();
let temporary, sdk, jmodHash, readStructureLayout;
function checked(command, args, cwd = root, timeout = 60000) {
  const result = cp.spawnSync(command, args, {cwd, encoding:'utf8', timeout, maxBuffer:16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error)); assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-5000)); return result;
}
function unit(filename) {
  const bytes = fs.readFileSync(filename), layout = readStructureLayout(bytes);
  return {bytes, layout};
}
function parents(value) {
  const {bytes, layout} = value, pool = layout.pool;
  const name = index => { assert.equal(pool[index]?.tag, 7); return pool[pool[index].first].value; };
  const superIndex = bytes.readUInt16BE(layout.superClassOffset);
  return {superclass:superIndex ? name(superIndex) : null,
    interfaces:Array.from({length:layout.interfaceCount}, (_, at) => name(bytes.readUInt16BE(layout.interfacesOffset + at * 2)))};
}
function publicMethods(value) {
  return value.layout.methods.entries.filter(method => method.flags & 1)
    .map(method => ({name:method.name, descriptor:method.descriptor,
      flags:method.flags & (1 | 8 | 16 | 64 | 128 | 1024 | 4096)}))
    .sort((a, b) => (a.name + a.descriptor).localeCompare(b.name + b.descriptor));
}
function constant(value, field) {
  const attribute = field.attributes.entries.find(item => item.name === 'ConstantValue');
  if (!attribute) return null;
  assert.equal(attribute.length, 2);
  const {bytes, layout} = value, entry = layout.pool[bytes.readUInt16BE(attribute.body)];
  if (entry.tag === 8) return {tag:8, value:layout.pool[entry.first].value};
  assert.ok([3, 4, 5, 6].includes(entry.tag));
  return {tag:entry.tag, bits:bytes.subarray(entry.start + 1, entry.start + (entry.tag === 3 || entry.tag === 4 ? 5 : 9)).toString('hex')};
}
function publicFields(value) {
  return value.layout.fields.entries.filter(field => field.flags & 1)
    .map(field => ({name:field.name, descriptor:field.descriptor,
      flags:field.flags & (1 | 8 | 16 | 64 | 128 | 4096 | 16384), constant:constant(value, field)}))
    .sort((a, b) => a.name.localeCompare(b.name));
}
function selected() { return [...native]; }
before(async () => {
  ({readStructureLayout} = await import('./java_class_structure_test.mjs'));
  const {validateToolchains} = await import('./run_java_compatibility.mjs');
  const {treeDigest} = await import('./prepare_java_compatibility_toolchains.mjs');
  const lockBytes = fs.readFileSync(path.join(root, 'ci/java_compatibility_toolchains.lock.json')),
    lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(path.join(root, 'build/java-compatibility-toolchains/toolchains.json')));
  validateToolchains(marker, lock, sha(lockBytes), [21, 25]);
  sdk = marker.toolchains.find(item => item.feature === 25).home;
  assert.equal(treeDigest(sdk), lock.toolchains.find(item => item.feature === 25).treeSha256);
  const jmod = path.join(sdk, 'jmods/java.base.jmod'); jmodHash = sha(fs.readFileSync(jmod));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-public-abi-')); fs.chmodSync(temporary, 0o700);
  const nativeOutput = path.join(temporary, 'native'), output = path.join(temporary, 'compiled'), support = path.join(temporary, 'support');
  for (const directory of [nativeOutput, output, support]) fs.mkdirSync(directory);
  const jar = path.join(sdk, 'bin/jar');
  const entries = checked(jar, ['--list', '--file', jmod]).stdout.split(/\r?\n/)
    .filter(name => name.startsWith('classes/' + prefix) && name.endsWith('.class') && !name.endsWith('/package-info.class'));
  assert.ok(entries.length >= 220);
  checked(jar, ['--extract', '--file', jmod, ...entries], nativeOutput);
  for (const entry of entries) {
    const value = unit(path.join(nativeOutput, entry));
    if (value.layout.flags & 1) native.set(entry.slice(('classes/' + prefix).length, -6), value);
  }
  compileClassFileMetadata({root, classlib:path.join(root, 'classes/modern_classlib'), output, support, checked});
  for (const [name] of native) {
    const filename = path.join(output, prefix, name + '.class');
    if (fs.existsSync(filename)) facade.set(name, unit(filename));
  }
});
after(() => {
  try { if (sdk) assert.equal(sha(fs.readFileSync(path.join(sdk, 'jmods/java.base.jmod'))), jmodHash, 'Untouched native ABI reference'); }
  finally { if (temporary) fs.rmSync(temporary, {recursive:true, force:true}); }
});
test('actual locked SDK has exactly 220 exported-package public types and three named legacy types', () => {
  assert.equal(native.size, 220); assert.equal(selected().length, 220);
  for (const name of legacy) assert.ok(native.has(name), 'Actual legacy public ABI: ' + name);
  assert.equal([...native.values()].filter(value => value.layout.attributes.entries.some(item => item.name === 'PermittedSubclasses')).length, 195);
});
test('every public type including discontinued models has a real naturally target9 facade class, not a changed native header', () => {
  for (const [name, actual] of selected()) {
    const own = facade.get(name); assert.ok(own, 'Missing public facade ' + name);
    assert.equal(actual.bytes.readUInt16BE(6), 69);
    assert.equal(own.bytes.readUInt16BE(6), 53, 'Natural target9 output: ' + name);
    assert.equal(own.layout.flags & (1 | 16 | 512 | 1024 | 8192 | 16384),
      actual.layout.flags & (1 | 16 | 512 | 1024 | 8192 | 16384), 'Native public type shape: ' + name);
  }
});
test('all 220 native direct superclass and ordered interface contracts match', () => {
  for (const [name, actual] of selected()) assert.deepEqual(parents(facade.get(name)), parents(actual), name);
});
test('all selected declared public method descriptors, bridges, varargs and abstract/static contracts match', () => {
  for (const [name, actual] of selected()) assert.deepEqual(publicMethods(facade.get(name)), publicMethods(actual), name);
});
test('all selected public field descriptors and exact numeric/string constant bits match native', () => {
  for (const [name, actual] of selected()) assert.deepEqual(publicFields(facade.get(name)), publicFields(actual), name);
});
test('nominal ABI equality does not silently substitute for native sealed source/classfile/reflection topology', () => {
  assert.equal([...native.values()].filter(value => value.layout.attributes.entries.some(item => item.name === 'PermittedSubclasses')).length, 195);
  for (const [name] of selected()) assert.ok(!facade.get(name).layout.attributes.entries.some(item => item.name === 'PermittedSubclasses'),
    'Target9 nominal ABI explicitly remains nonsealed: ' + name);
});
