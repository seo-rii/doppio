import assert from 'node:assert/strict';
import test from 'node:test';
import {coreOpcodeNames, decodeCoreCode, proveCoreGroup} from './java_core_bytecode.mjs';

test('evidence mnemonic table has the standard 202 admitted opcodes in exact positions', () => {
  assert.equal(coreOpcodeNames.length, 202);
  assert.equal(new Set(coreOpcodeNames).size, 202);
  for (const [index, name] of [[0, 'nop'], [19, 'ldc_w'], [96, 'iadd'], [132, 'iinc'], [137, 'l2f'],
    [170, 'tableswitch'], [171, 'lookupswitch'], [184, 'invokestatic'], [196, 'wide'], [201, 'jsr_w']])
    assert.equal(coreOpcodeNames[index], name);
  for (const value of [202, 203, 254, 255]) assert.throws(() => decodeCoreCode(Buffer.from([value])), /Reserved/);
});

test('opcode-looking immediate and CP bytes cannot be evidence of executable instructions', () => {
  const pool = []; pool[96] = {tag: 8, first: 1}; pool[1] = {tag: 1, value: 'iadd'};
  const result = decodeCoreCode(Buffer.from([16, 96, 17, 0, 96, 19, 0, 96, 177]), pool);
  assert.deepEqual(result.map(item => item.name), ['bipush', 'sipush', 'ldc_w', 'return']);
  assert.equal(result[2].cp.value, 'iadd'); assert.equal(result[2].cp.index, 96);
});

test('wide retains the actual nested opcode, unsigned slot and signed increment', () => {
  const result = decodeCoreCode(Buffer.from([196, 132, 1, 3, 1, 44, 196, 132, 1, 2, 254, 211,
    196, 22, 1, 4, 88, 196, 169, 1, 44]));
  assert.deepEqual(result.filter(item => item.name === 'wide').map(item =>
    [item.modifiedOpcode, item.localIndex, item.increment]), [['iinc', 259, 300], ['iinc', 258, -301],
    ['lload', 260, undefined], ['ret', 300, undefined]]);
  for (const bytes of [[196], [196, 132, 1, 3], [196, 96, 1, 3], [19, 0], [200, 0, 0]])
    assert.throws(() => decodeCoreCode(Buffer.from(bytes)), /Truncated|wide/);
});

test('signed long branches retain direction and reject targets inside operands', () => {
  const code = Buffer.alloc(40006); code[0] = 200; code.writeInt32BE(40000, 1);
  code[40000] = 200; code.writeInt32BE(-40000, 40001); code[40005] = 177;
  const result = decodeCoreCode(code).filter(item => item.name === 'goto_w');
  assert.deepEqual(result.map(item => [item.pc, item.branchOffset, item.branchTarget]),
    [[0, 40000, 40000], [40000, -40000, 0]]);
  code.writeInt32BE(2, 1);
  assert.throws(() => decodeCoreCode(code), /instruction boundary/);
});

test('table and lookup switches decode aligned signed keys and every target', () => {
  const table = Buffer.alloc(26); table[0] = 0; table[1] = 170;
  table.writeInt32BE(23, 4); table.writeInt32BE(-2, 8); table.writeInt32BE(-1, 12);
  table.writeInt32BE(23, 16); table.writeInt32BE(24, 20); table[24] = 177; table[25] = 177;
  const t = decodeCoreCode(table)[1];
  assert.deepEqual(t.keys, [-2, -1]); assert.deepEqual(t.targets, [24, 25]); assert.equal(t.length, 23);
  const lookup = Buffer.alloc(37); lookup[0] = 171;
  lookup.writeInt32BE(36, 4); lookup.writeInt32BE(3, 8);
  for (const [i, value] of [-2147483648, -7, 2147483647].entries()) {
    lookup.writeInt32BE(value, 12 + 8 * i); lookup.writeInt32BE(36, 16 + 8 * i);
  }
  lookup[36] = 177;
  assert.deepEqual(decodeCoreCode(lookup)[0].keys, [-2147483648, -7, 2147483647]);
  lookup.writeInt32BE(-2147483648, 20);
  assert.throws(() => decodeCoreCode(lookup), /Ordered/);
  table.writeInt32BE(2147483647, 12);
  assert.throws(() => decodeCoreCode(table), /Bounded/);
});

