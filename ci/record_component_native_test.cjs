'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const root = path.resolve(__dirname, '..');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.join(root, 'build/release-cli');
const {ReferenceClassData} = require(path.join(runtime, 'src/ClassData'));
const {RecordAttribute, Signature, RuntimeVisibleAnnotations, RuntimeVisibleTypeAnnotations} =
  require(path.join(runtime, 'src/attributes'));
const {ThreadStatus} = require(path.join(runtime, 'src/enums'));

function loadNative() {
  const filename = path.join(runtime, 'src/natives/java_lang.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  // Only the native implementation is under test here. Keep its Doppio imports
  // and the parsed metadata below in the same immutable compiled class universe.
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(require('typescript').transpileModule(
    fs.readFileSync(path.join(root, 'src/natives/java_lang.ts'), 'utf8'), {
      compilerOptions: {target: 1, module: 1, ignoreDeprecations: '6.0'}
    }).outputText, filename);
  return loaded.exports;
}

const getComponents = loadNative().default()['java/lang/Class'][
  'getRecordComponents()[Ljava/lang/reflect/RecordComponent;'];
const prefix = 'java/lang/reflect/RecordComponent/';
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };

const componentSpecs = [
  {name: 'items', descriptor: '[Ljava/util/List;', signature: '[Ljava/util/List<Ljava/lang/String;>;',
    paths: [[], [[0, 0]], [[0, 0], [3, 0]]], declaration: true},
  {name: 'owner', descriptor: 'Lsample/Outer$Inner;',
    signature: 'Lsample/Outer<Ljava/lang/String;>.Inner<+Ljava/lang/Number;>;',
    paths: [[], [[3, 0]], [[1, 0]], [[1, 0], [3, 0]], [[1, 0], [3, 0], [2, 0]]]},
  {name: 'plain', descriptor: 'I'},
  {name: 'empty', descriptor: 'Ljava/lang/String;', paths: []},
  {name: 'invisible', descriptor: 'Ljava/lang/String;', invisible: true}
];

// Deliberately synthetic, structurally parsed metadata isolates this native's
// transport contract. Genuine javac 21/25 and Java reflection execution are
// independently covered by the record-types corpus, not claimed by this seam.
function fixture({record = true, components = componentSpecs} = {}) {
  const entries = [], constants = new Map(), payloads = new Map();
  function utf(text) {
    if (!constants.has(text)) {
      const bytes = Buffer.from(text);
      entries.push(Buffer.concat([Buffer.from([1]), u2(bytes.length), bytes]));
      constants.set(text, entries.length);
    }
    return constants.get(text);
  }
  function classEntry(name) {
    const index = utf(name);
    entries.push(Buffer.concat([Buffer.from([7]), u2(index)]));
    return entries.length;
  }
  // Annotation CP indices deliberately cross 127, exercising Java signed-byte
  // transport as well as preservation of each nested type_path operand.
  for (let index = 0; index < 130; index++) utf('unused-' + index);
  const self = classEntry('sample/RecordNativeProbe');
  const parent = classEntry(record ? 'java/lang/Record' : 'java/lang/Object');
  const attribute = (name, bytes) => Buffer.concat([u2(utf(name)), u4(bytes.length), bytes]);
  const annotation = (descriptor, value) => Buffer.concat([
    u2(utf(descriptor)), u2(1), u2(utf('value')), Buffer.from([0x73]), u2(utf(value))
  ]);
  const members = [], methods = [];
  for (const spec of components) {
    const attrs = [], saved = {};
    if (spec.signature !== undefined) attrs.push(attribute('Signature', u2(utf(spec.signature))));
    if (spec.declaration) {
      saved.annotations = Buffer.concat([u2(1), annotation('Lsample/Tag;', spec.name)]);
      attrs.push(attribute('RuntimeVisibleAnnotations', saved.annotations));
    }
    if (spec.paths !== undefined) {
      saved.typeAnnotations = Buffer.concat([u2(spec.paths.length), ...spec.paths.map((steps, index) =>
        Buffer.concat([Buffer.from([0x13, steps.length, ...steps.flat()]),
          annotation('Lsample/Use;', spec.name + '-' + index)]))]);
      attrs.push(attribute('RuntimeVisibleTypeAnnotations', saved.typeAnnotations));
    }
    if (spec.invisible) attrs.push(attribute('RuntimeInvisibleTypeAnnotations', Buffer.concat([
      u2(1), Buffer.from([0x13, 0]), annotation('Lsample/Hidden;', spec.name)
    ])));
    payloads.set(spec.name, saved);
    members.push(Buffer.concat([u2(utf(spec.name)), u2(utf(spec.descriptor)), u2(attrs.length), ...attrs]));
    // A real parsed native declaration supplies exact accessor Method identity;
    // only its reflector callback below is replaced, not getMethod or metadata.
    methods.push(Buffer.concat([u2(0x0101), u2(utf(spec.name)), u2(utf('()' + spec.descriptor)), u2(0)]));
  }
  const attrs = record ? [attribute('Record', Buffer.concat([u2(members.length), ...members]))] : [];
  const bytes = Buffer.concat([u4(0xcafebabe), u2(0), u2(65), u2(entries.length + 1), ...entries,
    u2(0x0031), u2(self), u2(parent), u2(0), u2(0), u2(methods.length), ...methods,
    u2(attrs.length), ...attrs]);
  return {bytes, payloads};
}

