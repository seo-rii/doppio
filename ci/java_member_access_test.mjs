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
const sourcePath = path.join(repoRoot, 'classes/modern_fixture/JavaMemberAccess.java');
const mainClass = 'classes.modern_test.JavaMemberAccess';
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const b = name => `baseline:${name}`;
const nested = ['nests.Host', 'nests.Host$Member', 'nests.Host$Probe', 'nests.Host$Retained'];
export const memberAccessLedgerScope = 'JVM-002 B4c genuine access, nest identity and sticky symbolic resolution';
export {assertDerivationProvenance as assertMemberAccessProvenance};

export function memberAccessCases() {
  const cases = [];
  const add = (id, kind, caller, owner, stage, split, error, value, effects) => cases.push({id, kind, caller, owner,
    payloads: [b(caller), `${stage}:${owner}`], expectedError: error, expectedPhase: 'invoke',
    expectedValue: value, expectedEffects: effects, trace: ['metadata-ready-no-effects',
      `defining-loaders=${split ? 'distinct' : 'shared'}`, `${error || 'accepted'}@invoke`,
      ...(error ? [] : [`value@invoke=${value}`]), `effects=${effects || 'none'}`]});
  for (const access of ['package', 'protected']) for (const kind of ['field', 'method']) for (const split of [false, true]) {
    const stem = access === 'package' ? 'Package' : 'Protected', field = kind === 'field';
    add(`${access}-${kind}-${split ? 'split' : 'shared'}`, 'runtime-package-member-access',
      `access.${stem}${field ? 'Field' : 'Method'}Caller`, `access.${stem}Owner`, 'baseline', split,
      split ? 'java.lang.IllegalAccessError' : null, String((access === 'package' ? 10 : 20) + (field ? 1 : 2)),
      split ? '' : `${access}-init${field ? '' : `,${access}-method`}`);
  }
  for (const kind of ['field', 'method']) add(`protected-subclass-${kind}`, 'protected-subclass-access',
    `outside.ProtectedSubclass${kind === 'field' ? 'Field' : 'Method'}`, 'access.ProtectedOwner', 'baseline', true,
    null, kind === 'field' ? '21' : '22', `protected-init${kind === 'field' ? '' : ',protected-method'}`);
  for (const array of [false, true]) for (const split of [false, true]) add(`hidden-${array ? 'array' : 'class'}-${split ? 'split' : 'shared'}`,
    array ? 'reference-array-leaf-access' : 'nonpublic-class-access', `access.Hidden${array ? 'Array' : ''}Caller`,
    'access.Hidden', 'baseline', split, split ? 'java.lang.IllegalAccessError' : null,
    array ? 'class:[[Laccess.Hidden;' : 'class:access.Hidden', '');
  for (const array of [false, true]) for (const hidden of [false, true]) add(`evolved-${array ? 'array' : 'class'}-${hidden ? 'hidden' : 'public'}`,
    array ? 'evolved-reference-array-leaf-access' : 'evolved-nonpublic-class-access',
    `outside.Visible${array ? 'Array' : ''}Caller`, 'access.Visible', hidden ? 'hidden' : 'baseline', false,
    hidden ? 'java.lang.IllegalAccessError' : null, array ? 'class:[[Laccess.Visible;' : 'class:access.Visible', '');
  for (const mode of ['valid', 'plain', 'unlisted', 'split']) for (const operation of ['field', 'method', 'constructor']) {
    const valid = mode === 'valid', hostCount = mode === 'plain' ? 1 : mode === 'unlisted' ? 2 : 4;
    const effects = `${valid || operation === 'constructor' ? 'nest-init' : ''}${valid && operation !== 'field' ? `,nest-${operation}` : ''}`;
    cases.push({id: `nest-${operation}-${mode}`, kind: 'nestmate-private-access-and-reflection', mode, operation,
      payloads: nested.map(name => name === 'nests.Host' && ['plain', 'unlisted'].includes(mode) ? `${mode}:${name}` : b(name)),
      expectedError: valid ? null : 'java.lang.IllegalAccessError', expectedPhase: 'invoke', expectedEffects: effects,
      trace: ['metadata-ready-no-effects', `nest-host=${valid ? 'host' : 'self'}`,
        `nest-members=host:${hostCount},member:${valid ? 4 : 1}`, `nestmate=${valid}`,
        `${valid ? 'accepted' : 'java.lang.IllegalAccessError'}@invoke`,
        ...(valid ? [`value@invoke=${operation === 'field' ? 31 : operation === 'method' ? 32 : 33}`] : []),
        `effects=${effects || 'none'}`]});
  }
  cases.push({id: 'nest-host-failure-sticky', kind: 'swallowed-nest-host-failure-retains-shared-class-reference',
    payloads: [...nested, 'nests.FreshHostCaller'].map(b), expectedPhase: 'getNestHost-then-invoke',
    trace: ['load-attempts@self-nestmate=0', 'load-attempts@getNestHost=1', 'nest-host=self-without-throw',
      'metadata-ready-no-effects', 'java.lang.NoClassDefFoundError@same-cp', 'load-attempts@same-cp=1',
      'java.lang.NoClassDefFoundError@retry', 'load-attempts@retry=1', 'accepted@independent',
      'value@independent=class:nests.Host', 'load-attempts@independent=2',
      'java.lang.NoClassDefFoundError@after-publication', 'load-attempts@after-publication=2', 'effects=none']});
  for (const kind of ['class', 'field', 'method']) {
    const stem = kind[0].toUpperCase() + kind.slice(1), value = kind === 'class' ? 'class:retry.Target' : kind === 'field' ? '71' : '72';
    const effects = kind === 'class' ? 'none' : kind === 'field' ? 'retry-init' : 'retry-init,retry-method';
    cases.push({id: `${kind}-resolution-failure-sticky`, kind: 'per-cp-failure-with-independent-caller-control',
      referenceKind: kind, payloads: ['retry.Target', `retry.${stem}Caller`, `retry.Fresh${stem}Caller`].map(b),
      expectedPhase: 'invoke', trace: ['metadata-ready-no-effects', 'load-attempts@prepare=0',
        'java.lang.NoClassDefFoundError@first', 'load-attempts@first=1', 'effects=none',
        'java.lang.NoClassDefFoundError@retry', 'load-attempts@retry=1', 'effects=none',
        'accepted@independent', `value@independent=${value}`, 'load-attempts@independent=2', `effects=${effects}`,
        'java.lang.NoClassDefFoundError@after-publication', 'load-attempts@after-publication=2', `effects=${effects}`]});
  }
  cases.push({id: 'class-resolution-transient-oome', kind: 'transient-vm-error-retries-class-reference',
    payloads: ['retry.Target', 'retry.ClassCaller'].map(b), expectedPhase: 'invoke',
    trace: ['metadata-ready-no-effects', 'load-attempts@prepare=0', 'java.lang.OutOfMemoryError@first',
      'load-attempts@first=1', 'effects=none', 'accepted@retry', 'value@retry=class:retry.Target',
      'load-attempts@retry=2', 'accepted@cached', 'value@cached=class:retry.Target', 'load-attempts@cached=2', 'effects=none']});
  cases.push({id: 'nest-host-transient-oome', kind: 'transient-vm-error-leaves-nest-host-undetermined',
    payloads: ['nests.Host', 'nests.Host$Probe'].map(b), expectedPhase: 'getNestHost-then-invoke',
    trace: ['java.lang.OutOfMemoryError@getNestHost-first', 'load-attempts@first=1', 'effects=none',
      'accepted@getNestHost-retry', 'load-attempts@retry=2', 'nest-host=host-after-retry', 'metadata-ready-no-effects',
      'accepted@same-cp', 'value@same-cp=class:nests.Host', 'load-attempts@same-cp=2',
      'accepted@cached', 'value@cached=class:nests.Host', 'load-attempts@cached=2', 'effects=none']});
  cases.push({id: 'nest-members-transient-oome', kind: 'transient-vm-error-propagates-and-nest-member-retries',
    payloads: nested.map(b), expectedPhase: 'getNestMembers', trace: ['metadata-ready-no-effects',
      'java.lang.OutOfMemoryError@getNestMembers-first', 'load-attempts@first=1', 'effects=none',
      'accepted@getNestMembers-retry', 'nest-members=4', 'load-attempts@retry=2',
      'accepted@getNestMembers-cached', 'load-attempts@cached=2', 'effects=none']});
  return cases.map(entry => ({...entry, packageId: 'JVM-002', mutation: false, throwableIdentityCompared: false,
    ...(entry.id.endsWith('transient-oome') ? {resourceErrorPolicy: {
      id: 'pinned-native-transient-vme', normativeExceptionTiming: false,
      description: 'Selected Java21/25 resource-error policy: injected bootstrap OutOfMemoryError propagates and leaves resolution retryable. JVMS 6.3 permits VME reporting; JVMS 5.4.4 alone does not require this exact error timing.',
      specificationRefs: [21, 25].map(release => `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-6.html#jvms-6.3`),
      implementationRef: 'https://github.com/openjdk/jdk/blob/jdk-25-ga/src/hotspot/share/oops/instanceKlass.cpp#L250'
    }} : {}),
    specificationRefs: Object.fromEntries([21, 25].map(release => [release, ['5.3', '5.4.3', '5.4.3.1', '5.4.4', '5.5']
      .map(section => `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-5.html#jvms-${section}`)]))}));
}

