'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const runtimeRoot = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const {ClassFile} = require(path.join(runtimeRoot, 'src/doppiojvm')).VM;
const natives = require(path.join(runtimeRoot, 'src/natives/java_lang')).default();
const JVM = require(path.join(runtimeRoot, 'src/jvm')).default;
const {JVMStatus} = require(path.join(runtimeRoot, 'src/enums'));
assert.ok(new ClassFile.ClassFileVersionError('probe') instanceof ClassFile.ClassFileVersionError,
  'The release CLI must preserve Error subclasses after ES5 downlevel compilation');

// Structurally valid, method-free class. Header mutations are format probes,
// not evidence of source-language support for the selected class-file version.
function classBytes(major, minor, object = false) {
  const header = Buffer.alloc(10);
  header.writeUInt32BE(0xcafebabe, 0);
  header.writeUInt16BE(minor, 4);
  header.writeUInt16BE(major, 6);
  header.writeUInt16BE(5, 8);
  const utf8 = (text) => {
    const bytes = Buffer.from(text, 'utf8');
    const prefix = Buffer.alloc(3);
    prefix[0] = 1;
    prefix.writeUInt16BE(bytes.length, 1);
    return Buffer.concat([prefix, bytes]);
  };
  const body = Buffer.alloc(14);
  body.writeUInt16BE(0x21, 0);
  body.writeUInt16BE(2, 2);
  body.writeUInt16BE(object ? 0 : 4, 4);
  return Buffer.concat([header, utf8(object ? 'java/lang/Object' : 'version/Probe'), Buffer.from([7, 0, 1]),
    utf8('java/lang/Object'), Buffer.from([7, 0, 3]), body]);
}

function classLoader() {
  const loader = new ClassFile.ClassLoader(null);
  loader.bootstrap = loader;
  const object = new ClassFile.ReferenceClassData(classBytes(52, 0, true), null, loader);
  object.setResolved(null, []);
  loader.addClass('Ljava/lang/Object;', object);
  return loader;
}
function definitionThread(errors) {
  return {throwNewException(type, message) { errors.push({type, message}); },
    // These format probes do not execute guest code or fail hierarchy checks.
    // Dedicated loader units cover real exception-boundary failure capture.
    runWithExceptionBoundary(operation, callback) { operation(value => callback(null, value)); }};
}
function define(loader, thread, data) {
  return new Promise(resolve => loader.defineClass(thread, 'Lversion/Probe;', data, null, resolve));
}
async function main() {
let scenarios = 0;
const descriptor = 'Lversion/Probe;';
async function checkRejection(bytes, expected) {
  const loader = classLoader();
  const errors = [];
  const thread = definitionThread(errors);
  assert.equal(await define(loader, thread, bytes), null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].type, `Ljava/lang/${expected};`);
  assert.equal(typeof errors[0].message, 'string');
  assert.deepEqual(loader.getLoadedClassNames(), ['Ljava/lang/Object;']);
  // A rejected definition must not poison a later valid definition of the name.
  assert.ok(await define(loader, thread, classBytes(52, 0)));
  assert.deepEqual(loader.getLoadedClassNames(), ['Ljava/lang/Object;', descriptor]);
  assert.equal(errors.length, 1);

  const lookupErrors = [];
  const lookup = {
    'java/lang/invoke/MethodHandles$Lookup/allowedModes': 8,
    'java/lang/invoke/MethodHandles$Lookup/lookupClass': {$cls: {
      getLoader() { return new ClassFile.ClassLoader(null); },
      getProtectionDomain() { return null; }
    }}
  };
  const lookupThread = {throwNewException(type, message) { lookupErrors.push({type, message}); }};
  natives['java/lang/invoke/DoppioMethodHandles']['defineClass(Ljava/lang/invoke/MethodHandles$Lookup;[B)Ljava/lang/Class;'](
    lookupThread, lookup, {array: Array.from(bytes, (byte) => byte > 127 ? byte - 256 : byte)});
  assert.equal(lookupErrors.length, 1);
  assert.equal(lookupErrors[0].type, `Ljava/lang/${expected};`);
  assert.equal(typeof lookupErrors[0].message, 'string');
  scenarios++;
}

