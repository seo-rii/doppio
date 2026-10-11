import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertDerivationProvenance} from './java_class_derivation_test.mjs';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {inspectClassFiles, runCommand, runtimeSnapshot, validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';

const harnessPath = fileURLToPath(import.meta.url), repoRoot = path.resolve(path.dirname(harnessPath), '..');
const sourcePath = path.join(repoRoot, 'classes/modern_fixture/JavaInvocationEvolution.java');
const mainClass = 'classes.modern_test.JavaInvocationEvolution';
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const full = name => 'invocation.' + name, b = name => 'baseline:' + full(name), e = name => 'evolved:' + full(name);
const ame = 'java.lang.AbstractMethodError', icce = 'java.lang.IncompatibleClassChangeError', npe = 'java.lang.NullPointerException';
export const invocationEvolutionLedgerScope = 'JVM-002 B4d genuine evolved invocation, default selection, field kinds and initialization';
export {assertDerivationProvenance as assertInvocationEvolutionProvenance};

const resultTrace = (phase, error, value) => [(error || 'accepted') + '@' + phase,
  ...(error ? [] : ['value@' + phase + '=' + value])];
const effectsTrace = effects => 'effects=' + (effects || 'none');

export function invocationEvolutionCases() {
  const cases = [];
  const single = (id, kind, caller, payloads, error, value, effects, receiver = false, owner = null) => {
    cases.push({id, kind, caller: full(caller), payloads: [b(caller), ...payloads],
      expectedError: error, expectedValue: value, expectedEffects: effects,
      trace: ['metadata-ready-no-effects', ...(owner ? ['declaring-owner=invocation.ClassBase;abstract=' + owner] : []),
        ...(receiver ? ['receiver-ready-no-effects'] : []), ...resultTrace('invoke', error, value), effectsTrace(effects)]});
  };
  for (const [form, caller] of [['interface', 'DefaultInterfaceCaller'], ['virtual', 'DefaultVirtualCaller']]) {
    for (const changed of [false, true]) single('default-' + form + (changed ? '-abstract' : '-positive'),
      'retained-declaration-default-removal', caller, [b('DefaultImpl'), (changed ? e : b)('DefaultRole')],
      changed ? ame : null, changed ? null : 11, changed ? '' : 'removed-default', true);
  }
  for (const changed of [false, true]) single(changed ? 'subinterface-reabstract' : 'subinterface-positive',
    'maximally-specific-reabstraction', 'ReCaller', [b('ReRoot'), (changed ? e : b)('ReSub'), b('ReImpl')],
    changed ? ame : null, changed ? null : 12, changed ? '' : 'root-default', true);
  for (const [form, caller] of [['interface', 'ConflictInterfaceCaller'], ['virtual', 'ConflictVirtualCaller']]) {
    for (const changed of [false, true]) {
      const error = changed ? icce : null, effects = changed ? 'override,override' : 'override,left-default,override,left-default';
      cases.push({id: 'conflict-' + form + (changed ? '-evolved' : '-positive'), kind: 'receiver-specific-default-conflict',
        caller: full(caller), payloads: [b(caller), b('ConflictLeft'), (changed ? e : b)('ConflictRight'),
          b('ConflictImpl'), b('ConflictOverride')], sameCallerAndConstantPool: true,
        trace: ['metadata-ready-no-effects', 'runtime-default-identities-proven', 'receivers-ready-no-effects',
          ...resultTrace('override-before', null, 23), ...resultTrace('plain', error, 21),
          ...resultTrace('override-after', null, 23), ...resultTrace('null', npe, null),
          ...resultTrace('plain-repeat', error, 21), effectsTrace(effects)]});
    }
  }
  for (const changed of [false, true]) single(changed ? 'super-default-conflict' : 'super-default-positive',
    'genuine-super-invokespecial', 'SuperCaller', [b('ConflictLeft'), (changed ? e : b)('ConflictRight'), b('ConflictImpl')],
    changed ? icce : null, changed ? null : 21, changed ? '' : 'left-default', true);
  for (const changed of [false, true]) single(changed ? 'single-default-with-abstract' : 'single-default-positive',
    'one-concrete-unrelated-abstract', 'SingleCaller', [b('SingleLeft'), (changed ? e : b)('SingleRight'), b('SingleImpl')],
    null, 24, 'single-default', true);
  for (const changed of [false, true]) single(changed ? 'diamond-more-specific-default' : 'diamond-common-default',
    'maximally-specific-diamond', 'DiamondCaller', [b('DiamondRoot'), (changed ? e : b)('DiamondLeft'), b('DiamondRight'), b('DiamondImpl')],
    null, changed ? 26 : 25, changed ? 'diamond-left' : 'diamond-root', true);
  for (const [form, caller] of [['interface', 'ClassInterfaceCaller'], ['virtual', 'ClassVirtualCaller']]) {
    for (const changed of [false, true]) single('class-' + form + (changed ? '-abstract' : '-positive'),
      'exact-inherited-class-declaration', caller, [b('ClassRole'), (changed ? e : b)('ClassBase'), b('ClassImpl')],
      changed ? ame : null, changed ? null : 32, changed ? '' : 'class-base', true, String(changed));
  }
  for (const [form, owner, caller, value, effects] of [
    ['class', 'StaticClass', 'StaticClassCaller', 41, 'static-class-init,static-class-body'],
    ['interface', 'StaticRole', 'StaticRoleCaller', 42, 'static-role-init,static-role-body']
  ]) for (const changed of [false, true]) single('static-' + form + (changed ? '-became-instance' : '-positive'),
    'invokestatic-member-staticness', caller, [(changed ? e : b)(owner)], changed ? icce : null,
    changed ? null : value, changed ? '' : effects);
  for (const [form, owner, caller] of [['class', 'VirtualClass', 'VirtualClassCaller'],
    ['interface', 'VirtualRole', 'VirtualRoleCaller']]) {
    for (const changed of [false, true]) single('virtual-' + form + (changed ? '-became-static' : '-positive'),
      'instance-invocation-staticness-before-null', caller, [(changed ? e : b)(owner)], changed ? icce : npe, null, '');
  }
  for (const [kind, caller, owner, deferred, value, first, second] of [
    ['inherited', 'InitClassCaller', 'InitBase', 'InitChild', 51, 'init-base,base-static', 'init-base,base-static,init-child'],
    ['interface', 'InitInterfaceCaller', 'InitRole', 'InitParent', 52, 'init-role,role-static', 'init-role,role-static,init-parent']
  ]) cases.push({id: 'static-' + kind + '-declaring-initialization', kind: 'actual-declaring-owner-initialization',
    caller: full(caller), payloads: [b(caller), b(owner), b(deferred)],
    trace: ['metadata-ready-no-effects', 'declaring-owner=' + full(owner), ...resultTrace('invoke', null, value),
      effectsTrace(first), 'accepted@explicit-initialize', effectsTrace(second)]});
  for (const changed of [false, true]) single(changed ? 'getstatic-became-instance' : 'getstatic-positive',
    'getstatic-field-staticness', 'FieldStaticCaller', [(changed ? e : b)('FieldStaticOwner')],
    changed ? icce : null, changed ? null : 61, changed ? '' : 'field-static-init');
  for (const changed of [false, true]) single(changed ? 'getfield-became-static' : 'getfield-positive',
    'getfield-staticness-before-null', 'FieldInstanceCaller', [(changed ? e : b)('FieldInstanceOwner')],
    changed ? icce : npe, null, '');
  return cases.map(entry => {
    const difference = entry.id === 'conflict-interface-evolved';
    return {...entry, packageId: 'JVM-002', mutation: false, expectedPhase: 'invoke',
      throwableIdentityCompared: false,
      expectedTraces: Object.fromEntries([21, 25].map(release => [release, {
        native: difference && release === 21 ? entry.trace.map(event => event.replace(icce + '@plain', ame + '@plain')) : entry.trace,
        node: entry.trace, chromium: entry.trace
      }])),
      ...(difference ? {oracleDifference: {
        nativeFeatures: [21], nativeExpected: ame, specExpected: icce,
        runtimeIdentityAndDefaultMetadataChecked: true,
        reason: 'Pinned HotSpot 21 reports exact AbstractMethodError for invokeinterface on this evolved unrelated-default conflict, both before and after an overriding receiver. Actual loaded default flags, declaring/implementing Class identities and stage routing were checked. Pinned 25 reports IncompatibleClassChangeError. JVMS 6.5.invokeinterface specifies ICCE for multiple nonabstract maximally-specific methods; both guests retain that rule. AME is an ICCE subclass, but this ledger does not collapse their identities.'
      }} : {}), specificationRefs: Object.fromEntries([21, 25].map(release => [release,
      ['5.4.3.2', '5.4.3.3', '5.4.3.4', '5.4.6', '5.5'].map(section =>
        'https://docs.oracle.com/javase/specs/jvms/se' + release + '/html/jvms-5.html#jvms-' + section)
        .concat(['invokevirtual', 'invokeinterface', 'invokespecial', 'invokestatic', 'getstatic', 'getfield'].map(opcode =>
          'https://docs.oracle.com/javase/specs/jvms/se' + release + '/html/jvms-6.html#jvms-6.5.' + opcode))]))};
  });
}

export function invocationEvolutionOracleBoundary() {
  const cases = invocationEvolutionCases(), differences = cases.filter(entry => entry.oracleDifference);
  return {strictNativeParity: false, crossHostSpecAgreement: false,
    nativeParityCaseCountByRelease: {21: cases.length - differences.length, 25: cases.length},
    documentedOracleDifferenceCaseCount: differences.length,
    oracleDifferences: differences.map(entry => ({id: entry.id, ...entry.oracleDifference, specificationRefs: entry.specificationRefs}))};
}

/** The second javac operation replaces only owners, never callers or receivers. */
export function invocationEvolutionSources() {
  const baseline = [], evolved = [];
  const add = (list, name, body) => list.push({binaryName: full(name), text: 'package invocation; ' + body + '\n'});
  const mark = (name, value) => mainClass + '.mark("' + name + '", ' + value + ')';
  const method = (marker, value) => 'int value() { return ' + mark(marker, value) + '; }';
  const caller = (name, type, body) => add(baseline, name, 'public class ' + name +
    ' { public static int run(' + (type ? type + ' receiver' : '') + ') { return ' + body + '; } }');
  add(baseline, 'DefaultRole', 'public interface DefaultRole { default ' + method('removed-default', 11) + ' }');
  add(evolved, 'DefaultRole', 'public interface DefaultRole { int value(); }');
  add(baseline, 'DefaultImpl', 'public class DefaultImpl implements DefaultRole {}');
  caller('DefaultInterfaceCaller', 'DefaultRole', 'receiver.value()');
  caller('DefaultVirtualCaller', 'DefaultImpl', 'receiver.value()');
  add(baseline, 'ReRoot', 'public interface ReRoot { default ' + method('root-default', 12) + ' }');
  add(baseline, 'ReSub', 'public interface ReSub extends ReRoot {}');
  add(evolved, 'ReSub', 'public interface ReSub extends ReRoot { int value(); }');
  add(baseline, 'ReImpl', 'public class ReImpl implements ReSub {}');
  caller('ReCaller', 'ReSub', 'receiver.value()');
  add(baseline, 'ConflictLeft', 'public interface ConflictLeft { default ' + method('left-default', 21) + ' }');
  add(baseline, 'ConflictRight', 'public interface ConflictRight {}');
  add(evolved, 'ConflictRight', 'public interface ConflictRight { default ' + method('right-default', 22) + ' }');
  add(baseline, 'ConflictImpl', 'public class ConflictImpl implements ConflictLeft, ConflictRight {}');
  add(baseline, 'ConflictOverride', 'public class ConflictOverride extends ConflictImpl { public ' + method('override', 23) + ' }');
  caller('ConflictInterfaceCaller', 'ConflictLeft', 'receiver.value()');
  caller('ConflictVirtualCaller', 'ConflictImpl', 'receiver.value()');
  add(baseline, 'SuperCaller', 'public class SuperCaller extends ConflictImpl { public int run() { return super.value(); } }');
  add(baseline, 'SingleLeft', 'public interface SingleLeft { default ' + method('single-default', 24) + ' }');
  add(evolved, 'SingleRight', 'public interface SingleRight { int value(); }');
  add(baseline, 'SingleRight', 'public interface SingleRight {}');
  add(baseline, 'SingleImpl', 'public class SingleImpl implements SingleLeft, SingleRight {}');
  caller('SingleCaller', 'SingleImpl', 'receiver.value()');
  add(baseline, 'DiamondRoot', 'public interface DiamondRoot { default ' + method('diamond-root', 25) + ' }');
  add(baseline, 'DiamondLeft', 'public interface DiamondLeft extends DiamondRoot {}');
  add(evolved, 'DiamondLeft', 'public interface DiamondLeft extends DiamondRoot { default ' + method('diamond-left', 26) + ' }');
  add(baseline, 'DiamondRight', 'public interface DiamondRight extends DiamondRoot {}');
  add(baseline, 'DiamondImpl', 'public class DiamondImpl implements DiamondLeft, DiamondRight {}');
  caller('DiamondCaller', 'DiamondImpl', 'receiver.value()');
  add(baseline, 'ClassRole', 'public interface ClassRole { default ' + method('class-default', 31) + ' }');
  add(baseline, 'ClassBase', 'public class ClassBase { public ' + method('class-base', 32) + ' }');
  add(evolved, 'ClassBase', 'public abstract class ClassBase { public abstract int value(); }');
  add(baseline, 'ClassImpl', 'public class ClassImpl extends ClassBase implements ClassRole {}');
  caller('ClassInterfaceCaller', 'ClassRole', 'receiver.value()');
  caller('ClassVirtualCaller', 'ClassImpl', 'receiver.value()');
  for (const [name, iface, value, marker] of [
    ['StaticClass', false, 41, 'static-class'], ['StaticRole', true, 42, 'static-role'],
    ['VirtualClass', false, 43, 'virtual-class'], ['VirtualRole', true, 44, 'virtual-role']
  ]) {
    const statik = name.startsWith('Static'), init = iface ? 'int MARK = ' + mark(marker + '-init', 0) + ';' :
      'static { ' + mark(marker + '-init', 0) + '; }';
    const owner = isStatic => 'public ' + (iface ? 'interface ' : 'class ') + name + ' { ' + init +
      ' public ' + (isStatic ? 'static ' : iface ? 'default ' : '') + method(marker + '-body', value) + ' }';
    add(baseline, name, owner(statik)); add(evolved, name, owner(!statik));
    caller(name + 'Caller', statik ? null : name, (statik ? name : 'receiver') + '.value()');
  }
  add(baseline, 'InitBase', 'public class InitBase { static { ' + mark('init-base', 0) + '; } public static ' + method('base-static', 51) + ' }');
  add(baseline, 'InitChild', 'public class InitChild extends InitBase { static { ' + mark('init-child', 0) + '; } }');
  caller('InitClassCaller', null, 'InitChild.value()');
  add(baseline, 'InitParent', 'public interface InitParent { int MARK = ' + mark('init-parent', 0) + '; }');
  add(baseline, 'InitRole', 'public interface InitRole extends InitParent { int MARK = ' + mark('init-role', 0) + '; static ' + method('role-static', 52) + ' }');
  caller('InitInterfaceCaller', null, 'InitRole.value()');
  for (const [name, statik, marker, value] of [
    ['FieldStaticOwner', true, 'field-static-init', 61], ['FieldInstanceOwner', false, 'field-instance-init', 62]
  ]) {
    const owner = isStatic => 'public class ' + name + ' { static { ' + mark(marker, 0) + '; } public ' +
      (isStatic ? 'static ' : '') + 'int value = ' + value + '; }';
    add(baseline, name, owner(statik)); add(evolved, name, owner(!statik));
    caller(statik ? 'FieldStaticCaller' : 'FieldInstanceCaller', statik ? null : name,
      (statik ? name : 'receiver') + '.value');
  }
  return [{stage: 'baseline', sources: baseline}, {stage: 'evolved', sources: evolved}];
}

// Reflection only enters these old javac methods; target dispatch uses their bytecode.
export const invocationCallerProofs = {
  DefaultInterfaceCaller: ['DefaultRole', 11, 0xb9, 'DefaultRole'],
  DefaultVirtualCaller: ['DefaultImpl', 10, 0xb6, 'DefaultImpl'],
  ReCaller: ['ReSub', 11, 0xb9, 'ReSub'],
  ConflictInterfaceCaller: ['ConflictLeft', 11, 0xb9, 'ConflictLeft'],
  ConflictVirtualCaller: ['ConflictImpl', 10, 0xb6, 'ConflictImpl'],
  SuperCaller: ['ConflictImpl', 10, 0xb7, null],
  SingleCaller: ['SingleImpl', 10, 0xb6, 'SingleImpl'],
  DiamondCaller: ['DiamondImpl', 10, 0xb6, 'DiamondImpl'],
  ClassInterfaceCaller: ['ClassRole', 11, 0xb9, 'ClassRole'],
  ClassVirtualCaller: ['ClassImpl', 10, 0xb6, 'ClassImpl'],
  StaticClassCaller: ['StaticClass', 10, 0xb8, null],
  StaticRoleCaller: ['StaticRole', 11, 0xb8, null],
  VirtualClassCaller: ['VirtualClass', 10, 0xb6, 'VirtualClass'],
  VirtualRoleCaller: ['VirtualRole', 11, 0xb9, 'VirtualRole'],
  InitClassCaller: ['InitChild', 10, 0xb8, null],
  InitInterfaceCaller: ['InitRole', 11, 0xb8, null],
  FieldStaticCaller: ['FieldStaticOwner', 9, 0xb2, null],
  FieldInstanceCaller: ['FieldInstanceOwner', 9, 0xb4, 'FieldInstanceOwner']
};

export function inspectInvocationEvolutionPayload(bytes, binaryName) {
  const layout = readStructureLayout(bytes), utf = index => layout.pool[index].value;
  const className = index => index === 0 ? null : utf(layout.pool[index].first);
  assert.equal(className(layout.thisClass), binaryName.replaceAll('.', '/'), 'Exact payload declaration identity');
  const references = layout.pool.flatMap((entry, index) => entry && [9, 10, 11].includes(entry.tag) ? [{
    index, kind: entry.tag, owner: className(entry.first), name: utf(layout.pool[entry.second].first),
    descriptor: utf(layout.pool[entry.second].second)}] : []);
  const methods = layout.methods.entries.map(({name, descriptor, flags, code}) => ({name, descriptor, flags,
    ...(code ? {instructionsHex: bytes.subarray(code.instructionsOffset, code.instructionsOffset + code.codeLength).toString('hex')} : {})}));
  const expected = invocationCallerProofs[binaryName.slice('invocation.'.length)];
  if (expected) {
    const [owner, kind, opcode, parameter] = expected, descriptor = kind === 9 ? 'I' : '()I';
    const run = methods.find(method => method.name === 'run' && method.descriptor ===
      '(' + (parameter ? 'Linvocation/' + parameter + ';' : '') + ')I');
    assert.ok(run, 'Exact unchanged caller method descriptor');
    assert.equal(Boolean(run.flags & 8), opcode !== 0xb7, 'Exact static entry or instance super entry');
    const instructions = Buffer.from(run.instructionsHex, 'hex'), receiver = parameter !== null || opcode === 0xb7;
    const pc = receiver ? 1 : 0, width = opcode === 0xb9 ? 5 : 3;
    assert.equal(instructions.length, pc + width + 1, 'Exact caller instruction boundaries');
    if (receiver) assert.equal(instructions[0], 0x2a, 'Exact receiver load at instruction boundary');
    assert.equal(instructions[pc], opcode, 'Exact executable member instruction');
    assert.equal(instructions[pc + width], 0xac, 'Exact integer return instruction');
    if (opcode === 0xb9) assert.deepEqual([...instructions.subarray(pc + 3, pc + 5)], [1, 0], 'Exact interface count and reserved byte');
    const index = instructions.readUInt16BE(pc + 1);
    assert.ok(references.some(entry => entry.index === index && entry.kind === kind && entry.owner === 'invocation/' + owner &&
      entry.name === 'value' && entry.descriptor === descriptor), 'Executable CP operand binds exact owner, tag, name and descriptor');
  }
  return {flags: layout.flags, superclass: className(bytes.readUInt16BE(layout.superClassOffset)),
    interfaces: Array.from({length: layout.interfaceCount}, (_, index) => className(bytes.readUInt16BE(layout.interfacesOffset + index * 2))),
    fields: layout.fields.entries.map(({name, descriptor, flags}) => ({name, descriptor, flags})), methods, references};
}

export function assertInvocationEvolution(baseline, replacements, permitted) {
  assert.deepEqual(replacements.map(entry => entry.path).sort(), [...permitted].sort(), 'Only planned owner replacements may be compiled');
  const originals = new Map(baseline.map(entry => [entry.path, entry]));
  for (const replacement of replacements) {
    assert.ok(originals.has(replacement.path), 'Every replacement has a genuine baseline');
    assert.notEqual(replacement.sha256, originals.get(replacement.path).sha256, 'Evolution must actually change owner bytes');
    assert.ok(!Object.hasOwn(invocationCallerProofs, path.basename(replacement.path, '.class')), 'Never recompile an old caller');
    assert.ok(!/(Impl|Override)\.class$/.test(replacement.path), 'Never recompile an old receiver');
  }
  return baseline.filter(entry => Object.hasOwn(invocationCallerProofs, path.basename(entry.path, '.class')));
}

function completed(result, label) {
  assert.ok(result && !result.timedOut && !result.outputLimitExceeded && !result.error && !result.signal,
    `${label}: incomplete execution ${JSON.stringify(result)}`);
}

export function assertInvocationEvolutionResult(result, label = 'invocation evolution', host = 'node', release = 25) {
  assert.ok(['native', 'node', 'chromium'].includes(host), 'Explicit known host expectation required');
  assert.ok([21, 25].includes(release), 'Explicit locked release expectation required');
  completed(result, label);
  assert.equal(result.status, 'passed', `${label}: ${result.stderr}`);
  assert.equal(result.exitCode, 0, `${label}: ${result.stderr}`);
  assert.equal(result.stderr.replaceAll('\r\n', '\n'), '', `${label}: stderr`);
  const lines = result.stdout.replaceAll('\r\n', '\n').split('\n');
  const outcomes = invocationEvolutionCases().map(entry => {
    const trace = entry.expectedTraces[release][host];
    for (const event of trace) assert.equal(lines.shift(), `${entry.id}=${event}`, `${label}: exact ${entry.id} ${host}/${release} trace`);
    return {id: entry.id, trace, expectationProfile: host === 'native' ? 'pinned-native-' + release : 'jvms',
      oracleDifference: Boolean(entry.oracleDifference && host === 'native' && release === 21)};
  });
  assert.deepEqual(lines, ['INVOCATION_EVOLUTION_OK', ''], `${label}: complete mandatory inventory without extra effects`);
  return outcomes;
}

export async function checkInvocationEvolutionExecution(record, host, execute, verifyInputs = () => {}) {
  const evidence = {host, status: 'running'};
  record.executions.push(evidence);
  try {
    assert.ok(['native', 'node', 'chromium'].includes(host), 'Known execution host');
    evidence.expectationProfile = host === 'native' ? 'pinned-native-' + record.release : 'jvms';
    verifyInputs();
    evidence.result = await execute();
    verifyInputs();
    evidence.outcomes = assertInvocationEvolutionResult(evidence.result, `${host} Java ${record.release}`, host, record.release);
    evidence.status = 'passed';
  } catch (error) {
    evidence.status = record.status = 'failed';
    evidence.error = error.stack || error.message;
    throw error;
  }
}

function inventory(directory) {
  const files = [];
  const visit = candidate => {
    const stat = fs.lstatSync(candidate);
    assert.ok(!stat.isSymbolicLink(), 'No linked inputs');
    if (stat.isDirectory()) for (const name of fs.readdirSync(candidate).sort()) visit(path.join(candidate, name));
    else {
      assert.ok(stat.isFile(), 'Regular inputs only');
      files.push({path: path.relative(directory, candidate).split(path.sep).join('/'), size: stat.size,
        sha256: digest(fs.readFileSync(candidate))});
    }
  };
  visit(directory);
  return files;
}

export function assertInvocationEvolutionClasspath(files, driverClasses, payloads) {
  assert.deepEqual(driverClasses.map(entry => entry.path).sort(), [
    'classes/modern_test/JavaInvocationEvolution$PayloadLoader.class', 'classes/modern_test/JavaInvocationEvolution.class'
  ], 'Only the genuine driver classes belong on the runtime classpath');
  assert.ok(payloads.every(entry => entry.resource.path.startsWith('invocation-evolution-cases/') && entry.resource.path.endsWith('.bin')));
  const expected = [...driverClasses.map(({path: name, size, sha256}) => ({path: name, size, sha256})),
    ...payloads.map(({resource}) => ({path: resource.path, size: resource.size, sha256: resource.sha256}))];
  const sorted = entries => [...entries].sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(sorted(files), sorted(expected), 'No fallback payload .class or undeclared resource on the runtime classpath');
}

export async function runInvocationEvolutionTests({nativeOnly = false, browser = !nativeOnly, onRelease = () => {}} = {}) {
  assert.ok(!nativeOnly || !browser, 'Native-only diagnostic cannot claim browser evidence');
  const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json');
  const markerPath = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
  const lockBytes = fs.readFileSync(lockPath), lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(markerPath));
  validateToolchains(marker, lock, digest(lockBytes), [21, 25]);
  const inputPaths = [sourcePath, harnessPath, path.join(repoRoot, 'ci/java_invocation_evolution_contract_test.mjs'),
    ...['java_class_derivation_test.mjs', 'java_class_structure_test.mjs', 'run_java_compatibility.mjs',
      'prepare_java_compatibility_toolchains.mjs', 'java_compatibility_browser.mjs'].map(name => path.join(repoRoot, 'ci', name)),
    lockPath, markerPath, process.execPath];
  const inputs = () => inputPaths.map(filename => ({path: filename, sha256: digest(fs.readFileSync(filename))}));
  const inputDigests = inputs();
  const checkJdks = () => marker.toolchains.forEach(prepared => assert.equal(treeDigest(prepared.home),
    lock.toolchains.find(entry => entry.id === prepared.id).treeSha256, `${prepared.id}: immutable locked toolchain`));
  checkJdks();
  const runnerPath = path.join(repoRoot, 'build/release-cli/console/runner.js');
  const runtime = nativeOnly ? null : runtimeSnapshot(repoRoot, runnerPath);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-invocation-evolution-'));
  fs.chmodSync(temporaryRoot, 0o700);
  const results = [], guestHosts = nativeOnly ? [] : browser ? ['node', 'chromium'] : ['node'];
  let session;
  try {
    if (browser) {
      const {createBrowserSession} = await import('./java_compatibility_browser.mjs');
      session = await createBrowserSession({repoRoot});
    }
    const emptySourcepath = path.join(temporaryRoot, 'empty-sourcepath');
    fs.mkdirSync(emptySourcepath);
    for (const release of [21, 25]) {
      const prepared = marker.toolchains.find(entry => entry.feature === release);
      const releaseRoot = path.join(temporaryRoot, `release${release}`), directory = path.join(releaseRoot, 'runtime');
      fs.mkdirSync(directory, {recursive: true});
      const record = {release, status: 'running', cases: invocationEvolutionCases(), operations: [], sources: [], stages: [], payloads: [], executions: []};
      results.push(record); onRelease(record);
      const compile = async (stage, sources, output, classpath) => {
        const operation = {stage, sources, destination: output, classpath, sourcepath: emptySourcepath,
          command: path.join(prepared.home, 'bin/javac'), arguments: ['--release', String(release), '-encoding', 'UTF-8', '-proc:none', '-g',
            '-classpath', classpath, '-sourcepath', emptySourcepath, '-d', output, ...sources]};
        record.operations.push(operation);
        operation.result = await runCommand(operation.command, operation.arguments, {cwd: releaseRoot, timeoutMs: 60_000});
        completed(operation.result, `genuine ${stage} Java ${release}`);
        assert.equal(operation.result.exitCode, 0, operation.result.stderr);
        assert.equal(operation.result.stdout + operation.result.stderr, '', 'Clean genuine compiler output');
      };
      await compile('driver', [sourcePath], directory, emptySourcepath);
      record.driverClasses = inspectClassFiles(directory, release, mainClass);
      const driverTree = treeDigest(directory);
      for (const stage of invocationEvolutionSources()) {
        const output = path.join(releaseRoot, `${stage.stage}-classes`);
        fs.mkdirSync(output);
        const sourceFiles = [];
        for (const source of stage.sources) {
          const filename = path.join(releaseRoot, 'sources', stage.stage, `${source.binaryName.replaceAll('.', '/')}.java`);
          fs.mkdirSync(path.dirname(filename), {recursive: true});
          fs.writeFileSync(filename, source.text, {mode: 0o600});
          record.sources.push({...source, stage: stage.stage, path: filename, sha256: digest(source.text)});
          sourceFiles.push(filename);
        }
        const baseline = record.stages.find(entry => entry.stage === 'baseline');
        await compile(stage.stage, sourceFiles, output, [directory, ...(baseline ? [baseline.directory] : [])].join(path.delimiter));
        assert.equal(treeDigest(directory), driverTree, 'Payload compilation cannot alter the driver');
        if (baseline) assert.equal(treeDigest(baseline.directory), baseline.treeSha256, 'Replacement javac cannot alter original callers or owners');
        const originals = inspectClassFiles(output, release, stage.sources[0].binaryName);
        assert.deepEqual(originals.map(entry => entry.path).sort(), stage.sources.map(source => `${source.binaryName.replaceAll('.', '/')}.class`).sort(),
          'Every stage emits only its exact planned genuine classes');
        record.stages.push({stage: stage.stage, directory: output, treeSha256: treeDigest(output), originals});
      }
      const baseline = record.stages[0], evolved = record.stages[1];
      const permitted = invocationEvolutionSources()[1].sources.map(source => `${source.binaryName.replaceAll('.', '/')}.class`);
      record.evolution = {allowedReplacements: permitted, oldCallers: assertInvocationEvolution(baseline.originals, evolved.originals, permitted),
        oldReceivers: baseline.originals.filter(entry => /(Impl|Override)\.class$/.test(entry.path)),
        baselineTreeSha256: baseline.treeSha256, unchangedDriverTreeSha256: driverTree, separateCompilation: true};
      for (const source of record.sources) {
        const stage = record.stages.find(entry => entry.stage === source.stage);
        const relative = `${source.binaryName.replaceAll('.', '/')}.class`;
        const original = stage.originals.find(entry => entry.path === relative), bytes = fs.readFileSync(path.join(stage.directory, relative));
        const resourcePath = `invocation-evolution-cases/${source.stage}/${source.binaryName.replaceAll('.', '/')}.bin`;
        const filename = path.join(directory, resourcePath);
        fs.mkdirSync(path.dirname(filename), {recursive: true});
        fs.writeFileSync(filename, bytes, {mode: 0o600});
        record.payloads.push({id: `${source.stage}:${source.binaryName}`, stage: source.stage, binaryName: source.binaryName,
          kind: 'genuine-compiler-output', edits: [], sourceSha256: source.sha256, original,
          declarations: inspectInvocationEvolutionPayload(bytes, source.binaryName),
          resource: {path: resourcePath, size: bytes.length, sha256: digest(bytes), major: bytes.readUInt16BE(6), minor: bytes.readUInt16BE(4)}});
      }
      assert.deepEqual([...new Set(record.cases.flatMap(entry => entry.payloads))].sort(), record.payloads.map(entry => entry.id).sort(),
        'All and only mandatory case payloads are compiled and mounted');
      record.classpath = {directory, separatePayloadCompilationRoots: record.stages.map(stage => stage.directory),
        files: inventory(directory), fallbackPayloadClassFiles: false, treeSha256: treeDigest(directory)};
      const verifyInputs = () => {
        assert.equal(treeDigest(directory), record.classpath.treeSha256, 'Unchanged exact runtime inputs');
        for (const stage of record.stages) assert.equal(treeDigest(stage.directory), stage.treeSha256, 'Unchanged genuine stage ' + stage.stage);
        assert.deepEqual(inspectClassFiles(directory, release, mainClass), record.driverClasses, 'Unchanged genuine driver');
        assertInvocationEvolutionClasspath(inventory(directory), record.driverClasses, record.payloads);
      };
      for (const host of ['native', ...guestHosts]) await checkInvocationEvolutionExecution(record, host, () => {
        const args = [host === 'native' ? 'pinned-native-' + release : 'jvms', ...record.cases.map(entry => entry.id)];
        return host === 'chromium' ? session.execute({classesPath: directory, mainClass, arguments: args, timeoutMs: 120_000, standardInput: ''}) :
          runCommand(host === 'native' ? path.join(prepared.home, 'bin/java') : process.execPath,
            [...(host === 'native' ? [] : ['--no-deprecation', runnerPath]), '-cp', directory, mainClass, ...args],
            {cwd: releaseRoot, timeoutMs: 120_000, standardInput: ''});
      }, verifyInputs);
      record.status = 'passed';
      console.log(`PASS invocation evolution Java ${release}: ${record.cases.length} cases on ${['native', ...guestHosts].join(', ')}; ` +
        (release === 21 ? '1 documented native subtype boundary' : 'all exact native/guest expectations agree'));
    }
    assert.deepEqual(inputs(), inputDigests, 'Unchanged corpus inputs'); checkJdks();
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(repoRoot, runnerPath), runtime, 'Unchanged CLI runtime');
    return {scope: invocationEvolutionLedgerScope, nativeOnly, guestHosts, ...invocationEvolutionOracleBoundary(),
      notRunGuestHosts: ['node', 'chromium'].filter(host => !guestHosts.includes(host)), caseCount: invocationEvolutionCases().length,
      releaseCount: results.length, nativeExecutions: results.length, guestExecutions: results.length * guestHosts.length,
      inputDigests, runtime, browserProvenance: session?.provenance || null, browserIntegrity: session ? session.verifyIntegrity() : null,
      node: {version: process.version, executable: process.execPath, sha256: inputDigests.find(entry => entry.path === process.execPath).sha256},
      toolchains: marker.toolchains.map(({id, feature, version, archiveSha256}) => ({id, feature, version, archiveSha256,
        treeSha256: lock.toolchains.find(entry => entry.id === id).treeSha256})),
      standardInput: {bytes: 0, sha256: digest('')}, phaseBComplete: false, results};
  } catch (error) {
    const pending = results.at(-1);
    if (pending?.status === 'running') { pending.status = 'failed'; pending.error = error.stack || error.message; }
    throw error;
  } finally {
    try { if (session) await session.close(); }
    finally { fs.rmSync(temporaryRoot, {recursive: true, force: true}); }
  }
}

