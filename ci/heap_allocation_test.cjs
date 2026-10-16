'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {test} = require('node:test');
const ts = require('typescript');

// Compile the actual allocator without modifying shared release build files.
const filename = path.join(__dirname, '../src/heap.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS}
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);
const Heap = loaded.exports.default;

function snapshot(heap) {
  return {
    offset: heap._offset,
    remaining: heap._remaining,
    freeLists: heap._freeLists.map(list => list.slice()),
    sizeMap: {...heap._sizeMap}
  };
}

function outOfMemory(heap, size) {
  const before = snapshot(heap);
  assert.throws(() => heap.malloc(size), error => error === 'out of memory');
  assert.deepEqual(snapshot(heap), before, 'failed allocation must not reserve or remove memory');
}

function slotSize(size) {
  let result = 4;
  while (result < size) result *= 2;
  return result;
}

let nativeCache;
function loadMemoryNatives() {
  if (nativeCache) return nativeCache;
  const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
  const Long = require(path.join(runtime, 'src/gLong')).default;
  const nativeFilename = path.join(runtime, 'src/natives/sun_misc.js');
  const nativeModule = new Module(nativeFilename, module);
  nativeModule.filename = nativeFilename;
  nativeModule.paths = Module._nodeModulePaths(path.dirname(nativeFilename));
  nativeModule._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/natives/sun_misc.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS, esModuleInterop: false}
  }).outputText, nativeFilename);
  return nativeCache = {Long, natives: nativeModule.exports.default()};
}

function nativeWorld(size) {
  const heap = new Heap(size), errors = [];
  return {heap, errors, thread: {
    getJVM: () => ({getHeap: () => heap}),
    throwNewException(type, message) { errors.push({type, message}); }
  }};
}

test('all slots in an exact chunk remain usable after the unallocated region is exhausted', () => {
  const heap = new Heap(4096);
  const addresses = new Set();
  for (let i = 0; i < 1024; i++) {
    const address = heap.malloc(4);
    assert.ok(address >= 0 && address + 4 <= 4096);
    assert.equal(addresses.has(address), false);
    addresses.add(address);
  }
  assert.equal(heap._remaining, 0);
  outOfMemory(heap, 4);
  const freed = [...addresses][17];
  heap.free(freed);
  assert.equal(heap.malloc(4), freed, 'free must make its slot available without adding unallocated bytes');
  assert.equal(heap._remaining, 0);
});

for (const capacity of [4, 7, 16, 4095, 4096, 6000, 6001]) {
  test(`a ${capacity}-byte heap never fabricates slots outside its final chunk`, () => {
    const heap = new Heap(capacity);
    const addresses = new Set();
    for (let i = 0; i < Math.floor(capacity / 4); i++) {
      const address = heap.malloc(4);
      assert.ok(address >= 0 && address + 4 <= capacity, `out-of-bounds address ${address}`);
      assert.equal(addresses.has(address), false);
      addresses.add(address);
      heap.store_word(address, i);
      assert.equal(heap.get_word(address), i);
    }
    outOfMemory(heap, 4);
    assert.equal(heap._remaining, 0);
    assert.equal(heap._offset, capacity, 'a partial final chunk also reserves its unusable padding');
  });
}

for (const request of [0, 1, 4, 5, 4095, 4096, 4097, 9000]) {
  test(`size class rounding and reuse preserve the ${request}-byte allocation`, () => {
    const size = slotSize(request);
    const heap = new Heap(Math.max(4096, size));
    const address = heap.malloc(request);
    assert.ok(address + size <= heap._buffer.length);
    // Native Unsafe.reallocateMemory uses this existing chunk-to-class contract.
    assert.equal(2 ** heap._sizeMap[address & ~(4096 - 1)], size);
    heap.free(address);
    const reserved = snapshot(heap);
    assert.equal(heap.malloc(request), address);
    assert.equal(heap._offset, reserved.offset);
    assert.equal(heap._remaining, reserved.remaining);
  });
}

