'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const {test} = require('node:test');
const runtimeRoot = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const {ReferenceClassData} = require(path.join(runtimeRoot, 'src/ClassData'));
const {ConstantPool, ConstUTF8} = require(path.join(runtimeRoot, 'src/ConstantPool'));
const ByteStream = require(path.join(runtimeRoot, 'src/ByteStream')).default;

const u2 = (v) => { const b = Buffer.alloc(2); b.writeUInt16BE(v); return b; };
const u4 = (v) => { const b = Buffer.alloc(4); b.writeUInt32BE(v); return b; };

function classFile(options = {}) {
  const pool = [];
  const add = (tag, bytes) => { pool.push(Buffer.concat([Buffer.from([tag]), bytes])); return pool.length; };
  const utf8 = (text) => { const b = Buffer.from(text); return add(1, Buffer.concat([u2(b.length), b])); };
  const cls = (text) => add(7, u2(utf8(text)));
  const thisClass = cls(options.name || 'Probe');
  const superClass = options.super === null ? 0 : cls(options.super || 'java/lang/Object');
  const interfaces = (options.interfaces || []).map(cls);
  const fields = (options.fields || []).map((f) => Buffer.concat([
    u2(f.flags === undefined ? 1 : f.flags), u2(utf8(f.name || 'value')),
    u2(utf8(f.descriptor === undefined ? 'I' : f.descriptor)), u2(0)
  ]));
  const methods = (options.methods || []).map((m) => {
    const flags = m.flags === undefined ? 9 : m.flags;
    const name = utf8(m.name || 'method');
    const descriptor = utf8(m.descriptor === undefined ? '()V' : m.descriptor);
    const attrs = [];
    if (m.code === true || m.code !== false && !(flags & 0x0500)) {
      const code = Buffer.concat([u2(1), u2(m.locals === undefined ? 1 : m.locals), u4(1), Buffer.from([0xb1]), u2(0), u2(0)]);
      attrs.push(Buffer.concat([u2(utf8('Code')), u4(code.length), code]));
    }
    return Buffer.concat([u2(flags), u2(name), u2(descriptor), u2(attrs.length), ...attrs]);
  });
  if (options.extraPool) options.extraPool({add, utf8, cls});
  return Buffer.concat([u4(0xcafebabe), u2(0), u2(options.major || 65), u2(pool.length + 1), ...pool,
    u2(options.flags === undefined ? 0x21 : options.flags), u2(options.badThis ? 1 : thisClass), u2(superClass),
    u2(interfaces.length), ...interfaces.map(u2), u2(fields.length), ...fields,
    u2(methods.length), ...methods, u2(0)]);
}
const parse = (options) => new ReferenceClassData(classFile(options));

test('class header references, names, flags and duplicate interfaces are validated', () => {
  parse();
  parse({name: 'java/lang/Object', super: null});
  parse({name: 'int'}); // JVM binary names are not Java source identifiers.
  parse({name: 'toString'});
  parse({flags: 0x0041}); // Reserved class bits are ignored.
});

test('invalid class identities and flag combinations are rejected', () => {
  for (const options of [
    {badThis: true}, {super: null}, {name: '[I'}, {name: 'bad.name'}, {name: 'bad//Name'},
    {name: 'java/lang/Object'}, {super: '[I'}, {flags: 0x0411}, {flags: 0x0201},
    {flags: 0x0621}, {flags: 0x2001}, {interfaces: ['Face', 'Face']}, {interfaces: ['[I']},
    {flags: 0x0601, super: 'Other'}
  ]) assert.throws(() => parse(options), Error, JSON.stringify(options));
});

