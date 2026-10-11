'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const {test} = require('node:test');
const runtimeRoot = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const ByteStream = require(path.join(runtimeRoot, 'src/ByteStream')).default;
const {ConstantPool} = require(path.join(runtimeRoot, 'src/ConstantPool'));
const {makeAttributes, Code, StackMapTable} = require(path.join(runtimeRoot, 'src/attributes'));
const {ClassLoader} = require(path.join(runtimeRoot, 'src/ClassLoader'));

const u2 = (value) => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = (value) => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };

function fixture() {
  const items = [];
  const utf8 = (text) => {
    const bytes = Buffer.from(text);
    items.push(Buffer.concat([Buffer.from([1]), u2(bytes.length), bytes]));
    return items.length;
  };
  const names = Object.create(null);
  for (const text of ['Code', 'StackMapTable', 'SourceFile', 'Probe.java', 'Synthetic', 'Deprecated',
    'vendor.Opaque', 'toString', '__proto__', 'constructor', 'Probe', 'RuntimeVisibleAnnotations',
    'Ljava/lang/invoke/LambdaForm$Hidden;', 'element', 'Signature', 'Exceptions', 'InnerClasses',
    'EnclosingMethod', 'BootstrapMethods', 'NestHost', 'NestMembers', 'PermittedSubclasses', 'Record',
    'MethodParameters', 'LineNumberTable', 'LocalVariableTable', 'LocalVariableTypeTable', 'ConstantValue',
    'RuntimeVisibleTypeAnnotations', 'RuntimeVisibleParameterAnnotations', 'AnnotationDefault',
    'RuntimeInvisibleAnnotations', 'RuntimeInvisibleTypeAnnotations', 'RuntimeInvisibleParameterAnnotations',
    'java/lang/Object', 'probe', '()V', 'I', 'V', '[LProbe;', 'bad.name']) {
    names[text] = utf8(text);
  }
  items.push(Buffer.concat([Buffer.from([7]), u2(names.Probe)]));
  const classIndex = items.length;
  items.push(Buffer.concat([Buffer.from([7]), u2(names['java/lang/Object'])]));
  const objectClassIndex = items.length;
  const poolBytes = Buffer.concat([u2(items.length + 1), ...items]);
  const pool = new ConstantPool();
  // ConstantPool.parse historically seeks back from its deferred class entry;
  // the trailing sentinel keeps this helper usable before EOF seek is fixed.
  pool.parse(new ByteStream(Buffer.concat([poolBytes, Buffer.from([0])])));
  const attribute = (name, payload = Buffer.alloc(0), declaredLength = payload.length) =>
    Buffer.concat([u2(names[name]), u4(declaredLength), payload]);
  const table = (...attrs) => new ByteStream(Buffer.concat([u2(attrs.length), ...attrs]));
  const parse = (context, ...attrs) => makeAttributes(table(...attrs), pool, context);
  return {pool, poolBytes, names, classIndex, objectClassIndex, attribute, table, parse};
}

function codePayload({code = Buffer.from([0xb1]), declaredLength = code.length, handlers = [], attrs = []} = {}) {
  return Buffer.concat([u2(1), u2(2), u4(declaredLength), code, u2(handlers.length),
    ...handlers.map((entry) => Buffer.concat(entry.map(u2))), u2(attrs.length), ...attrs]);
}

test('ByteStream rejects every truncated numeric read without advancing the cursor', () => {
  for (const [method, width] of [['getUint8', 1], ['getInt8', 1], ['getUint16', 2], ['getInt16', 2],
    ['getUint32', 4], ['getInt32', 4], ['getFloat', 4], ['getDouble', 8], ['getInt64', 8]]) {
    for (let size = 0; size < width; size++) {
      const bytes = new ByteStream(Buffer.alloc(size));
      assert.throws(() => bytes[method](), Error, `${method} with ${size} bytes`);
      assert.equal(bytes.pos(), 0, `${method} failure must be atomic`);
    }
  }
});