for (const major of [0, 44, 71, 65535]) {
  await checkRejection(classBytes(major, 0), 'UnsupportedClassVersionError');
}
for (const major of [56, 64, 65, 69, 70]) {
  for (const minor of [1, 65534, 65535]) {
    const bytes = classBytes(major, minor);
    await checkRejection(bytes, 'UnsupportedClassVersionError');
    assert.throws(() => new ClassFile.ReferenceClassData(bytes), ClassFile.ClassFileVersionError);
  }
}
for (const major of [45, 46, 52, 55, 56, 65, 69, 70]) {
  for (const minor of major < 56 ? [0, 1, 3, 65534, 65535] : [0]) {
    const loader = classLoader(), errors = [];
    const cls = await define(loader, definitionThread(errors), classBytes(major, minor));
    assert.deepEqual(errors, []);
    assert.ok(cls);
    assert.equal(cls.majorVersion, major);
    scenarios++;
  }
}
const valid = classBytes(52, 0);
const badMagic = Buffer.from(valid);
badMagic[0] = 0;
await checkRejection(badMagic, 'ClassFormatError');
for (let length = 0; length < 8; length++) await checkRejection(valid.subarray(0, length), 'ClassFormatError');

// The application loader must not replace a found-but-invalid class's Java
// exception with ClassNotFoundException; ordinary lookup failures keep their
// existing explicit/implicit translation.
for (const type of ['UnsupportedClassVersionError', 'ClassFormatError', 'VerifyError', 'ClassNotFoundException']) {
  for (const explicit of type === 'ClassNotFoundException' ? [true, false] : [true]) {
    const missingClass = {};
    const thrown = [];
    const exception = {type, getClass() { return {isCastable(target) {
      assert.equal(target, missingClass);
      return type === 'ClassNotFoundException';
    }}; }};
    const loader = new ClassFile.CustomClassLoader({getLoadedClass(name) {
      assert.equal(name, 'Ljava/lang/ClassNotFoundException;');
      return missingClass;
    }}, {'loadClass(Ljava/lang/String;)Ljava/lang/Class;'(thread, args, callback) { callback(exception); }});
    // Supply the minimal String/char-array constructors needed to pass the
    // class name, without booting a Java VM for this focused propagation check.
    loader.bootstrap.getInitializedClass = () => ({getConstructor() {
      return function(thread, length) { this.array = new Array(length); };
    }});
    loader.bootstrap.getResolvedClass = () => ({getConstructor() { return function() {}; }});
    const fakeThread = {
      throwException(error) { thrown.push(error); },
      throwNewException(error) { thrown.push(error); }
    };
    let completed = false;
    loader._loadClass(fakeThread, descriptor, (data) => { assert.equal(data, null); completed = true; }, explicit);
    assert.equal(completed, true);
    assert.deepEqual(thrown, [type === 'ClassNotFoundException' ?
      (explicit ? 'Ljava/lang/ClassNotFoundException;' : 'Ljava/lang/NoClassDefFoundError;') : exception]);
    scenarios++;
  }
}

// A failed top-level load must allow its pending Java exception to print, then
// report failure exactly once through ordinary shutdown, not an early callback.
let loadCompleted;
const completions = [];
const shutdownCodes = [];
let closed = 0;
const launch = {
  status: JVMStatus.BOOTED, exitCode: 0,
  firstThread: {close() { closed++; }},
  bsCl: {getInitializedClass() { return {getConstructor() {
    return {'java/lang/System/exit(I)V'(thread, args) { shutdownCodes.push(args[0]); }};
  }}; }},
  systemClassLoader: {initializeClass(thread, name, callback) {
    assert.equal(launch.status, JVMStatus.BOOTED);
    assert.equal(JVM.prototype.hasVMBooted.call(launch), false);
    assert.equal(launch.exitCode, 1);
    assert.equal(name, 'Lversion/Probe;');
    loadCompleted = callback;
  }}
};
JVM.prototype.runClass.call(launch, 'version.Probe', [], (code) => completions.push(code));
const write = process.stdout.write;
let diagnostic = '';
try {
  process.stdout.write = (text) => { diagnostic += text; return true; };
  loadCompleted(null);
} finally { process.stdout.write = write; }
assert.match(diagnostic, /Could not find or load main class version.Probe/);
assert.equal(launch.status, JVMStatus.RUNNING);
assert.deepEqual(completions, []);
assert.equal(JVM.prototype.threadPoolIsEmpty.call(launch), false);
assert.deepEqual(shutdownCodes, [1]);
assert.deepEqual(completions, []);
assert.equal(JVM.prototype.threadPoolIsEmpty.call(launch), true);
assert.deepEqual(completions, [1]);
assert.equal(closed, 1);
scenarios++;
console.log(`class-file-version:${scenarios}:ok (parser, loader, Lookup, recovery, propagation, launch shutdown)`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