function world(options) {
  const input = fixture(options), events = [], pending = [], returned = [], errors = [];
  const typeMirrors = new Map(), accessorMirrors = new Map();
  let thread;
  function ArrayObject(owner, length) { this.array = new Array(length).fill(null); }
  function StringObject() {}
  function ComponentObject(owner) {
    assert.ok(owner === thread);
    events.push('allocate-component');
  }
  const bootstrap = {
    initializeClass(owner, name, callback) {
      assert.ok(owner === thread);
      assert.equal(name, 'Ljava/lang/reflect/RecordComponent;');
      events.push('initialize-component-helper');
      pending.push(() => callback({getConstructor: () => ComponentObject}));
    },
    getInitializedClass(owner, descriptor) {
      assert.ok(owner === thread || owner === null);
      assert.ok(['[B', '[C', '[Ljava/lang/reflect/RecordComponent;'].includes(descriptor));
      return {getConstructor: () => ArrayObject};
    },
    getResolvedClass(name) {
      assert.equal(name, 'Ljava/lang/String;');
      return {getConstructor: () => StringObject};
    }
  };
  const loader = {
    getLoaderObject: () => loader,
    resolveClass(owner, descriptor, callback) {
      assert.ok(owner === thread);
      events.push('resolve-type:' + descriptor);
      if (!typeMirrors.has(descriptor)) typeMirrors.set(descriptor, {descriptor});
      pending.push(() => callback({getClassObject: caller => {
        assert.ok(caller === thread);
        return typeMirrors.get(descriptor);
      }}));
    }
  };
  const cls = new ReferenceClassData(input.bytes, null, loader), mirror = {$cls: cls};
  for (const component of cls.getRecordComponents()) {
    const method = cls.getMethod(component.name + '()' + component.descriptor);
    assert.ok(method && method.cls === cls);
    const reflected = {method};
    accessorMirrors.set(component.name, reflected);
    method.reflector = (owner, callback) => {
      assert.ok(owner === thread);
      events.push('reflect-accessor:' + component.name);
      pending.push(() => callback(reflected));
    };
  }
  // Record metadata transport must not initialize or allocate the record itself.
  cls.initialize = cls.tryToInitialize = cls.getConstructor = () => assert.fail('Record initialization is outside this native');
  thread = {
    getBsCl: () => bootstrap,
    setStatus(status) { events.push('status:' + status); },
    asyncReturn(value) { returned.push(value); },
    throwNewException(kind, message) { errors.push({kind, message}); },
    throwException(error) { errors.push(error); }
  };
  function drain() {
    let remaining = 30;
    while (pending.length) {
      assert.ok(remaining-- > 0, 'The bounded callback seam must terminate');
      pending.shift()();
    }
  }
  function invoke() {
    const count = returned.length;
    assert.equal(getComponents(thread, mirror), undefined);
    drain();
    assert.deepEqual(errors, []);
    assert.equal(returned.length, count + 1, 'Exactly one completion per invocation');
    return returned[count];
  }
  return {input, cls, mirror, thread, events, pending, returned, errors, typeMirrors, accessorMirrors, drain, invoke};
}

const bytesOf = value => Buffer.from(value.array.map(byte => byte & 0xff));
const stringOf = value => String.fromCharCode(...value['java/lang/String/value'].array);
const componentAt = (array, name) => array.array.find(value => stringOf(value[prefix + 'name']) === name);

test('native transports the complete parsed FIELD type-annotation table and all nested paths', () => {
  const w = world(), result = w.invoke();
  assert.ok(w.cls.getAttribute('Record') instanceof RecordAttribute);
  for (const name of ['items', 'owner']) {
    const parsed = w.cls.getRecordComponents().find(component => component.name === name);
    const attr = parsed.attrs.find(value => value.getName() === 'RuntimeVisibleTypeAnnotations');
    assert.ok(attr instanceof RuntimeVisibleTypeAnnotations);
    assert.deepEqual(attr.rawBytes, w.input.payloads.get(name).typeAnnotations);
    assert.notDeepEqual(attr.rawBytes, attr.topLevelAnnotationBytes(), 'The control must distinguish raw and flattened formats');
    const transported = componentAt(result, name)[prefix + 'typeAnnotations'];
    assert.deepEqual(bytesOf(transported), attr.rawBytes, 'Preserve target_type, every type_path and annotation CP operand');
    assert.ok(transported.array.some(value => value < 0), 'Java byte[] contains signed byte values');
    assert.ok(transported.array.every(value => Number.isInteger(value) && value >= -128 && value <= 127));
  }
});