/** Each stage is real javac input. Nested companions emitted while replacing a
 * host are recorded but never substituted for the preserved baseline members. */
export function memberAccessSources() {
  const baseline = [], hidden = [], plain = [], unlisted = [];
  const add = (list, binaryName, body, companions = []) => {
    const separator = binaryName.lastIndexOf('.');
    list.push({binaryName, text: `package ${binaryName.slice(0, separator)}; ${body}\n`, emits: [binaryName, ...companions]});
  };
  const mark = (name, value) => `${mainClass}.mark("${name}", ${value})`;
  for (const [stem, visibility, marker, value] of [['Package', '', 'package', 10], ['Protected', 'protected ', 'protected', 20]]) {
    add(baseline, `access.${stem}Owner`, `public class ${stem}Owner { ${visibility}static int field = ${mark(`${marker}-init`, value + 1)}; ${visibility}static int value() { return ${mark(`${marker}-method`, value + 2)}; } }`);
    for (const kind of ['Field', 'Method']) add(baseline, `access.${stem}${kind}Caller`,
      `public class ${stem}${kind}Caller { public static int run() { return ${stem}Owner.${kind === 'Field' ? 'field' : 'value()'}; } }`);
  }
  for (const kind of ['Field', 'Method']) add(baseline, `outside.ProtectedSubclass${kind}`,
    `public class ProtectedSubclass${kind} extends access.ProtectedOwner { public static int run() { return ${kind === 'Field' ? 'field' : 'value()'}; } }`);
  add(baseline, 'access.Hidden', `class Hidden { static { ${mark('hidden-init', 0)}; } }`);
  add(baseline, 'access.Visible', `public class Visible { static { ${mark('visible-init', 0)}; } }`);
  add(hidden, 'access.Visible', `class Visible { static { ${mark('visible-init', 0)}; } }`);
  for (const name of ['Hidden', 'Visible']) for (const array of [false, true]) {
    const pkg = name === 'Hidden' ? 'access' : 'outside', caller = `${name}${array ? 'Array' : ''}Caller`;
    add(baseline, `${pkg}.${caller}`, `public class ${caller} { public static Class<?> run() { return access.${name}${array ? '[][]' : ''}.class; } }`);
  }
  const hostBody = `private static int secret = ${mark('nest-init', 31)}; private static int value() { return ${mark('nest-method', 32)}; } private Host() { ${mark('nest-constructor', 33)}; }`;
  const member = 'public static class Member { public static int field() { return Host.secret; } public static int method() { return Host.value(); } public static int constructor() { new Host(); return 33; } }';
  const probe = 'public static class Probe { public static Class<?> hostLiteral() { return Host.class; } }';
  add(baseline, 'nests.Host', `public class Host { ${hostBody} ${member} ${probe} public static class Retained {} }`, nested.slice(1));
  add(plain, 'nests.Host', `public class Host { ${hostBody} }`);
  add(unlisted, 'nests.Host', `public class Host { ${hostBody} public static class Retained {} }`, ['nests.Host$Retained']);
  add(baseline, 'nests.FreshHostCaller', 'public class FreshHostCaller { public static Class<?> run() { return Host.class; } }');
  add(baseline, 'retry.Target', `public class Target { public static int field = ${mark('retry-init', 71)}; public static int value() { return ${mark('retry-method', 72)}; } }`);
  for (const kind of ['Class', 'Field', 'Method']) for (const fresh of [false, true]) {
    const name = `${fresh ? 'Fresh' : ''}${kind}Caller`;
    add(baseline, `retry.${name}`, `public class ${name} { public static ${kind === 'Class' ? 'Class<?>' : 'int'} run() { return Target.${kind === 'Class' ? 'class' : kind === 'Field' ? 'field' : 'value()'}; } }`);
  }
  return [{stage: 'baseline', sources: baseline, mount: baseline.flatMap(source => source.emits)},
    {stage: 'hidden', sources: hidden, mount: ['access.Visible']},
    {stage: 'plain', sources: plain, mount: ['nests.Host']},
    {stage: 'unlisted', sources: unlisted, mount: ['nests.Host']}];
}