test('large and small classes use separate full or partial chunks', () => {
  const heap = new Heap(6001);
  const large = heap.malloc(4096);
  const small = heap.malloc(4);
  assert.equal(large, 0);
  assert.equal(small, 5996);
  assert.equal(heap._sizeMap[0], 12);
  assert.equal(heap._sizeMap[4096], 2);
  assert.equal(heap._remaining, 0);
  outOfMemory(heap, 8);
  heap.free(large);
  heap.free(small);
  assert.equal(heap.malloc(4096), large);
  assert.equal(heap.malloc(4), small);
});

test('rounded allocation failure leaves all state available for a later smaller allocation', () => {
  const heap = new Heap(12288);
  outOfMemory(heap, 9000); // The requested bytes fit, but its 16384-byte slot does not.
  const large = heap.malloc(4097);
  assert.equal(large, 0);
  outOfMemory(heap, 4097);
  const small = heap.malloc(4);
  assert.ok(small >= 8192 && small + 4 <= 12288);
  heap.free(large);
  assert.equal(heap.malloc(8192), large);
});

test('native Unsafe reallocation still finds chunk classes and preserves the allocation bytes', () => {
  const {Long, natives} = loadMemoryNatives();
  const unsafe = natives['sun/misc/Unsafe'];
  for (const [oldSize, newSize] of [[5, 17], [4096, 8192], [4097, 9]]) {
    const heap = new Heap(32768);
    const thread = {getJVM: () => ({getHeap: () => heap})};
    const old = unsafe['allocateMemory(J)J'](thread, {}, Long.fromNumber(oldSize));
    assert.notEqual(old.toNumber(), 0, 'the first native allocation must not reserve the null pointer');
    heap.get_buffer(old.toNumber(), slotSize(oldSize)).fill(0x7b);
    const replacement = unsafe['reallocateMemory(JJ)J'](thread, {}, old, Long.fromNumber(newSize));
    const copied = Math.min(slotSize(oldSize), newSize);
    assert.deepEqual(heap.get_buffer(replacement.toNumber(), copied), Buffer.alloc(copied, 0x7b));
    assert.equal(heap.malloc(oldSize), old.toNumber(), 'native reallocation must free the old size class');
  }
});

for (const owner of ['sun/misc/Unsafe', 'jdk/internal/misc/Unsafe']) {
  test(`${owner} zero allocation and null free never change allocator state`, () => {
    const {Long, natives} = loadMemoryNatives(), unsafe = natives[owner];
    const {heap, thread, errors} = nativeWorld(8192);
    let before = snapshot(heap);
    assert.equal(unsafe['allocateMemory(J)J'](thread, {}, Long.ZERO).toNumber(), 0);
    unsafe['freeMemory(J)V'](thread, {}, Long.ZERO);
    assert.deepEqual(snapshot(heap), before);
    const raw = heap.malloc(4096);
    assert.equal(raw, 0, 'raw Heap users retain their address-zero allocation contract');
    heap.store_word(raw, 123456789);
    before = snapshot(heap);
    unsafe['freeMemory(J)V'](thread, {}, Long.ZERO);
    assert.deepEqual(snapshot(heap), before, 'freeing null must not create a duplicate live zero slot');
    const address = unsafe['allocateMemory(J)J'](thread, {}, Long.fromNumber(4096)).toNumber();
    assert.ok(address > 0 && address + 4096 <= 8192);
    assert.equal(heap.get_word(raw), 123456789);
    assert.deepEqual(errors, []);
  });

  test(`${owner} positive allocations and reuse always return in-bounds non-null pointers`, () => {
    const {Long, natives} = loadMemoryNatives(), unsafe = natives[owner];
    for (const size of [1, 4, 8, 4096, 4097, 8192]) {
      const {heap, thread, errors} = nativeWorld(32768);
      const address = unsafe['allocateMemory(J)J'](thread, {}, Long.fromNumber(size));
      assert.ok(address.toNumber() > 0 && address.toNumber() + slotSize(size) <= 32768);
      assert.equal(2 ** heap._sizeMap[address.toNumber() & ~(4096 - 1)], slotSize(size));
      unsafe['freeMemory(J)V'](thread, {}, address);
      assert.equal(unsafe['allocateMemory(J)J'](thread, {}, Long.fromNumber(size)).toNumber(), address.toNumber());
      assert.deepEqual(errors, []);
    }
  });

  test(`${owner} failed native reservations preserve state and report guest errors`, () => {
    const {Long, natives} = loadMemoryNatives(), unsafe = natives[owner];
    for (const [capacity, size, type] of [
      [4096, 4096, 'Ljava/lang/OutOfMemoryError;'],
      [8192, 4097, 'Ljava/lang/OutOfMemoryError;'],
      [4, 4, 'Ljava/lang/OutOfMemoryError;'],
      [4096, -1, 'Ljava/lang/IllegalArgumentException;'],
      [4096, Number.MAX_SAFE_INTEGER + 1, 'Ljava/lang/OutOfMemoryError;']
    ]) {
      const {heap, thread, errors} = nativeWorld(capacity), before = snapshot(heap);
      let result;
      assert.doesNotThrow(() => { result = unsafe['allocateMemory(J)J'](thread, {}, Long.fromNumber(size)); });
      assert.equal(result, null);
      assert.deepEqual(errors.map(error => error.type), [type]);
      assert.deepEqual(snapshot(heap), before, 'prefix padding and rounded slots must be checked before mutation');
    }
  });
}