test('ByteStream validates integer sizes and indices, including empty and EOF operations', () => {
  for (const method of ['read', 'slice', 'skip', 'seek']) {
    for (const size of [-1, 0.5, NaN, Infinity, undefined, '1', 4]) {
      const bytes = new ByteStream(Buffer.alloc(3));
      assert.throws(() => bytes[method](size), Error, `${method}(${String(size)})`);
      assert.equal(bytes.pos(), 0);
    }
  }
  const bytes = new ByteStream(Buffer.from([7]));
  assert.equal(bytes.peek(), 7);
  assert.equal(bytes.pos(), 0);
  bytes.seek(1);
  assert.equal(bytes.size(), 0);
  assert.equal(bytes.hasBytes(), false);
  assert.throws(() => bytes.peek(), Error);
  assert.equal(bytes.read(0).length, 0);
  assert.equal(bytes.slice(0).size(), 0);
  bytes.skip(0);
  bytes.rewind();
  assert.equal(bytes.getUint8(), 7);
  new ByteStream(Buffer.alloc(0)).seek(0);
});

test('bounded attribute payloads cannot read a sibling or silently discard extra bytes', () => {
  const {names, attribute, table, pool, parse} = fixture();
  assert.equal(parse('class', attribute('SourceFile', u2(names['Probe.java'])))[0].filename, 'Probe.java');
  assert.throws(() => parse('class', attribute('SourceFile', Buffer.from([0]))), Error);
  assert.throws(() => parse('class', attribute('SourceFile', Buffer.concat([u2(names['Probe.java']), Buffer.from([0])]))), Error);
  const sibling = attribute('SourceFile', u2(names['Probe.java']));
  const bytes = table(attribute('SourceFile', Buffer.alloc(0)), sibling);
  assert.throws(() => makeAttributes(bytes, pool, 'class'), Error);
  assert.equal(bytes.pos(), 8, 'the following attribute remains unread');
  for (const name of ['Synthetic', 'Deprecated']) {
    assert.equal(parse('class', attribute(name)).length, 1);
    assert.throws(() => parse('class', attribute(name, Buffer.from([0]))), Error);
  }
});

test('unknown and misplaced attributes are skipped safely, including Object prototype names', () => {
  const {names, attribute, parse} = fixture();
  for (const name of ['vendor.Opaque', 'toString', '__proto__', 'constructor', 'Code', 'StackMapTable']) {
    const attrs = parse('class', attribute(name, Buffer.from([255])), attribute('SourceFile', u2(names['Probe.java'])));
    assert.equal(attrs.length, 1, name);
    assert.equal(attrs[0].getName(), 'SourceFile');
    assert.throws(() => parse('class', attribute(name, Buffer.alloc(0), 100)), Error);
  }
});

test('attribute names and source/signature references must designate UTF8 entries', () => {
  const {classIndex, pool, attribute, parse} = fixture();
  assert.throws(() => makeAttributes(new ByteStream(Buffer.concat([u2(1), u2(classIndex), u4(0)])), pool, 'class'), Error);
  for (const name of ['SourceFile', 'Signature']) {
    assert.throws(() => parse('class', attribute(name, u2(classIndex))), Error);
  }
});

test('structured metadata references require their specified constant-pool kinds', () => {
  const {classIndex, names, attribute, parse} = fixture();
  const cases = [
    ['method', 'Exceptions', [1, names.Probe]],
    ['class', 'InnerClasses', [1, names.Probe, 0, 0, 0]],
    ['class', 'InnerClasses', [1, classIndex, names.Probe, 0, 0]],
    ['class', 'InnerClasses', [1, classIndex, 0, classIndex, 0]],
    ['class', 'EnclosingMethod', [names.Probe, 0]],
    ['class', 'EnclosingMethod', [classIndex, classIndex]],
    ['class', 'NestHost', [names.Probe]],
    ['class', 'NestMembers', [1, names.Probe]],
    ['class', 'PermittedSubclasses', [1, names.Probe]],
    ['class', 'BootstrapMethods', [1, classIndex, 0]],
    ['class', 'Record', [1, classIndex, names.Probe, 0]],
    ['field', 'ConstantValue', [classIndex]],
    ['code', 'LocalVariableTable', [1, 0, 1, classIndex, names.Probe, 0]],
    ['code', 'LocalVariableTypeTable', [1, 0, 1, names.Probe, classIndex, 0]]
  ];
  for (const [context, name, values] of cases) {
    assert.throws(() => parse(context, attribute(name, Buffer.concat(values.map(u2)))), Error, name);
  }
  assert.throws(() => parse('method', attribute('MethodParameters', Buffer.concat([Buffer.from([1]), u2(classIndex), u2(0)]))), Error);
});