export function assertMemberAccessCodeProof(declarations, binaryName) {
  const code = (name, descriptor) => {
    const method = declarations.methods.find(entry => entry.name === name && entry.descriptor === descriptor);
    assert.ok(method?.instructionsHex, 'Exact genuine caller method must have Code');
    return Buffer.from(method.instructionsHex, 'hex');
  };
  const member = (instructions, pc, opcode, owner, name, descriptor) => {
    assert.equal(instructions[pc], opcode, 'Executable member opcode at exact instruction boundary');
    const index = instructions.readUInt16BE(pc + 1);
    assert.ok(declarations.references.some(entry => entry.index === index && entry.kind === (opcode === 0xb2 ? 9 : 10) &&
      entry.owner === owner && entry.name === name && entry.descriptor === descriptor), 'Executable CP operand binds exact member identity');
  };
  const classLiteral = (method, owner) => {
    const instructions = code(method, '()Ljava/lang/Class;');
    assert.ok((instructions.length === 3 && instructions[0] === 0x12) ||
      (instructions.length === 4 && instructions[0] === 0x13), 'Exact ldc or ldc_w class literal instruction boundaries');
    assert.equal(instructions.at(-1), 0xb0, 'Exact reference return instruction');
    const index = instructions[0] === 0x12 ? instructions[1] : instructions.readUInt16BE(1);
    assert.ok(declarations.classReferences.some(entry => entry.index === index && entry.name === owner),
      'Executable literal CP operand binds exact class or array leaf');
    return index;
  };
  const memberCallers = {};
  for (const stem of ['Package', 'Protected']) for (const kind of ['Field', 'Method']) memberCallers[`access.${stem}${kind}Caller`] =
    [`access/${stem}Owner`, kind === 'Field'];
  for (const kind of ['Field', 'Method']) memberCallers[`outside.ProtectedSubclass${kind}`] =
    [`outside/ProtectedSubclass${kind}`, kind === 'Field'];
  for (const prefix of ['', 'Fresh']) for (const kind of ['Field', 'Method']) memberCallers[`retry.${prefix}${kind}Caller`] =
    ['retry/Target', kind === 'Field'];
  if (memberCallers[binaryName]) {
    const [owner, field] = memberCallers[binaryName], instructions = code('run', '()I');
    assert.equal(instructions.length, 4, 'Exact member access and integer return boundaries');
    member(instructions, 0, field ? 0xb2 : 0xb8, owner, field ? 'field' : 'value', field ? 'I' : '()I');
    assert.equal(instructions[3], 0xac, 'Exact integer return instruction');
  }
  const literals = {'access.HiddenCaller': 'access/Hidden', 'access.HiddenArrayCaller': '[[Laccess/Hidden;',
    'outside.VisibleCaller': 'access/Visible', 'outside.VisibleArrayCaller': '[[Laccess/Visible;',
    'retry.ClassCaller': 'retry/Target', 'retry.FreshClassCaller': 'retry/Target', 'nests.FreshHostCaller': 'nests/Host'};
  if (literals[binaryName]) classLiteral('run', literals[binaryName]);
  if (binaryName === 'nests.Host$Probe') assert.equal(classLiteral('hostLiteral', 'nests/Host'), declarations.nestHost?.index,
    'NestHost and ordinary host literal must share the SAME genuine class CP entry');
  if (binaryName === 'nests.Host$Member') {
    for (const operation of ['field', 'method']) {
      const instructions = code(operation, '()I');
      assert.equal(instructions.length, 4, 'Exact private member access instruction boundaries');
      member(instructions, 0, operation === 'field' ? 0xb2 : 0xb8, 'nests/Host',
        operation === 'field' ? 'secret' : 'value', operation === 'field' ? 'I' : '()I');
      assert.equal(instructions[3], 0xac);
    }
    const instructions = code('constructor', '()I');
    assert.equal(instructions.length, 11, 'Exact new, dup, private constructor call, pop and integer return boundaries');
    assert.equal(instructions[0], 0xbb);
    assert.ok(declarations.classReferences.some(entry => entry.index === instructions.readUInt16BE(1) && entry.name === 'nests/Host'),
      'Executable new CP operand binds the real nest host');
    assert.equal(instructions[3], 0x59);
    member(instructions, 4, 0xb7, 'nests/Host', '<init>', '()V');
    assert.deepEqual([...instructions.subarray(7)], [0x57, 0x10, 33, 0xac]);
  }
  return declarations;
}