// Synthetic graph unit only: not compiler output or guest-execution evidence.
function graph() {
  const call = (owner, name, descriptor) => ({pc: 0, opcode: 184, name: 'invokestatic',
    cp: {index: 7, tag: 10, owner, name, descriptor}});
  const body = instructions => ({codeSha256: 'unit', codeLength: 1, maxStack: 2, maxLocals: 0, instructions, handlers: []});
  return new Map([['Core', {file: {path: 'Core.class'}, methods: new Map([
    ['main([Ljava/lang/String;)V', body([call('Core', 'caseA', '()V')])],
    ['caseA()V', body([call('Helper', 'probe', '(J)F')])]
  ])}], ['Helper', {file: {path: 'Helper.class'}, methods: new Map([
    ['probe(J)F', body([{pc: 0, opcode: 137, name: 'l2f', length: 1}])],
    ['unused()V', body([{pc: 0, opcode: 96, name: 'iadd', length: 1}])]
  ])}]]);
}
const group = () => ({mainClass: 'Core', cases: [{id: 'direct-rounding', entryMethod: 'caseA', entryDescriptor: '()V',
  probes: [{className: 'Helper', method: 'probe', descriptor: '(J)F', requiredOpcodes: ['l2f']}]}]});

test('probes bind actual call owner, name, descriptor and reachable instruction, not unrelated code', () => {
  const result = proveCoreGroup(group(), graph());
  assert.equal(result[0].staticCallEdges[0].cp.owner, 'Helper');
  assert.equal(result[0].probes[0].matches[0].name, 'l2f');
  assert.equal(result[0].jitExecutionProven, false); assert.equal(result[0].dynamicBranchCoverageProven, false);
  for (const change of [p => p.className = 'Wrong', p => p.method = 'unused', p => p.descriptor = '(J)D',
    p => p.requiredOpcodes = ['iadd']]) {
    const changed = group(); change(changed.cases[0].probes[0]);
    assert.throws(() => proveCoreGroup(changed, graph()), /reaches probe|Decoded opcode/);
  }
  const disconnected = graph(); disconnected.get('Core').methods.get('main([Ljava/lang/String;)V').instructions = [];
  assert.throws(() => proveCoreGroup(group(), disconnected), /Main reaches/);
  for (const requiredOpcodes of [[], undefined, 'l2f', ['not-an-opcode'], [137]]) {
    const changed = group(); changed.cases[0].probes[0].requiredOpcodes = requiredOpcodes;
    assert.throws(() => proveCoreGroup(changed, graph()), /Nonempty known opcode obligations/);
  }
});

test('constraints require decoded wide, CP-value/index and branch-distance operands', () => {
  const g = group(), classes = graph(), method = classes.get('Helper').methods.get('probe(J)F');
  method.instructions.push({pc: 1, opcode: 196, name: 'wide', modifiedOpcode: 'iinc', localIndex: 259, increment: 300},
    {pc: 7, opcode: 19, name: 'ldc_w', cp: {index: 600, tag: 8, value: 'constant299'}},
    {pc: 10, opcode: 200, name: 'goto_w', branchOffset: -40000, branchTarget: 0});
  const p = g.cases[0].probes[0];
  p.wide = [{opcode: 'iinc', minIndex: 256, increment: 300}];
  p.constantLoads = [{opcode: 'ldc_w', minCpIndex: 256, value: 'constant299'}];
  p.branches = [{opcode: 'goto_w', minDistance: 32768, direction: 'backward'}];
  assert.doesNotThrow(() => proveCoreGroup(g, classes));
  for (const [name, changes] of [['wide', {increment: 301}], ['constantLoads', {value: 'constant298'}],
    ['branches', {direction: 'forward'}]]) {
    const changed = structuredClone(g); Object.assign(changed.cases[0].probes[0][name][0], changes);
    assert.throws(() => proveCoreGroup(changed, classes), /Actual/);
  }
});