test('instance ConstantValue attributes are ignored while their envelopes remain bounded', () => {
  const {pool, names, classIndex, attribute, table} = fixture();
  for (const payload of [Buffer.alloc(0), u2(classIndex), u2(65535), Buffer.from([255, 0, 1])]) {
    const attrs = [attribute('ConstantValue', payload), attribute('ConstantValue', payload)];
    assert.deepEqual(makeAttributes(table(...attrs), pool, 'field', 65, false), []);
    assert.throws(() => makeAttributes(table(...attrs), pool, 'field', 65, true), Error);
  }
  assert.throws(() => makeAttributes(table(attribute('ConstantValue', Buffer.alloc(0), 2)), pool, 'field', 65, false), Error);
  assert.equal(makeAttributes(table(attribute('Signature', u2(names.Probe))), pool, 'field', 65, false).length, 1);
});

test('the compiled class loader ignores non-static ConstantValue contents and duplicates', () => {
  const {poolBytes, names, classIndex, objectClassIndex, attribute} = fixture();
  for (const major of [65, 69]) {
    for (const isStatic of [false, true]) {
      for (const payload of [Buffer.alloc(0), u2(classIndex), u2(65535), Buffer.from([255, 0, 1])]) {
        const attrs = [attribute('ConstantValue', payload), attribute('ConstantValue', payload)];
        const bytes = Buffer.concat([u4(0xcafebabe), u2(0), u2(major), poolBytes,
          u2(0x21), u2(classIndex), u2(objectClassIndex), u2(0), u2(1),
          u2(isStatic ? 0x9 : 0x1), u2(names.element), u2(names.I), u2(attrs.length), ...attrs,
          u2(0), u2(0)]);
        const errors = [];
        const loader = new ClassLoader(null);
        const cls = loader.defineClass({throwNewException(type, message) { errors.push({type, message}); }}, 'LProbe;', bytes, null);
        if (isStatic) {
          assert.equal(cls, null);
          assert.equal(errors[0].type, 'Ljava/lang/ClassFormatError;');
        } else {
          assert.deepEqual(errors, []);
          assert.ok(cls);
        }
      }
    }
  }
});

test('future attribute names stay opaque in older class-file versions', () => {
  const {pool, attribute, table} = fixture();
  for (const [name, context, version] of [
    ['Signature', 'class', 49], ['LocalVariableTypeTable', 'code', 49],
    ['StackMapTable', 'code', 50], ['BootstrapMethods', 'class', 51],
    ['MethodParameters', 'method', 52], ['NestHost', 'class', 55],
    ['NestMembers', 'class', 55], ['Record', 'class', 60], ['PermittedSubclasses', 'class', 61]
  ]) {
    assert.deepEqual(makeAttributes(table(attribute(name, Buffer.from([255]))), pool, context, version - 1), [], name);
    assert.throws(() => makeAttributes(table(attribute(name, Buffer.from([255]))), pool, context, version), Error, name);
  }
});

test('Record components require unqualified names and field descriptors', () => {
  const {names, attribute, parse} = fixture();
  for (const descriptor of ['I', '[LProbe;']) {
    const record = parse('class', attribute('Record', Buffer.concat([u2(1), u2(names.element), u2(names[descriptor]), u2(0)])))[0];
    assert.equal(record.components[0].name, 'element');
    assert.equal(record.components[0].descriptor, descriptor);
  }
  for (const [name, descriptor] of [['bad.name', 'I'], ['element', 'V'], ['element', '()V']]) {
    assert.throws(() => parse('class', attribute('Record', Buffer.concat([u2(1), u2(names[name]), u2(names[descriptor]), u2(0)]))), Error);
  }
});

test('invisible annotations retain opaque data and enforce declaration singleton rules', () => {
  const {pool, attribute, table, parse} = fixture();
  for (const [name, contexts, version] of [
    ['RuntimeInvisibleAnnotations', ['class', 'field', 'method', 'record'], 49],
    ['RuntimeInvisibleTypeAnnotations', ['class', 'field', 'method', 'record'], 52],
    ['RuntimeInvisibleParameterAnnotations', ['method'], 49]
  ]) {
    const payload = Buffer.from([0]);
    for (const context of contexts) {
      const attrs = parse(context, attribute(name, payload));
      assert.equal(attrs.length, 1);
      assert.equal(attrs[0].getName(), name);
      assert.deepEqual(attrs[0].rawBytes, payload);
      assert.throws(() => parse(context, attribute(name, payload), attribute(name, payload)), Error);
      assert.deepEqual(makeAttributes(table(attribute(name, payload)), pool, context, version - 1), []);
    }
  }
  assert.deepEqual(parse('class', attribute('RuntimeInvisibleParameterAnnotations', Buffer.from([0]))), []);
  assert.deepEqual(parse('code', attribute('RuntimeInvisibleAnnotations', Buffer.from([0]))), []);
});