export function inspectMemberAccessPayload(bytes, binaryName) {
  const layout = readStructureLayout(bytes), utf = index => layout.pool[index].value;
  const className = index => utf(layout.pool[index].first);
  const nestHost = layout.attributes.entries.find(entry => entry.name === 'NestHost');
  const nestMembers = layout.attributes.entries.find(entry => entry.name === 'NestMembers');
  const declarations = {flags: layout.flags,
    fields: layout.fields.entries.map(({name, descriptor, flags}) => ({name, descriptor, flags})),
    methods: layout.methods.entries.map(({name, descriptor, flags, code}) => ({name, descriptor, flags,
      ...(code ? {instructionsHex: bytes.subarray(code.instructionsOffset, code.instructionsOffset + code.codeLength).toString('hex')} : {})})),
    classReferences: layout.pool.flatMap((entry, index) => entry?.tag === 7 ? [{index, name: utf(entry.first)}] : []),
    references: layout.pool.flatMap((entry, index) => entry && [9, 10, 11].includes(entry.tag) ? [{index, kind: entry.tag,
      owner: className(entry.first), name: utf(layout.pool[entry.second].first), descriptor: utf(layout.pool[entry.second].second)}] : []),
    nestHost: nestHost ? {index: bytes.readUInt16BE(nestHost.body), name: className(bytes.readUInt16BE(nestHost.body))} : null,
    nestMembers: nestMembers ? Array.from({length: bytes.readUInt16BE(nestMembers.body)}, (_, index) =>
      className(bytes.readUInt16BE(nestMembers.body + 2 + index * 2))) : null};
  return assertMemberAccessCodeProof(declarations, binaryName);
}