test('native preserves raw signature, declaration annotations, exact accessor and declaring record', () => {
  const w = world(), result = w.invoke();
  assert.equal(result.array.length, componentSpecs.length);
  for (let index = 0; index < componentSpecs.length; index++) {
    const spec = componentSpecs[index], value = result.array[index];
    assert.equal(stringOf(value[prefix + 'name']), spec.name, 'Preserve declaration order');
    assert.ok(value[prefix + 'declaringRecord'] === w.mirror);
    assert.ok(value[prefix + 'type'] === w.typeMirrors.get(spec.descriptor));
    assert.ok(value[prefix + 'accessor'] === w.accessorMirrors.get(spec.name));
    if (spec.signature === undefined) assert.equal(value[prefix + 'signature'], null);
    else {
      const parsed = w.cls.getRecordComponents()[index].attrs.find(attr => attr.getName() === 'Signature');
      assert.ok(parsed instanceof Signature);
      assert.equal(stringOf(value[prefix + 'signature']), spec.signature);
      assert.equal(parsed.sig, spec.signature);
    }
  }
  const annotation = w.cls.getRecordComponents()[0].attrs.find(attr => attr.getName() === 'RuntimeVisibleAnnotations');
  assert.ok(annotation instanceof RuntimeVisibleAnnotations);
  assert.deepEqual(bytesOf(result.array[0][prefix + 'annotations']), annotation.rawBytes);
});

test('missing and invisible-only annotations are null, but present empty tables remain byte arrays', () => {
  const w = world(), result = w.invoke();
  for (const name of ['plain', 'invisible']) {
    const value = componentAt(result, name);
    assert.equal(value[prefix + 'signature'], null);
    assert.equal(value[prefix + 'annotations'], null);
    assert.equal(value[prefix + 'typeAnnotations'], null);
  }
  assert.deepEqual(bytesOf(componentAt(result, 'empty')[prefix + 'typeAnnotations']), Buffer.from([0, 0]));
});

test('each invocation returns fresh component and byte arrays without mutating parsed metadata', () => {
  const w = world(), original = Buffer.from(w.input.bytes), first = w.invoke(), second = w.invoke();
  assert.ok(first !== second && first.array !== second.array);
  for (let index = 0; index < first.array.length; index++) {
    assert.ok(first.array[index] !== second.array[index]);
    for (const field of ['annotations', 'typeAnnotations']) {
      const left = first.array[index][prefix + field], right = second.array[index][prefix + field];
      if (left === null) continue;
      assert.ok(left !== right && left.array !== right.array);
      assert.deepEqual(left.array, right.array);
    }
  }
  first.array[0][prefix + 'typeAnnotations'].array.fill(0);
  first.array[0][prefix + 'annotations'].array.fill(0);
  first.array[0] = null;
  assert.deepEqual(bytesOf(second.array[0][prefix + 'typeAnnotations']), w.input.payloads.get('items').typeAnnotations);
  assert.deepEqual(bytesOf(second.array[0][prefix + 'annotations']), w.input.payloads.get('items').annotations);
  assert.deepEqual(w.input.bytes, original, 'Native copies must not alias the class file');
});

test('native completion waits for helper initialization, component type and exact accessor callbacks', () => {
  const w = world();
  assert.equal(getComponents(w.thread, w.mirror), undefined);
  assert.deepEqual(w.events, ['status:' + ThreadStatus.ASYNC_WAITING, 'initialize-component-helper']);
  assert.deepEqual(w.returned, []);
  w.pending.shift()();
  assert.equal(w.events.at(-1), 'resolve-type:[Ljava/util/List;');
  assert.deepEqual(w.returned, []);
  w.pending.shift()();
  assert.equal(w.events.at(-1), 'reflect-accessor:items');
  assert.equal(w.events.includes('allocate-component'), false);
  assert.deepEqual(w.returned, []);
  w.pending.shift()();
  assert.equal(w.events.filter(event => event === 'allocate-component').length, 1);
  assert.deepEqual(w.returned, []);
  w.drain();
  assert.equal(w.returned.length, 1);
  assert.equal(w.events.filter(event => event.startsWith('reflect-accessor:')).length, componentSpecs.length);
  assert.deepEqual(w.errors, []);
});

test('empty records return independent empty arrays without component type resolution', () => {
  const w = world({components: []}), first = w.invoke(), second = w.invoke();
  assert.deepEqual(first.array, []);
  assert.deepEqual(second.array, []);
  assert.ok(first !== second && first.array !== second.array);
  assert.equal(w.events.some(event => event.startsWith('resolve-type:')), false);
});

test('ordinary parsed classes return null before any asynchronous reflection work', () => {
  const w = world({record: false});
  assert.equal(w.cls.isRecord(), false);
  assert.equal(getComponents(w.thread, w.mirror), null);
  assert.deepEqual(w.events, []);
  assert.deepEqual(w.pending, []);
  assert.deepEqual(w.returned, []);
});