export function writeInvocationEvolutionLedger(filename, ledger) {
  assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.scope, invocationEvolutionLedgerScope);
  assert.ok(['passed', 'failed'].includes(ledger.status));
  fs.mkdirSync(path.dirname(filename), {recursive: true});
  assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink(), 'No symlinked ledger directory');
  let existing;
  try { existing = fs.lstatSync(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing) {
    assert.ok(existing.isFile() && existing.nlink === 1, 'Refusing linked or non-regular ledger');
    const previous = JSON.parse(fs.readFileSync(filename));
    assert.equal(previous.schemaVersion, 1); assert.equal(previous.scope, invocationEvolutionLedgerScope, 'Refusing unrelated ledger');
  }
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(ledger, null, 2)}\n`, {flag: 'wx', mode: 0o600});
    fs.renameSync(temporary, filename);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

async function provenance() {
  const read = async args => {
    const result = await runCommand('git', args, {cwd: repoRoot, timeoutMs: 10_000});
    completed(result, 'Git provenance'); assert.equal(result.exitCode, 0); return result.stdout.trim();
  };
  return {commit: await read(['rev-parse', '--verify', 'HEAD']), trackedDirty: (await read(['status', '--porcelain=v1', '--untracked-files=no'])).length > 0};
}

if (process.argv[1] && path.resolve(process.argv[1]) === harnessPath) {
  const ledger = {schemaVersion: 1, scope: invocationEvolutionLedgerScope, status: 'failed',
    startedAt: new Date().toISOString(), attemptedReleases: []};
  try {
    assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--browser'),
      'Official invocation-evolution gate requires both guest hosts; import the runner for precommit/native-only diagnostics');
    const start = await provenance();
    Object.assign(ledger, {gitCommit: start.commit, gitTrackedDirty: start.trackedDirty});
    assertDerivationProvenance(start, start);
    const summary = await runInvocationEvolutionTests({browser: true, onRelease: record => ledger.attemptedReleases.push(record)});
    const end = await provenance();
    Object.assign(ledger, {gitCommitAtEnd: end.commit, gitTrackedDirtyAtEnd: end.trackedDirty});
    assertDerivationProvenance(start, end);
    Object.assign(ledger, summary, {status: 'passed'}); delete ledger.attemptedReleases;
  } catch (error) {
    ledger.error = error.stack || error.message; console.error(ledger.error); process.exitCode = 1;
  } finally {
    ledger.finishedAt = new Date().toISOString();
    writeInvocationEvolutionLedger(path.join(repoRoot, 'build/java-invocation-evolution-results.json'), ledger);
  }
}