export function assertMemberAccessEvolution(stages) {
  const plans = memberAccessSources();
  assert.deepEqual(stages.map(stage => stage.stage), plans.map(stage => stage.stage), 'Exact genuine compilation stages');
  const baseline = new Map(stages[0].originals.map(entry => [entry.path, entry]));
  const replacements = [];
  for (let index = 0; index < stages.length; index++) {
    const stage = stages[index], plan = plans[index];
    assert.deepEqual(stage.originals.map(entry => entry.path).sort(), plan.sources.flatMap(source => source.emits)
      .map(name => `${name.replaceAll('.', '/')}.class`).sort(), 'Exact javac output inventory including unmounted companions');
    if (!index) continue;
    for (const name of plan.mount) {
      const filename = `${name.replaceAll('.', '/')}.class`, original = baseline.get(filename), replacement = stage.originals.find(entry => entry.path === filename);
      assert.ok(original && replacement, 'Every evolved owner has a genuine baseline and replacement');
      assert.notEqual(original.sha256, replacement.sha256, 'Evolution must change owner bytes');
      replacements.push({stage: stage.stage, binaryName: name, originalSha256: original.sha256, replacementSha256: replacement.sha256});
    }
  }
  return {replacements, oldCallersAndNestMembers: stages[0].originals.filter(entry =>
    /Caller\.class$|Subclass(Field|Method)\.class$|Host\$/.test(entry.path)), separateCompilation: true,
    preserveOriginalNestMemberBytes: true, unmountedCompilerOutputs: stages.slice(1).flatMap((stage, index) =>
      stage.originals.filter(entry => !plans[index + 1].mount.includes(entry.path.slice(0, -6).replaceAll('/', '.')))
        .map(entry => ({stage: stage.stage, ...entry})))};
}

