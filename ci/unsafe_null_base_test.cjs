'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');

function loadSource(name) {
  const filename = path.join(runtime, 'src', name + '.js');
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS, esModuleInterop: false}
  }).outputText, filename);
  return loaded.exports;
}

const Heap = loadSource('heap').default;
const natives = loadSource('natives/sun_misc').default();
const unsafe = natives['sun/misc/Unsafe'];
const internalUnsafe = natives['jdk/internal/misc/Unsafe'];
const Long = require(path.join(runtime, 'src/gLong')).default;
const {ArrayClassData} = require(path.join(runtime, 'src/ClassData'));

function world() {
  const heap = new Heap(4096), errors = [];
  const thread = {getJVM: () => ({getHeap: () => heap}),
    throwNewException(type, message) { errors.push({type, message}); }};
  const address = Long.fromNumber(heap.malloc(64, true));
  const constructor = {};
  for (const [name, scale] of Object.entries({BOOLEAN: 1, BYTE: 1, CHAR: 2, SHORT: 2, INT: 4, LONG: 8, FLOAT: 4, DOUBLE: 8})) {
    constructor[`sun/misc/Unsafe/ARRAY_${name}_INDEX_SCALE`] = scale;
  }
  const receiver = {getClass: () => ({getConstructor: () => constructor})};
  return {heap, thread, receiver, address, errors};
}

function equalPrimitive(actual, expected, type) {
  if (type === 'J') assert.ok(actual.equals(expected), `${actual} instead of ${expected}`);
  else assert.ok(Object.is(actual, expected), `${actual} instead of ${expected}`);
}

const primitives = [
  ['Boolean', 'Z', [0, 1]],
  ['Byte', 'B', [-128, 127]],
  ['Char', 'C', [0, 65535]],
  ['Short', 'S', [-32768, 32767]],
  ['Int', 'I', [-2147483648, 2147483647]],
  ['Long', 'J', [Long.MIN_VALUE, Long.fromString('1234567890123456789')]],
  ['Float', 'F', [Math.fround(Math.PI), -0, NaN]],
  ['Double', 'D', [Math.PI, -0, NaN]]
];

for (const [name, type, values] of primitives) {
  test(`${name} plain and volatile null-base access agree with address overloads`, () => {
    const {thread, receiver, address, errors} = world();
    const readAddress = unsafe[`get${name === 'Boolean' ? 'Byte' : name}(J)${name === 'Boolean' ? 'B' : type}`];
    const writeAddress = unsafe[`put${name === 'Boolean' ? 'Byte' : name}(J${name === 'Boolean' ? 'B' : type})V`];
    for (const value of values) {
      for (const suffix of ['', 'Volatile']) {
        const get = unsafe[`get${name}${suffix}(Ljava/lang/Object;J)${type}`];
        const put = unsafe[`put${name}${suffix}(Ljava/lang/Object;J${type})V`];
        assert.doesNotThrow(() => put(thread, receiver, null, address, value));
        equalPrimitive(readAddress(thread, receiver, address), value, type);
        writeAddress(thread, receiver, address, value);
        equalPrimitive(get(thread, receiver, null, address), value, type);
      }
    }
    assert.deepEqual(errors, []);
  });
}

test('ordered int/long stores and internal Unsafe access use the same absolute address', () => {
  const {thread, receiver, address, errors} = world();
  for (const [name, type, value] of [['Int', 'I', 123456789], ['Long', 'J', Long.fromString('-123456789012345')]]) {
    unsafe[`putOrdered${name}(Ljava/lang/Object;J${type})V`](thread, receiver, null, address, value);
    equalPrimitive(unsafe[`get${name}(J)${type}`](thread, receiver, address), value, type);
    equalPrimitive(internalUnsafe[`get${name}(Ljava/lang/Object;J)${type}`](thread, receiver, null, address), value, type);
    internalUnsafe[`put${name}(Ljava/lang/Object;J${type})V`](thread, receiver, null, address, value);
    equalPrimitive(unsafe[`get${name}(Ljava/lang/Object;J)${type}`](thread, receiver, null, address), value, type);
  }
  assert.deepEqual(errors, []);
});

test('primitive plain and volatile access preserves instance fields, static bases, and scaled arrays', () => {
  const {thread, receiver, errors} = world();
  const fieldName = 'test/Fields/value', offset = Long.fromInt(24);
  const instance = {
    getClass: () => ({getInternalName: () => 'Ltest/Fields;',
      getObjectFieldFromVMIndex(index) { assert.equal(index, 24); return {fullName: fieldName}; }})
  };
  const staticStorage = {};
  const staticBase = {
    getClass: () => ({getInternalName: () => 'Ljava/lang/Object;'}),
    $staticFieldBase: {getConstructor: () => staticStorage,
      getStaticFieldFromVMIndex(index) { assert.equal(index, 24); return {fullName: fieldName}; }}
  };
  for (const [name, type, values] of primitives) {
    const cls = Object.create(ArrayClassData.prototype);
    cls.getInternalName = () => '[' + type;
    const array = {getClass: () => cls, array: [null, null]};
    const scale = {Z: 1, B: 1, C: 2, S: 2, I: 4, J: 8, F: 4, D: 8}[type];
    for (const suffix of ['', 'Volatile']) {
      const get = unsafe[`get${name}${suffix}(Ljava/lang/Object;J)${type}`];
      const put = unsafe[`put${name}${suffix}(Ljava/lang/Object;J${type})V`];
      const value = values[0];
      for (const [base, address] of [[instance, offset], [staticBase, offset], [array, Long.fromInt(scale)]]) {
        put(thread, receiver, base, address, value);
        equalPrimitive(get(thread, receiver, base, address), value, type);
      }
      assert.equal(array.array[0], null, 'primitive array byte offsets must still use the component scale');
    }
  }
  assert.deepEqual(errors, []);
});
