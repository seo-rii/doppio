import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {readRecordClass} from './java_record_metadata.mjs';
import {proveFinalGroup, proveFinalBootstrapSites, readFinalBootstrapSite,
  validateFinalBootstrapSites, proveFinalLauncherClass} from './java_final_language_metadata.mjs';

// Synthetic class-file/parser and graph contracts only, never genuine compiler
// output or host execution evidence. The official B8 gate supplies both.
const u2 = value => {const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes;};
const u4 = value => {const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes;};
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const targetDescriptor = '(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;[Ljava/lang/Object;)Ljava/lang/invoke/CallSite;';
function specimen() {
  const pool = [];
  const add = (tag, ...parts) => {pool.push(Buffer.concat([Buffer.from([tag]), ...parts])); return pool.length;};
  const utf = text => {const bytes = Buffer.from(text); return add(1, u2(bytes.length), bytes);};
  const cls = name => add(7, u2(utf(name)));
  const nt = (name, descriptor) => add(12, u2(utf(name)), u2(utf(descriptor)));
  const self = cls('Fixture'), parent = cls('java/lang/Object');
  const codeName = utf('Code'), bootstrapName = utf('BootstrapMethods');
  const bootstrapRef = add(10, u2(cls('java/lang/runtime/SwitchBootstraps')), u2(nt('typeSwitch', targetDescriptor)));
  const handle = add(15, Buffer.from([6]), u2(bootstrapRef));
  const label = cls('java/lang/String');
  const indy = add(18, u2(0), u2(nt('typeSwitch', '(Ljava/lang/Object;I)I')));
  const caseRef = add(10, u2(self), u2(nt('caseA', '()V')));
  const probeRef = add(10, u2(self), u2(nt('probe', '(Ljava/lang/Object;I)I')));
  const method = (name, descriptor, code, flags = 9) => {
    const body = Buffer.concat([u2(2), u2(2), u4(code.length), code, u2(0), u2(0)]);
    return Buffer.concat([u2(flags), u2(utf(name)), u2(utf(descriptor)), u2(1), u2(codeName), u4(body.length), body]);
  };
  const methods = [method('main', '([Ljava/lang/String;)V', Buffer.concat([Buffer.from([184]), u2(caseRef), Buffer.from([177])])),
    method('caseA', '()V', Buffer.concat([Buffer.from([1, 3, 184]), u2(probeRef), Buffer.from([87, 177])])),
    method('probe', '(Ljava/lang/Object;I)I', Buffer.concat([Buffer.from([42, 27, 186]), u2(indy), Buffer.from([0, 0, 172])]))];
  const bootstrap = Buffer.concat([u2(1), u2(handle), u2(2), u2(label), u2(label)]);
  const bytes = Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe]), u2(0), u2(65), u2(pool.length + 1), ...pool,
    u2(33), u2(self), u2(parent), u2(0), u2(0), u2(methods.length), ...methods,
    u2(1), u2(bootstrapName), u4(bootstrap.length), bootstrap]);
  const metadata = readRecordClass(bytes);
  metadata.file = {path: 'Fixture.class', sha256: sha(bytes), size: bytes.length, major: 65, minor: 0};
  metadata.interfaceNames = [];
  metadata.core = {file: metadata.file, methods: new Map(metadata.methods.filter(item => item.code).map(item =>
    [item.name + item.descriptor, {instructions: item.code.instructions, codeSha256: item.code.sha256,
      codeLength: item.code.length, maxStack: item.code.maxStack, maxLocals: item.code.maxLocals, handlers: []}]))};
  return metadata;
}
const site = () => ({siteName: 'typeSwitch', siteDescriptor: '(Ljava/lang/Object;I)I',
  bootstrap: {kind: 6, tag: 10, owner: 'java.lang.runtime.SwitchBootstraps', name: 'typeSwitch', descriptor: targetDescriptor},
  arguments: [{tag: 7, value: 'java.lang.String'}, {tag: 7, value: 'java.lang.String'}]});
const probe = () => ({method: 'probe', descriptor: '(Ljava/lang/Object;I)I', requiredOpcodes: ['invokedynamic', 'ireturn'], bootstrapSites: [site()]});
const group = () => ({id: 'final-patterns', mainClass: 'Fixture', cases: [
  {id: 'case-a', entryMethod: 'caseA', entryDescriptor: '()V', probes: [probe()]}]});