function completed(result, label) {
  assert.ok(result && !result.timedOut && !result.outputLimitExceeded && !result.error && !result.signal,
    `${label}: incomplete execution ${JSON.stringify(result)}`);
}

export function assertMemberAccessResult(result, label = 'member access') {
  completed(result, label);
  assert.equal(result.status, 'passed', `${label}: ${result.stderr}`);
  assert.equal(result.exitCode, 0, `${label}: ${result.stderr}`);
  assert.equal(result.stderr.replaceAll('\r\n', '\n'), '', `${label}: stderr`);
  const lines = result.stdout.replaceAll('\r\n', '\n').split('\n');
  const outcomes = memberAccessCases().map(entry => {
    for (const event of entry.trace) assert.equal(lines.shift(), `${entry.id}=${event}`, `${label}: exact ${entry.id} trace`);
    return {id: entry.id, trace: entry.trace};
  });
  assert.deepEqual(lines, ['MEMBER_ACCESS_OK', ''], `${label}: complete mandatory inventory without extra effects`);
  return outcomes;
}

export async function checkMemberAccessExecution(record, host, execute, verifyInputs = () => {}) {
  const evidence = {host, status: 'running'};
  record.executions.push(evidence);
  try {
    assert.ok(['native', 'node', 'chromium'].includes(host), 'Known execution host');
    verifyInputs();
    evidence.result = await execute();
    verifyInputs();
    evidence.outcomes = assertMemberAccessResult(evidence.result, `${host} Java ${record.release}`);
    evidence.status = 'passed';
  } catch (error) {
    evidence.status = record.status = 'failed'; evidence.error = error.stack || error.message; throw error;
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
      files.push({path: path.relative(directory, candidate).split(path.sep).join('/'), size: stat.size, sha256: digest(fs.readFileSync(candidate))});
    }
  };
  visit(directory); return files;
}

export function assertMemberAccessClasspath(files, driverClasses, payloads) {
  assert.deepEqual(driverClasses.map(entry => entry.path).sort(), [
    'classes/modern_test/JavaMemberAccess$PayloadLoader.class', 'classes/modern_test/JavaMemberAccess.class'
  ], 'Only genuine driver classes belong on the runtime classpath');
  assert.ok(payloads.every(entry => entry.resource.path.startsWith('member-access-cases/') && entry.resource.path.endsWith('.bin')));
  const expected = [...driverClasses.map(({path: name, size, sha256}) => ({path: name, size, sha256})),
    ...payloads.map(({resource}) => ({path: resource.path, size: resource.size, sha256: resource.sha256}))];
  const sorted = entries => [...entries].sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(sorted(files), sorted(expected), 'No fallback payload classfile or undeclared runtime resource');
}