test('non-null heap mode leaves zero slots available to raw callers and fails atomically', () => {
  const heap = new Heap(8);
  assert.equal(heap.malloc(4, true), 4);
  const before = snapshot(heap);
  assert.throws(() => heap.malloc(4, true), error => error === 'out of memory');
  assert.deepEqual(snapshot(heap), before);
  assert.equal(heap.malloc(4), 0);
  heap.free(4);
  heap.free(0); // Place a legitimate raw zero slot above the reusable native slot.
  assert.equal(heap.malloc(4, true), 4);
  assert.equal(heap.malloc(4), 0);
});

test('Unsafe reallocation failures leave the old live allocation and bytes intact', () => {
  const {Long, natives} = loadMemoryNatives(), unsafe = natives['sun/misc/Unsafe'];
  const {heap, thread, errors} = nativeWorld(8192);
  const address = unsafe['allocateMemory(J)J'](thread, {}, Long.fromNumber(4096));
  assert.ok(address.toNumber() > 0);
  heap.get_buffer(address.toNumber(), 4096).fill(0x7b);
  const before = snapshot(heap);
  assert.equal(unsafe['reallocateMemory(JJ)J'](thread, {}, address, Long.fromNumber(8192)), null);
  assert.deepEqual(errors.map(error => error.type), ['Ljava/lang/OutOfMemoryError;']);
  assert.deepEqual(snapshot(heap), before);
  assert.deepEqual(heap.get_buffer(address.toNumber(), 4096), Buffer.alloc(4096, 0x7b));
  errors.length = 0;
  assert.equal(unsafe['reallocateMemory(JJ)J'](thread, {}, address, Long.ZERO).toNumber(), 0);
  assert.equal(unsafe['allocateMemory(J)J'](thread, {}, Long.fromNumber(4096)).toNumber(), address.toNumber());
  assert.deepEqual(errors, []);
});

test('mixed native and raw allocations keep distinct live regions and recover from failed reservations', () => {
  const heap = new Heap(32768 + 73), live = [];
  const sizes = [4, 8, 16, 1024, 4096, 4097];
  let seed = 0x18ab19, successes = 0, failures = 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  for (let i = 0; i < 1000; i++) {
    if (live.length && random() % 3 === 0) {
      heap.free(live.splice(random() % live.length, 1)[0].address);
      continue;
    }
    const size = sizes[random() % sizes.length], nonNull = (random() & 1) !== 0;
    const before = snapshot(heap);
    let address;
    try {
      address = heap.malloc(size, nonNull);
    } catch (error) {
      assert.equal(error, 'out of memory');
      assert.deepEqual(snapshot(heap), before);
      failures++;
      continue;
    }
    assert.ok(address >= (nonNull ? 1 : 0));
    assert.ok(address + slotSize(size) <= heap._buffer.length);
    assert.equal(2 ** heap._sizeMap[address & ~(4096 - 1)], slotSize(size));
    for (const other of live) {
      assert.ok(address + slotSize(size) <= other.address || other.address + other.size <= address);
    }
    live.push({address, size: slotSize(size)});
    successes++;
  }
  assert.ok(successes > 100 && failures > 100);
});