test('bootstrap proof follows decoded CP, NameAndType, MethodHandle and repeated labels', () => {
  const metadata = specimen(), actual = proveFinalGroup(group(), new Map([['Fixture', metadata]]))[0];
  const proof = actual.probes[0].bootstrapSites[0];
  assert.equal(proof.instructionPc, 2); assert.equal(proof.bootstrapIndex, 0);
  assert.deepEqual(proof.arguments, site().arguments); assert.equal(proof.argumentIndices[0], proof.argumentIndices[1]);
  for (const key of ['cpOffset', 'bootstrapOffset', 'methodHandleOffset', 'referenceIndex']) assert.ok(proof[key] > 0);
  assert.match(proof.attributeSha256, /^[a-f0-9]{64}$/);
  assert.equal(actual.dynamicBranchCoverageProven, false); assert.equal(actual.jitExecutionProven, false);
});

test('unused CP, unrelated method, wrong bootstrap member or label inventory cannot prove a site', () => {
  for (const mutate of [g => g.cases[0].probes[0].bootstrapSites[0].arguments.pop(),
    g => g.cases[0].probes[0].bootstrapSites[0].arguments[1].value = 'java.lang.Integer',
    g => g.cases[0].probes[0].bootstrapSites[0].siteDescriptor = '(Ljava/lang/String;I)I',
    g => g.cases[0].probes[0].bootstrapSites.push(site())]) {
    const changed = group(); mutate(changed);
    assert.throws(() => proveFinalGroup(changed, new Map([['Fixture', specimen()]])), /Actual decoded bootstrap/);
  }
  const metadata = specimen();
  metadata.core.methods.get('probe(Ljava/lang/Object;I)I').instructions = [{pc: 0, opcode: 172, name: 'ireturn'}];
  assert.throws(() => proveFinalGroup(group(), new Map([['Fixture', metadata]])), /Decoded opcode/);
  const wrong = specimen(), handle = wrong.layout.pool[wrong.bootstrapMethods[0].methodRef];
  wrong.bytes[handle.start + 1] = 5;
  assert.throws(() => proveFinalGroup(group(), new Map([['Fixture', wrong]])), /Actual decoded bootstrap/);
});

test('malformed/unknown bootstrap selectors and broken actual CP paths fail', () => {
  for (const mutate of [s => s.typo = true, s => s.bootstrap.typo = true, s => s.arguments[0].typo = true,
    s => s.bootstrap.kind = 5, s => s.bootstrap.tag = 11, s => s.arguments[0].tag = 8]) {
    const changed = site(); mutate(changed); assert.throws(() => validateFinalBootstrapSites([changed]));
  }
  for (const sites of [[], null, 'typeSwitch', [null]]) assert.throws(() => validateFinalBootstrapSites(sites));
  const metadata = specimen(), method = metadata.core.methods.get('probe(Ljava/lang/Object;I)I');
  const ins = method.instructions.find(item => item.name === 'invokedynamic');
  for (const [property, value] of [['tag', 17], ['first', 99], ['second', 1]]) {
    const changed = specimen(), actual = changed.core.methods.get('probe(Ljava/lang/Object;I)I').instructions.find(item => item.name === 'invokedynamic');
    changed.layout.pool[actual.cp.index][property] = value; assert.throws(() => readFinalBootstrapSite(changed, actual));
  }
  const changed = probe(); changed.requiredOpcodes = ['ireturn'];
  assert.throws(() => proveFinalBootstrapSites(changed, method, metadata), /same decoded probe/);
  assert.equal(ins.cp.tag, 18);
});

const exactFlags = required => ({required, forbidden: 65535 ^ required});
const classProof = () => ({className: 'Fixture', flags: exactFlags(33), superName: 'java.lang.Object', interfaceNames: [],
  declaredMainMethods: [{descriptor: '([Ljava/lang/String;)V', flags: exactFlags(9), hasCode: true}],
  constructors: [], classInitializer: null});