export async function runMemberAccessTests({nativeOnly = false, browser = !nativeOnly, onRelease = () => {}} = {}) {
  assert.ok(!nativeOnly || !browser, 'Native-only diagnostic cannot claim browser evidence');
  const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json');
  const markerPath = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
  const lockBytes = fs.readFileSync(lockPath), lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(markerPath));
  validateToolchains(marker, lock, digest(lockBytes), [21, 25]);
  const inputPaths = [sourcePath, harnessPath, path.join(repoRoot, 'ci/java_member_access_contract_test.mjs'),
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
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-member-access-'));
  fs.chmodSync(temporaryRoot, 0o700);
  const results = [], guestHosts = nativeOnly ? [] : browser ? ['node', 'chromium'] : ['node'];
  let session;
  try {
    if (browser) {
      const {createBrowserSession} = await import('./java_compatibility_browser.mjs');
      session = await createBrowserSession({repoRoot});
    }
    const emptySourcepath = path.join(temporaryRoot, 'empty-sourcepath'); fs.mkdirSync(emptySourcepath);
    for (const release of [21, 25]) {
      const prepared = marker.toolchains.find(entry => entry.feature === release);
      const releaseRoot = path.join(temporaryRoot, `release${release}`), directory = path.join(releaseRoot, 'runtime');
      fs.mkdirSync(directory, {recursive: true});
      const record = {release, status: 'running', cases: memberAccessCases(), operations: [], sources: [], stages: [], payloads: [], executions: []};
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
      const plans = memberAccessSources();
      for (const plan of plans) {
        const output = path.join(releaseRoot, `${plan.stage}-classes`); fs.mkdirSync(output);
        const sourceFiles = [];
        for (const source of plan.sources) {
          const filename = path.join(releaseRoot, 'sources', plan.stage, `${source.binaryName.replaceAll('.', '/')}.java`);
          fs.mkdirSync(path.dirname(filename), {recursive: true}); fs.writeFileSync(filename, source.text, {mode: 0o600});
          record.sources.push({...source, stage: plan.stage, path: filename, sha256: digest(source.text)}); sourceFiles.push(filename);
        }
        const baseline = record.stages[0];
        await compile(plan.stage, sourceFiles, output, [directory, ...(baseline ? [baseline.directory] : [])].join(path.delimiter));
        assert.equal(treeDigest(directory), driverTree, 'Payload javac cannot alter genuine driver bytes');
        if (baseline) assert.equal(treeDigest(baseline.directory), baseline.treeSha256, 'Evolution cannot alter original callers or nest members');
        record.stages.push({stage: plan.stage, directory: output, treeSha256: treeDigest(output),
          originals: inspectClassFiles(output, release, plan.sources[0].binaryName)});
      }
      record.evolution = {...assertMemberAccessEvolution(record.stages), unchangedDriverTreeSha256: driverTree};
      for (const plan of plans) for (const binaryName of plan.mount) {
        const stage = record.stages.find(entry => entry.stage === plan.stage);
        const relative = `${binaryName.replaceAll('.', '/')}.class`, original = stage.originals.find(entry => entry.path === relative);
        const source = record.sources.find(entry => entry.stage === stage.stage && entry.emits.includes(binaryName));
        const bytes = fs.readFileSync(path.join(stage.directory, relative));
        const resourcePath = `member-access-cases/${stage.stage}/${binaryName.replaceAll('.', '/')}.bin`, filename = path.join(directory, resourcePath);
        fs.mkdirSync(path.dirname(filename), {recursive: true}); fs.writeFileSync(filename, bytes, {mode: 0o600});
        record.payloads.push({id: `${stage.stage}:${binaryName}`, stage: stage.stage, binaryName, kind: 'genuine-compiler-output', edits: [],
          sourceSha256: source.sha256, original, declarations: inspectMemberAccessPayload(bytes, binaryName),
          resource: {path: resourcePath, size: bytes.length, sha256: digest(bytes), major: bytes.readUInt16BE(6), minor: bytes.readUInt16BE(4)}});
      }
      assert.deepEqual([...new Set(record.cases.flatMap(entry => entry.payloads))].sort(), record.payloads.map(entry => entry.id).sort(),
        'All and only mandatory payload bytes are mounted');
      record.classpath = {directory, separatePayloadCompilationRoots: record.stages.map(stage => stage.directory), files: inventory(directory),
        fallbackPayloadClassFiles: false, treeSha256: treeDigest(directory)};
      const verifyInputs = () => {
        assert.equal(treeDigest(directory), record.classpath.treeSha256, 'Unchanged exact runtime inputs');
        for (const stage of record.stages) assert.equal(treeDigest(stage.directory), stage.treeSha256, 'Unchanged genuine compilation ' + stage.stage);
        assert.deepEqual(inspectClassFiles(directory, release, mainClass), record.driverClasses, 'Unchanged genuine driver');
        assertMemberAccessClasspath(inventory(directory), record.driverClasses, record.payloads);
      };
      for (const host of ['native', ...guestHosts]) await checkMemberAccessExecution(record, host, () => {
        const args = record.cases.map(entry => entry.id);
        return host === 'chromium' ? session.execute({classesPath: directory, mainClass, arguments: args, timeoutMs: 120_000, standardInput: ''}) :
          runCommand(host === 'native' ? path.join(prepared.home, 'bin/java') : process.execPath,
            [...(host === 'native' ? [] : ['--no-deprecation', runnerPath]), '-cp', directory, mainClass, ...args],
            {cwd: releaseRoot, timeoutMs: 120_000, standardInput: ''});
      }, verifyInputs);
      record.status = 'passed';
      console.log(`PASS member access Java ${release}: ${record.cases.length} cases on ${['native', ...guestHosts].join(', ')}`);
    }
    assert.deepEqual(inputs(), inputDigests, 'Unchanged corpus inputs'); checkJdks();
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(repoRoot, runnerPath), runtime, 'Unchanged CLI runtime');
    return {scope: memberAccessLedgerScope, nativeOnly, guestHosts, notRunGuestHosts: ['node', 'chromium'].filter(host => !guestHosts.includes(host)),
      caseCount: memberAccessCases().length, releaseCount: results.length, nativeExecutions: results.length, guestExecutions: results.length * guestHosts.length,
      inputDigests, runtime, browserProvenance: session?.provenance || null, browserIntegrity: session ? session.verifyIntegrity() : null,
      node: {version: process.version, executable: process.execPath, sha256: inputDigests.find(entry => entry.path === process.execPath).sha256},
      toolchains: marker.toolchains.map(({id, feature, version, archiveSha256}) => ({id, feature, version, archiveSha256,
        treeSha256: lock.toolchains.find(entry => entry.id === id).treeSha256})),
      standardInput: {bytes: 0, sha256: digest('')}, phaseBComplete: false, results};
  } catch (error) {
    const pending = results.at(-1); if (pending?.status === 'running') { pending.status = 'failed'; pending.error = error.stack || error.message; }
    throw error;
  } finally {
    try { if (session) await session.close(); }
    finally { fs.rmSync(temporaryRoot, {recursive: true, force: true}); }
  }
}