test('field descriptors, member names and field flags enforce format constraints', () => {
  for (const descriptor of ['', 'V', 'QThing;', 'II', '[V', 'L;', 'Lbad.name;', 'Lbad//Name;', '['.repeat(256) + 'I']) {
    assert.throws(() => parse({fields: [{descriptor}]}), Error, descriptor);
  }
  for (const name of ['bad.name', 'bad/name', '[name', 'name;']) {
    assert.throws(() => parse({fields: [{name}]}), Error, name);
  }
  for (const flags of [3, 5, 6, 0x51]) assert.throws(() => parse({fields: [{flags}]}), Error);
  parse({fields: [{name: '<allowed>', descriptor: '[[Ljava/lang/Object;'}]});
  parse({flags: 0x0601, fields: [{flags: 0x19}]});
  assert.throws(() => parse({flags: 0x0601, fields: [{flags: 1}]}), Error);
});

test('duplicate name-and-descriptor pairs are rejected without rejecting overloads', () => {
  assert.throws(() => parse({fields: [{}, {}]}), Error);
  assert.throws(() => parse({methods: [{}, {}]}), Error);
  parse({fields: [{descriptor: 'I'}, {descriptor: 'J'}]});
  parse({methods: [{descriptor: '()V'}, {descriptor: '(I)V'}]});
});

test('method descriptors and initializer names are checked before runtime specialization', () => {
  for (const descriptor of ['', 'V', '()VV', '(V)V', '(I)', '(L;)V', '([V)V', '()Lbad.name;', '(' + 'I'.repeat(256) + ')V']) {
    assert.throws(() => parse({methods: [{descriptor}]}), Error, descriptor);
  }
  for (const name of ['bad<name', 'bad>name', '<unknown>']) assert.throws(() => parse({methods: [{name}]}), Error);
  for (const method of [
    {name: '<init>', flags: 9}, {name: '<init>', flags: 1, descriptor: '()I'},
    {name: '<clinit>', flags: 0}, {name: '<clinit>', descriptor: '(I)V'},
    {flags: 3}, {flags: 0x0409}, {flags: 0x0402}, {flags: 0x0411},
    {flags: 1, descriptor: '(' + 'I'.repeat(255) + ')V', locals: 256}
  ]) assert.throws(() => parse({methods: [method]}), Error, JSON.stringify(method));
  parse({methods: [{flags: 0x0401}], flags: 0x0401});
  parse({methods: [{flags: 0x0c01}], flags: 0x0401}); // 0x0800 is reserved after major 60.
  parse({methods: [{name: '<clinit>', flags: 0x0dff, code: true}]}); // Initializer ignores unrelated bits.
  assert.throws(() => parse({major: 60, methods: [{flags: 0x0c01}], flags: 0x0401}), Error);
});

test('method Code presence and parameter local slots are checked', () => {
  for (const method of [
    {code: false}, {flags: 0x0109, code: true}, {flags: 0x0401, code: true},
    {flags: 1, locals: 0}, {descriptor: '(J)V', locals: 1}
  ]) assert.throws(() => parse({methods: [method]}), Error, JSON.stringify(method));
  parse({methods: [{descriptor: '(J)V', locals: 2}]});
  parse({methods: [{flags: 0x0109, code: false}]});
});

test('interface method constraints preserve modern private and static bodies', () => {
  for (const flags of [1, 2, 9, 10, 0x0401]) parse({flags: 0x0601, methods: [{flags}]});
  for (const flags of [0, 4, 0x11, 0x21, 0x0101, 0x0402]) {
    assert.throws(() => parse({flags: 0x0601, methods: [{flags}]}), Error);
  }
  assert.throws(() => parse({flags: 0x0601, methods: [{name: '<init>', flags: 1}]}), Error);
  assert.throws(() => parse({major: 51, flags: 0x0601, methods: [{flags: 1}]}), Error);
});

test('historical modifier rules remain versioned instead of using modern constraints', () => {
  const controls = [
    {methods: [{name: '<init>', flags: 0x0041}]},
    {flags: 0x0401, methods: [{flags: 0x0421}]},
    {flags: 0x0401, methods: [{flags: 0x0c01}]},
    {flags: 0x0621}, {flags: 0x2001},
    {flags: 0x0601, fields: [{flags: 0x4019}]},
    {flags: 0x0601, methods: [{flags: 0x0c27}]}
  ];
  for (const options of controls) {
    parse({...options, major: 48});
    assert.throws(() => parse({...options, major: 49}), Error, JSON.stringify(options));
  }
  parse({major: 49, flags: 0x0201});
  assert.throws(() => parse({major: 50, flags: 0x0201}), Error);
});