test('Code-level type annotations remain opaque even when repeated, matching native loading', () => {
  const {attribute, parse} = fixture();
  for (const name of ['RuntimeVisibleTypeAnnotations', 'RuntimeInvisibleTypeAnnotations']) {
    const attrs = parse('code', attribute(name, Buffer.from([0])), attribute(name, Buffer.from([255])));
    assert.equal(attrs.length, 2);
    assert.deepEqual(attrs[0].rawBytes, Buffer.from([0]));
    assert.deepEqual(attrs[1].rawBytes, Buffer.from([255]));
  }
});

test('Code length is bounded to 1..65535 and reads exactly its declared body', () => {
  const {pool} = fixture();
  for (const length of [1, 65535]) {
    const value = Code.parse(new ByteStream(codePayload({code: Buffer.alloc(length, 0xb1)})), pool);
    assert.equal(value.getCode().length, length);
    assert.equal(value.getMaxLocals(), 2);
  }
  for (const length of [0, 65536]) {
    assert.throws(() => Code.parse(new ByteStream(codePayload({code: Buffer.alloc(length)})), pool), Error);
  }
  assert.throws(() => Code.parse(new ByteStream(codePayload({declaredLength: 100})), pool), Error);
});

test('Code exception ranges and catch indices are structural format constraints', () => {
  const {pool, names, classIndex} = fixture();
  for (const catchType of [0, classIndex]) {
    const value = Code.parse(new ByteStream(codePayload({handlers: [[0, 1, 0, catchType]]})), pool);
    assert.equal(value.exceptionHandlers.length, 1);
  }
  for (const handler of [[0, 0, 0, 0], [1, 0, 0, 0], [0, 2, 0, 0], [0, 1, 1, 0], [0, 1, 0, names.Probe]]) {
    assert.throws(() => Code.parse(new ByteStream(codePayload({handlers: [handler]})), pool), Error, handler.join(','));
  }
});

test('StackMapTable rejects reserved frame tags and unknown verification tags', () => {
  const {pool} = fixture();
  for (let frameType = 128; frameType < 247; frameType++) {
    assert.throws(() => StackMapTable.parse(new ByteStream(Buffer.from([0, 1, frameType])), pool), Error);
  }
  for (const tag of [9, 128, 255]) {
    assert.throws(() => StackMapTable.parse(new ByteStream(Buffer.from([0, 1, 64, tag])), pool), Error);
  }
});

test('all defined StackMapTable frame families and verification types remain parseable', () => {
  const {pool, classIndex, names} = fixture();
  const frames = [Buffer.from([0]), Buffer.from([63])];
  for (let tag = 0; tag <= 8; tag++) {
    frames.push(Buffer.concat([Buffer.from([64, tag]), tag === 7 ? u2(classIndex) : tag === 8 ? u2(0) : Buffer.alloc(0)]));
  }
  frames.push(Buffer.from([247, 0, 0, 1]));
  for (let frameType = 248; frameType <= 251; frameType++) frames.push(Buffer.from([frameType, 0, 0]));
  for (let frameType = 252; frameType <= 254; frameType++) frames.push(Buffer.concat([Buffer.from([frameType, 0, 0]), Buffer.alloc(frameType - 251, 1)]));
  frames.push(Buffer.from([255, 0, 0, 0, 1, 1, 0, 1, 1]));
  const result = StackMapTable.parse(new ByteStream(Buffer.concat([u2(frames.length), ...frames])), pool);
  assert.equal(result.getEntries().length, frames.length);
  assert.deepEqual(result.getEntries()[9].stackTypes, [{tag: 7, className: 'LProbe;', cpIndex: classIndex}]);
  assert.deepEqual(result.getEntries()[10].stackTypes, [{tag: 8, newOffset: 0}]);
  assert.deepEqual(result.getEntries().at(-1).localsTypes, [{tag: 1}]);
  assert.deepEqual(result.getEntries().at(-1).stackTypes, [{tag: 1}]);
  assert.throws(() => StackMapTable.parse(new ByteStream(Buffer.concat([u2(1), Buffer.from([64, 7]), u2(names.Probe)])), pool), /class/i);
});