export function writeMemberAccessLedger(filename, ledger) {
  assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.scope, memberAccessLedgerScope);
  assert.ok(['passed', 'failed'].includes(ledger.status)); fs.mkdirSync(path.dirname(filename), {recursive: true});
  assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink(), 'No symlinked ledger directory');
  let existing;
  try { existing = fs.lstatSync(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing) {
    assert.ok(existing.isFile() && existing.nlink === 1, 'Refusing linked or non-regular ledger');
    const previous = JSON.parse(fs.readFileSync(filename));
    assert.equal(previous.schemaVersion, 1); assert.equal(previous.scope, memberAccessLedgerScope, 'Refusing unrelated ledger');
  }
  const temporary = `${filename}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(ledger, null, 2)}\n`, {flag: 'wx', mode: 0o600}); fs.renameSync(temporary, filename);
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
  const ledger = {schemaVersion: 1, scope: memberAccessLedgerScope, status: 'failed', startedAt: new Date().toISOString(), attemptedReleases: []};
  try {
    assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--browser'),
      'Official member-access gate requires both guest hosts; import for precommit/native-only diagnostics');
    const start = await provenance(); Object.assign(ledger, {gitCommit: start.commit, gitTrackedDirty: start.trackedDirty});
    assertDerivationProvenance(start, start);
    const summary = await runMemberAccessTests({browser: true, onRelease: record => ledger.attemptedReleases.push(record)});
    const end = await provenance(); Object.assign(ledger, {gitCommitAtEnd: end.commit, gitTrackedDirtyAtEnd: end.trackedDirty});
    assertDerivationProvenance(start, end); Object.assign(ledger, summary, {status: 'passed'}); delete ledger.attemptedReleases;
  } catch (error) {
    ledger.error = error.stack || error.message; console.error(ledger.error); process.exitCode = 1;
  } finally {
    ledger.finishedAt = new Date().toISOString(); writeMemberAccessLedger(path.join(repoRoot, 'build/java-member-access-results.json'), ledger);
  }
}