test('constant-pool double slots and versioned tags are rejected at parse', () => {
  const pool = new ConstantPool();
  assert.throws(() => pool.parse(new ByteStream(Buffer.concat([u2(2), Buffer.from([5]), Buffer.alloc(8), Buffer.from([0])]))), Error);
  assert.throws(() => new ConstantPool().parse(new ByteStream(Buffer.concat([u2(0), Buffer.from([0])]))), Error);
  assert.throws(() => parse({major: 50, extraPool: ({add, utf8}) => add(16, u2(utf8('()V')))}), Error);
  assert.throws(() => parse({extraPool: ({add, utf8}) => add(16, u2(utf8('I')))}), Error);
  assert.throws(() => parse({extraPool: ({add, utf8}) => add(19, u2(utf8('module')))}), Error);
});

test('modified UTF-8 rejects malformed encodings but preserves NUL and surrogate code units', () => {
  for (const bytes of [[0], [0x80], [0xc0], [0xc1, 0x81], [0xc2, 0x41], [0xe0, 0x80, 0x81], [0xe1, 0x80], [0xf0, 0x90, 0x80, 0x80]]) {
    assert.throws(() => new ConstUTF8(Buffer.from(bytes)), Error, JSON.stringify(bytes));
  }
  assert.equal(new ConstUTF8(Buffer.from([0xc0, 0x80])).value, '\0');
  assert.equal(new ConstUTF8(Buffer.from([0xed, 0xa0, 0xbd, 0xed, 0xb8, 0x80])).value, '😀');
  assert.equal(new ConstUTF8(Buffer.from([0xed, 0xa0, 0x80])).value, '\ud800');
});

test('pre-48 modified UTF-8 retains native overlong compatibility without allowing malformed bytes', () => {
  for (const bytes of [[0xc1, 0x81], [0xe0, 0x80, 0x81], [0xe0, 0x80, 0x80]]) {
    const extraPool = ({add}) => add(1, Buffer.concat([u2(bytes.length), Buffer.from(bytes)]));
    for (const major of [45, 47]) parse({major, extraPool});
    for (const major of [48, 65, 69]) assert.throws(() => parse({major, extraPool}), Error);
  }
  for (const bytes of [[0], [0x80], [0xc0], [0xe1, 0x80], [0xf0, 0x90, 0x80, 0x80]]) {
    assert.throws(() => parse({major: 47, extraPool: ({add}) => add(1, Buffer.concat([u2(bytes.length), Buffer.from(bytes)]))}), Error);
  }
});

test('all constant-pool name-and-type and method-handle entries are structurally checked', () => {
  for (const [name, descriptor] of [['field', 'V'], ['bad/name', 'I']]) {
    assert.throws(() => parse({extraPool: ({add, utf8}) => add(12, Buffer.concat([u2(utf8(name)), u2(utf8(descriptor))]))}), Error);
  }
  for (const [name, descriptor] of [['<clinit>', '()V'], ['<init>', '()I'], ['<clinit>', '(I)I']]) {
    parse({extraPool: ({add, utf8}) => add(12, Buffer.concat([u2(utf8(name)), u2(utf8(descriptor))]))});
  }
  const handle = (major, kind) => parse({major, extraPool: ({add, utf8, cls}) => {
    const type = add(12, Buffer.concat([u2(utf8('call')), u2(utf8('()V'))]));
    const ref = add(11, Buffer.concat([u2(cls('Face')), u2(type)]));
    add(15, Buffer.concat([Buffer.from([kind]), u2(ref)]));
  }});
  assert.throws(() => handle(65, 5), Error);
  assert.throws(() => handle(51, 6), Error);
  handle(52, 6);
  handle(65, 9);
});