test('singleton attributes reject duplicates while split debug tables and marker attributes remain allowed', () => {
  const {names, classIndex, attribute, parse} = fixture();
  assert.throws(() => parse('class', attribute('SourceFile', u2(names['Probe.java'])), attribute('SourceFile', u2(names['Probe.java']))), Error);
  assert.throws(() => parse('code', attribute('StackMapTable', u2(0)), attribute('StackMapTable', u2(0))), Error);
  assert.throws(() => parse('class', attribute('NestHost', u2(classIndex)), attribute('NestMembers', u2(0))), Error);
  assert.throws(() => parse('class', attribute('NestMembers', u2(0)), attribute('NestHost', u2(classIndex))), Error);
  for (const name of ['LineNumberTable', 'LocalVariableTable', 'LocalVariableTypeTable']) {
    assert.equal(parse('code', attribute(name, u2(0)), attribute(name, u2(0))).length, 2);
  }
  for (const name of ['Synthetic', 'Deprecated']) {
    assert.equal(parse('class', attribute(name), attribute(name)).length, 2);
  }
});

test('annotation marker scanning stays within opaque bytes and does not reject deferred Java metadata', () => {
  const {names, attribute, parse} = fixture();
  for (const payload of [Buffer.alloc(0), Buffer.from([0]), Buffer.from([0, 0, 255]),
    Buffer.concat([u2(1), u2(names['Ljava/lang/invoke/LambdaForm$Hidden;']), u2(1), u2(names.element), Buffer.from([255])])]) {
    const attrs = parse('class', attribute('RuntimeVisibleAnnotations', payload), attribute('SourceFile', u2(names['Probe.java'])));
    assert.deepEqual(attrs[0].rawBytes, payload);
    assert.equal(attrs[1].filename, 'Probe.java');
  }
  const hidden = parse('method', attribute('RuntimeVisibleAnnotations', Buffer.concat([u2(1), u2(names['Ljava/lang/invoke/LambdaForm$Hidden;']), u2(0)])))[0];
  assert.equal(hidden.isHidden, true);
  for (const [context, name] of [['method', 'AnnotationDefault'], ['method', 'RuntimeVisibleParameterAnnotations'],
    ['code', 'RuntimeVisibleTypeAnnotations']]) {
    const payload = Buffer.from([255]);
    assert.deepEqual(parse(context, attribute(name, payload))[0].rawBytes, payload);
  }
});

test('the compiled class loader preserves opaque annotation payloads without rejecting definition', () => {
  const {poolBytes, names, classIndex, objectClassIndex, attribute} = fixture();
  const payloads = [Buffer.alloc(0), Buffer.from([0]), Buffer.from([0, 0, 255]),
    Buffer.concat([u2(1), u2(names['Ljava/lang/invoke/LambdaForm$Hidden;']), u2(1), u2(names.element), Buffer.from([255])])];
  for (const major of [65, 69]) {
    for (const [context, name] of [['class', 'RuntimeVisibleAnnotations'], ['class', 'RuntimeVisibleTypeAnnotations'],
      ['method', 'RuntimeVisibleParameterAnnotations'], ['method', 'AnnotationDefault']]) {
      for (const payload of payloads) {
        const methodAttrs = [attribute('Code', codePayload())];
        const classAttrs = [attribute('SourceFile', u2(names['Probe.java']))];
        (context === 'class' ? classAttrs : methodAttrs).push(attribute(name, payload));
        const bytes = Buffer.concat([u4(0xcafebabe), u2(0), u2(major), poolBytes,
          u2(0x21), u2(classIndex), u2(objectClassIndex), u2(0), u2(0), u2(1),
          u2(0x9), u2(names.probe), u2(names['()V']), u2(methodAttrs.length), ...methodAttrs,
          u2(classAttrs.length), ...classAttrs]);
        const errors = [];
        const loader = new ClassLoader(null);
        const cls = loader.defineClass({throwNewException(type, message) { errors.push({type, message}); }}, 'LProbe;', bytes, null);
        assert.deepEqual(errors, [], `${major} ${name}: ${payload.toString('hex')}`);
        assert.ok(cls);
        assert.equal(cls.getAttribute('SourceFile').filename, 'Probe.java');
      }
    }
  }
});