test('launcher proof binds exact declared inventories, Code presence and header identity', () => {
  const actual = proveFinalLauncherClass(classProof(), specimen());
  assert.equal(actual.mains.length, 1); assert.equal(actual.constructors.length, 0); assert.equal(actual.initializers.length, 0);
  for (const mutate of [p => p.className = 'Wrong', p => p.superName = 'Wrong', p => p.interfaceNames.push('Wrong'),
    p => p.declaredMainMethods = [], p => p.declaredMainMethods[0].hasCode = false,
    p => p.declaredMainMethods[0].flags = exactFlags(1),
    p => p.constructors.push({descriptor: '()V', flags: exactFlags(1), hasCode: true}),
    p => p.classInitializer = {descriptor: '()V', flags: exactFlags(8), hasCode: true}]) {
    const changed = classProof(); mutate(changed); assert.throws(() => proveFinalLauncherClass(changed, specimen()));
  }
});

function launcher() {
  const metadata = specimen();
  const container = {name: 'Container', methods: [], interfaceNames: [], superName: 'java.lang.Object', core: {methods: new Map()}};
  const classes = new Map([['Fixture', metadata], ['Container', container]]);
  const entry = {id: 'launch-a', mainClass: 'Fixture', outcome: 'success', classProofs: [classProof()],
    launchSelection: {declaringClass: 'Fixture', descriptor: '([Ljava/lang/String;)V', isStatic: true, constructor: null},
    probes: [{className: 'Fixture', method: 'main', descriptor: '([Ljava/lang/String;)V', requiredOpcodes: ['invokestatic', 'return'],
      symbolicOperands: [{opcode: 'invokestatic', tag: 10, owner: 'Fixture', name: 'caseA', descriptor: '()V'}]}]};
  return {group: {id: 'final-launcher', mainClass: 'Container', cases: [entry]}, classes};
}

test('launcher is real startup evidence, never a wrapper invocation of main', () => {
  const setup = launcher(), proof = proveFinalGroup(setup.group, setup.classes)[0];
  assert.equal(proof.actualLaunchTarget, 'Fixture'); assert.equal(proof.generalInitializationConformanceProven, false);
  for (const mutate of [s => s.group.cases[0].launchSelection.declaringClass = 'Container',
    s => s.group.cases[0].launchSelection.descriptor = '()I', s => s.group.cases[0].launchSelection.isStatic = false,
    s => s.group.cases[0].launchSelection.constructor = {className: 'Fixture', descriptor: '()V'},
    s => s.group.cases[0].classProofs = [], s => s.group.cases[0].probes[0].symbolicOperands[0].name = 'unused']) {
    const changed = launcher(); mutate(changed); assert.throws(() => proveFinalGroup(changed.group, changed.classes));
  }
  const wrapper = launcher(); wrapper.classes.get('Container').methods = [{name: 'main'}];
  assert.throws(() => proveFinalGroup(wrapper.group, wrapper.classes), /no wrapper main/);
  const ordinary = launcher(); ordinary.classes.get('Fixture').core.methods.get('main([Ljava/lang/String;)V')
    .instructions[0].cp.name = 'main';
  assert.throws(() => proveFinalGroup(ordinary.group, ordinary.classes), /no ordinary invocation/);
});

test('abstract initial-interface failure has genuine declaration evidence and no fabricated Code probe', () => {
  const setup = launcher(), metadata = setup.classes.get('Fixture'), entry = setup.group.cases[0];
  metadata.flags = 0x601;
  metadata.methods = metadata.methods.filter(method => method.name === 'main');
  metadata.methods[0].flags = 0x401; delete metadata.methods[0].code;
  metadata.core.methods = new Map();
  entry.outcome = 'failure'; entry.probes = [];
  entry.launchSelection.isStatic = false;
  entry.classProofs[0].flags = exactFlags(0x601);
  entry.classProofs[0].declaredMainMethods[0] = {descriptor: '([Ljava/lang/String;)V', flags: exactFlags(0x401), hasCode: false};
  const proof = proveFinalGroup(setup.group, setup.classes)[0];
  assert.deepEqual(proof.probes, []); assert.equal(proof.classProofs[0].mains[0].hasCode, false);
  entry.outcome = 'success';
  assert.throws(() => proveFinalGroup(setup.group, setup.classes), /binds its constructor/);
});