test('zero capacity fails atomically and invalid sizes are rejected before reservation', () => {
  outOfMemory(new Heap(0), 0);
  const heap = new Heap(4096);
  for (const size of [-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => new Heap(size), RangeError);
    const before = snapshot(heap);
    assert.throws(() => heap.malloc(size), RangeError);
    assert.deepEqual(snapshot(heap), before);
  }
  for (const size of [2 ** 30 + 1, 2 ** 31, 2 ** 32 + 1, Number.MAX_SAFE_INTEGER]) {
    outOfMemory(heap, size);
  }
});

test('size classification terminates beyond the signed 32-bit shift boundary', () => {
  // Keep a regressed infinite loop out of the test runner itself.
  const result = spawnSync(process.execPath, ['-e', `
    const Module = require('node:module');
    const compiled = require('node:fs').readFileSync(0, 'utf8');
    const loaded = new Module('heap.js');
    loaded._compile(compiled, 'heap.js');
    const Heap = loaded.exports.default;
    process.stdout.write(JSON.stringify([
      Heap.ilog2(2 ** 30 + 1), Heap.ilog2(2 ** 31),
      Heap.ilog2(2 ** 32 + 1), Heap.ilog2(Number.MAX_SAFE_INTEGER),
      new Heap(0).cl_to_size(31), new Heap(0).cl_to_size(33)
    ]));
  `], {input: compiled, encoding: 'utf8', timeout: 3000});
  assert.equal(result.error, undefined, 'classification must terminate without signed-shift overflow');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [31, 31, 33, 53, 2 ** 31, 2 ** 33]);
});

test('seeded allocate/free sequences preserve bounds, live data, chunk classes, and non-overlap', () => {
  const capacity = 64 * 1024 + 1337;
  const heap = new Heap(capacity);
  const live = [];
  const requests = [0, 1, 4, 5, 8, 15, 17, 63, 255, 1025, 4095, 4096, 4097, 9000];
  let seed = 0x4d6f6465;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  let allocations = 0, failures = 0, frees = 0;
  for (let i = 0; i < 5000; i++) {
    if (live.length > 0 && random() % 100 < 45) {
      const [freed] = live.splice(random() % live.length, 1);
      heap.free(freed.address);
      frees++;
      continue;
    }
    const request = requests[random() % requests.length];
    const before = snapshot(heap);
    let address;
    try {
      address = heap.malloc(request);
    } catch (error) {
      assert.equal(error, 'out of memory');
      assert.deepEqual(snapshot(heap), before);
      failures++;
      continue;
    }
    const size = slotSize(request);
    assert.ok(address >= 0 && address + size <= capacity);
    assert.equal(2 ** heap._sizeMap[address & ~(4096 - 1)], size);
    for (const other of live) {
      assert.ok(address + size <= other.address || other.address + other.size <= address,
        `live regions overlap: ${address}+${size} and ${other.address}+${other.size}`);
      assert.equal(heap.get_byte(other.address), other.value);
      assert.equal(heap.get_byte(other.address + other.size - 1), other.value);
    }
    const value = allocations++ & 255;
    heap.get_buffer(address, size).fill(value);
    live.push({address, size, value});
    assert.ok(heap._remaining >= 0);
    assert.equal(heap._remaining + heap._offset, capacity);
  }
  assert.ok(allocations > 100 && frees > 100 && failures > 100);
});
