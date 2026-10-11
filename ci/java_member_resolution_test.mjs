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
const sourcePath = path.join(repoRoot, 'classes/modern_fixture/JavaMemberResolution.java');
const mainClass = 'classes.modern_test.JavaMemberResolution';
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const full = name => `members.${name}`, b = name => `baseline:${full(name)}`, e = name => `evolved:${full(name)}`;
export const memberResolutionLedgerScope = 'JVM-002 B4c genuine exact member descriptors, lookup order and symbolic owner kinds';
export {assertDerivationProvenance as assertMemberResolutionProvenance};

export function memberResolutionCases() {
  const cases = [];
  const add = (id, kind, caller, payloads, error, value, effects, section) => cases.push({id, kind, caller: full(caller),
    payloads: [b(caller), ...payloads], expectedError: error, expectedValue: value, expectedEffects: effects,
    trace: ['metadata-ready-no-effects', `${error || 'accepted'}@invoke`, ...(error ? [] : [`value=${value}`]),
      `effects=${effects || 'none'}`], section});
  add('declared-field-positive', 'exact-field-descriptor', 'TypeCaller', [b('TypeOwner')], null, 10, 'type-owner', '5.4.3.2');
  add('declared-field-descriptor-change', 'exact-field-descriptor', 'TypeCaller', [e('TypeOwner')], 'java.lang.NoSuchFieldError', null, '', '5.4.3.2');
  add('missing-field-positive', 'missing-field', 'GoneFieldCaller', [b('GoneFieldOwner')], null, 11, 'gone-field', '5.4.3.2');
  add('missing-field-evolved', 'missing-field', 'GoneFieldCaller', [e('GoneFieldOwner')], 'java.lang.NoSuchFieldError', null, '', '5.4.3.2');
  add('inherited-field-positive', 'superclass-exact-descriptor', 'InheritedCaller', [b('FieldChild'), b('FieldParent')], null, 20, 'field-parent', '5.4.3.2');
  add('inherited-field-different-descriptor', 'superclass-exact-descriptor', 'InheritedCaller', [e('FieldChild'), b('FieldParent')], null, 20, 'field-parent', '5.4.3.2');
  for (const [id, owner, superclass, second, value, effects] of [
    ['interface-field-positive', b('InterfaceOwner'), b('InterfaceSuper'), b('Second'), 41, 'first'],
    ['interface-field-second-added', b('InterfaceOwner'), b('InterfaceSuper'), e('Second'), 41, 'first'],
    ['interface-field-reversed', e('InterfaceOwner'), b('InterfaceSuper'), e('Second'), 42, 'second'],
    ['interface-field-before-superclass', b('InterfaceOwner'), e('InterfaceSuper'), b('Second'), 41, 'first']
  ]) add(id, 'recursive-interface-field-order', 'InterfaceFieldCaller', [owner, superclass, b('First'), second], null, value, effects, '5.4.3.2');
  add('class-method-positive', 'methodref-owner-kind', 'ClassCaller', [b('ClassOwner')], null, 51, 'class-owner-init,class-method', '5.4.3.3');
  add('methodref-owner-interface', 'methodref-owner-kind', 'ClassCaller', [e('ClassOwner')], 'java.lang.IncompatibleClassChangeError', null, '', '5.4.3.3');
  add('missing-class-method-positive', 'missing-class-method', 'GoneMethodCaller', [b('GoneMethodOwner')], null, 52, 'gone-method-init,gone-method', '5.4.3.3');
  add('missing-class-method-evolved', 'missing-class-method', 'GoneMethodCaller', [e('GoneMethodOwner')], 'java.lang.NoSuchMethodError', null, '', '5.4.3.3');
  add('interface-method-positive', 'interfacemethodref-owner-kind', 'InterfaceCaller', [b('Role')], 'java.lang.NullPointerException', null, '', '5.4.3.4');
  add('interfacemethodref-owner-class', 'interfacemethodref-owner-kind', 'InterfaceCaller', [e('Role')], 'java.lang.IncompatibleClassChangeError', null, '', '5.4.3.4');
  add('missing-interface-method-positive', 'missing-interface-method', 'GoneInterfaceCaller', [b('GoneRole')], 'java.lang.NullPointerException', null, '', '5.4.3.4');
  add('missing-interface-method-evolved', 'missing-interface-method', 'GoneInterfaceCaller', [e('GoneRole')], 'java.lang.NoSuchMethodError', null, '', '5.4.3.4');
  add('fieldref-owner-class-positive', 'fieldref-permits-both-owner-kinds', 'FieldKindCaller', [b('FieldKindOwner')], null, 12, 'field-kind', '5.4.3.2');
  add('fieldref-owner-interface-positive', 'fieldref-permits-both-owner-kinds', 'FieldKindCaller', [e('FieldKindOwner')], null, 12, 'field-kind', '5.4.3.2');
  for (const iface of [false, true]) {
    const name = iface ? 'interface' : 'class';
    cases.push({id: `independent-${name}-identity`, kind: 'same-name-defining-loader-identity', section: '5.4.3.2',
      caller: full(iface ? 'InterfaceFieldCaller' : 'IdentityCaller'),
      payloads: iface ? [b('InterfaceFieldCaller'), b('InterfaceOwner'), b('InterfaceSuper'), b('First'), e('First'), b('Second')] :
        [b('IdentityCaller'), b('IdentityOwner'), e('IdentityOwner')],
      trace: ['metadata-ready-no-effects', `same-name-${name}-identities-distinct`, 'accepted@invoke-a', `value-a=${iface ? 41 : 71}`,
        'accepted@invoke-b', `value-b=${iface ? 43 : 72}`, `effects=${iface ? 'first,first' : 'identity-owner,identity-owner'}`]});
  }
  return cases.map(entry => ({...entry, packageId: 'JVM-002', mutation: false, expectedPhase: 'invoke',
    specificationRefs: Object.fromEntries([21, 25].map(release => [release,
      ['5.3', entry.section, '5.5'].map(section => `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-5.html#jvms-${section}`)]))}));
}

/** Stage two contains replacement owners only; old callers are never recompiled. */
export function memberResolutionSources() {
  const baseline = [], evolved = [];
  const add = (list, name, body) => list.push({binaryName: full(name), text: `package members; ${body}\n`});
  const mark = (name, value) => `${mainClass}.mark("${name}", ${value})`;
  const field = (name, marker, value, type = 'int', iface = false) =>
    `public ${iface ? 'interface' : 'class'} ${name} { public static ${iface ? 'final ' : ''}${type} value = ${mark(marker, value)}; }`;
  const caller = (name, body) => add(baseline, name, `public class ${name} { public static int run() { return ${body}; } }`);
  add(baseline, 'TypeOwner', field('TypeOwner', 'type-owner', 10));
  add(evolved, 'TypeOwner', field('TypeOwner', 'type-owner', 10, 'long'));
  caller('TypeCaller', 'TypeOwner.value');
  add(baseline, 'GoneFieldOwner', field('GoneFieldOwner', 'gone-field', 11));
  add(evolved, 'GoneFieldOwner', `public class GoneFieldOwner { static { ${mark('gone-field', 11)}; } }`);
  caller('GoneFieldCaller', 'GoneFieldOwner.value');
  add(baseline, 'FieldParent', field('FieldParent', 'field-parent', 20));
  add(baseline, 'FieldChild', `public class FieldChild extends FieldParent { static { ${mark('field-child', 30)}; } }`);
  add(evolved, 'FieldChild', `public class FieldChild extends FieldParent { public static long value = ${mark('field-child', 30)}; }`);
  caller('InheritedCaller', 'FieldChild.value');
  add(baseline, 'First', field('First', 'first', 41, 'int', true));
  add(evolved, 'First', field('First', 'first', 43, 'int', true));
  add(baseline, 'Second', 'public interface Second {}');
  add(evolved, 'Second', field('Second', 'second', 42, 'int', true));
  add(baseline, 'InterfaceSuper', `public class InterfaceSuper { static { ${mark('interface-super', 44)}; } }`);
  add(evolved, 'InterfaceSuper', field('InterfaceSuper', 'interface-super', 44));
  add(baseline, 'InterfaceOwner', `public class InterfaceOwner extends InterfaceSuper implements First, Second { static { ${mark('interface-owner', 40)}; } }`);
  add(evolved, 'InterfaceOwner', `public class InterfaceOwner extends InterfaceSuper implements Second, First { static { ${mark('interface-owner', 40)}; } }`);
  caller('InterfaceFieldCaller', 'InterfaceOwner.value');
  add(baseline, 'ClassOwner', `public class ClassOwner { static { ${mark('class-owner-init', 50)}; } public static int value() { return ${mark('class-method', 51)}; } }`);
  add(evolved, 'ClassOwner', `public interface ClassOwner { int MARK = ${mark('class-owner-init', 50)}; public static int value() { return ${mark('class-method', 51)}; } }`);
  caller('ClassCaller', 'ClassOwner.value()');
  add(baseline, 'GoneMethodOwner', `public class GoneMethodOwner { static { ${mark('gone-method-init', 50)}; } public static int value() { return ${mark('gone-method', 52)}; } }`);
  add(evolved, 'GoneMethodOwner', `public class GoneMethodOwner { static { ${mark('gone-method-init', 50)}; } }`);
  caller('GoneMethodCaller', 'GoneMethodOwner.value()');
  for (const [name, call] of [['Role', 'InterfaceCaller'], ['GoneRole', 'GoneInterfaceCaller']]) {
    add(baseline, name, `public interface ${name} { int MARK = ${mark('role-init', 60)}; default int value() { return ${mark('interface-method', 61)}; } }`);
    add(evolved, name, name === 'Role' ?
      `public class Role { static { ${mark('role-init', 60)}; } public int value() { return ${mark('interface-method', 61)}; } }` :
      `public interface GoneRole { int MARK = ${mark('role-init', 60)}; }`);
    caller(call, `((${name}) null).value()`);
  }
  add(baseline, 'FieldKindOwner', field('FieldKindOwner', 'field-kind', 12));
  add(evolved, 'FieldKindOwner', field('FieldKindOwner', 'field-kind', 12, 'int', true));
  caller('FieldKindCaller', 'FieldKindOwner.value');
  add(baseline, 'IdentityOwner', field('IdentityOwner', 'identity-owner', 71));
  add(evolved, 'IdentityOwner', field('IdentityOwner', 'identity-owner', 72));
  caller('IdentityCaller', 'IdentityOwner.value');
  return [{stage: 'baseline', sources: baseline}, {stage: 'evolved', sources: evolved}];
}

const callerReferences = {
  TypeCaller: ['TypeOwner', 9, 'I'], GoneFieldCaller: ['GoneFieldOwner', 9, 'I'],
  InheritedCaller: ['FieldChild', 9, 'I'], InterfaceFieldCaller: ['InterfaceOwner', 9, 'I'],
  ClassCaller: ['ClassOwner', 10, '()I'], GoneMethodCaller: ['GoneMethodOwner', 10, '()I'],
  InterfaceCaller: ['Role', 11, '()I'], GoneInterfaceCaller: ['GoneRole', 11, '()I'],
  FieldKindCaller: ['FieldKindOwner', 9, 'I'], IdentityCaller: ['IdentityOwner', 9, 'I']
};

export function inspectMemberResolutionPayload(bytes, binaryName) {
  const layout = readStructureLayout(bytes), utf = index => layout.pool[index].value;
  const references = layout.pool.flatMap((entry, index) => entry && [9, 10, 11].includes(entry.tag) ? [{
    index, kind: entry.tag, owner: utf(layout.pool[entry.first].first), name: utf(layout.pool[entry.second].first),
    descriptor: utf(layout.pool[entry.second].second)}] : []);
  const expected = callerReferences[binaryName.slice('members.'.length)];
  const methods = layout.methods.entries.map(({name, descriptor, flags, code}) => ({name, descriptor, flags,
    ...(code ? {instructionsHex: bytes.subarray(code.instructionsOffset, code.instructionsOffset + code.codeLength).toString('hex')} : {})}));
  if (expected) {
    const [owner, kind, descriptor] = expected;
    assert.ok(references.some(entry => entry.kind === kind && entry.owner === `members/${owner}` &&
      entry.name === 'value' && entry.descriptor === descriptor), 'Old caller must retain exact javac symbolic owner/tag/descriptor');
    const run = methods.find(method => method.name === 'run' && method.descriptor === '()I');
    assert.ok(run, 'Unchanged zero-argument caller entry');
    const instructions = Buffer.from(run.instructionsHex, 'hex');
    let operand;
    if (kind === 11) {
      assert.ok(instructions.length === 7 || instructions.length === 10,
        'Exact caller instruction boundaries: null, optional owner cast, interface call, integer return');
      assert.equal(instructions[0], 0x01, 'Exact null receiver instruction');
      const pc = instructions.length === 10 ? 4 : 1;
      if (pc === 4) {
        assert.equal(instructions[1], 0xc0, 'Exact checkcast instruction');
        const cast = layout.pool[instructions.readUInt16BE(2)];
        assert.ok(cast?.tag === 7 && utf(cast.first) === `members/${owner}`, 'Executable cast binds expected owner');
      }
      assert.equal(instructions[pc], 0xb9, 'Caller really executes invokeinterface at an instruction boundary');
      assert.deepEqual([...instructions.subarray(pc + 3)], [1, 0, 0xac], 'Exact interface count, reserved byte and return');
      operand = instructions.readUInt16BE(pc + 1);
    } else {
      assert.equal(instructions.length, 4, 'Exact caller instruction boundaries: member access and integer return');
      assert.equal(instructions[0], kind === 9 ? 0xb2 : 0xb8, 'Caller really executes member access at an instruction boundary');
      assert.equal(instructions[3], 0xac, 'Exact integer return instruction');
      operand = instructions.readUInt16BE(1);
    }
    assert.ok(references.some(entry => entry.index === operand && entry.kind === kind &&
      entry.owner === `members/${owner}` && entry.name === 'value' && entry.descriptor === descriptor),
      'Executable CP operand must bind the exact symbolic owner/tag/name/descriptor');
  }
  return {flags: layout.flags, fields: layout.fields.entries.map(({name, descriptor, flags}) => ({name, descriptor, flags})),
    interfaces: Array.from({length: layout.interfaceCount}, (_, index) => utf(layout.pool[bytes.readUInt16BE(layout.interfacesOffset + index * 2)].first)),
    methods, references};
}

export function assertMemberResolutionEvolution(baseline, replacements, permitted) {
  assert.deepEqual(replacements.map(entry => entry.path).sort(), [...permitted].sort(), 'Only exact planned owner replacements may be compiled');
  const originals = new Map(baseline.map(entry => [entry.path, entry]));
  for (const replacement of replacements) {
    assert.ok(originals.has(replacement.path), 'Every replacement has a genuine baseline');
    assert.notEqual(replacement.sha256, originals.get(replacement.path).sha256, 'Evolution must actually change owner bytes');
    assert.ok(!Object.hasOwn(callerReferences, path.basename(replacement.path, '.class')), 'Evolution must never recompile a caller');
  }
  return baseline.filter(entry => Object.hasOwn(callerReferences, path.basename(entry.path, '.class')));
}

function completed(result, label) {
  assert.ok(result && !result.timedOut && !result.outputLimitExceeded && !result.error && !result.signal,
    `${label}: incomplete execution ${JSON.stringify(result)}`);
}

export function assertMemberResolutionResult(result, label = 'member resolution') {
  completed(result, label);
  assert.equal(result.status, 'passed', `${label}: ${result.stderr}`);
  assert.equal(result.exitCode, 0, `${label}: ${result.stderr}`);
  assert.equal(result.stderr.replaceAll('\r\n', '\n'), '', `${label}: stderr`);
  const lines = result.stdout.replaceAll('\r\n', '\n').split('\n');
  const outcomes = memberResolutionCases().map(entry => {
    for (const event of entry.trace) assert.equal(lines.shift(), `${entry.id}=${event}`, `${label}: exact ${entry.id} trace`);
    return {id: entry.id, trace: entry.trace};
  });
  assert.deepEqual(lines, ['MEMBER_RESOLUTION_OK', ''], `${label}: complete mandatory inventory without extra effects`);
  return outcomes;
}

export async function checkMemberResolutionExecution(record, host, execute, verifyInputs = () => {}) {
  const evidence = {host, status: 'running'};
  record.executions.push(evidence);
  try {
    assert.ok(['native', 'node', 'chromium'].includes(host), 'Known execution host');
    verifyInputs();
    evidence.result = await execute();
    verifyInputs();
    evidence.outcomes = assertMemberResolutionResult(evidence.result, `${host} Java ${record.release}`);
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

export function assertMemberResolutionClasspath(files, driverClasses, payloads) {
  assert.deepEqual(driverClasses.map(entry => entry.path).sort(), [
    'classes/modern_test/JavaMemberResolution$PayloadLoader.class', 'classes/modern_test/JavaMemberResolution.class'
  ], 'Only the genuine driver classes belong on the runtime classpath');
  assert.ok(payloads.every(entry => entry.resource.path.startsWith('member-resolution-cases/') && entry.resource.path.endsWith('.bin')));
  const expected = [...driverClasses.map(({path: name, size, sha256}) => ({path: name, size, sha256})),
    ...payloads.map(({resource}) => ({path: resource.path, size: resource.size, sha256: resource.sha256}))];
  const sorted = entries => [...entries].sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(sorted(files), sorted(expected), 'No fallback payload .class or undeclared resource on the runtime classpath');
}

export async function runMemberResolutionTests({nativeOnly = false, browser = !nativeOnly, onRelease = () => {}} = {}) {
  assert.ok(!nativeOnly || !browser, 'Native-only diagnostic cannot claim browser evidence');
  const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json');
  const markerPath = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
  const lockBytes = fs.readFileSync(lockPath), lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(markerPath));
  validateToolchains(marker, lock, digest(lockBytes), [21, 25]);
  const inputPaths = [sourcePath, harnessPath, path.join(repoRoot, 'ci/java_member_resolution_contract_test.mjs'),
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
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-member-resolution-'));
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
      const record = {release, status: 'running', cases: memberResolutionCases(), operations: [], sources: [], stages: [], payloads: [], executions: []};
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
      for (const stage of memberResolutionSources()) {
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
      const permitted = memberResolutionSources()[1].sources.map(source => `${source.binaryName.replaceAll('.', '/')}.class`);
      record.evolution = {allowedReplacements: permitted, oldCallers: assertMemberResolutionEvolution(baseline.originals, evolved.originals, permitted),
        baselineTreeSha256: baseline.treeSha256, unchangedDriverTreeSha256: driverTree, separateCompilation: true};
      for (const source of record.sources) {
        const stage = record.stages.find(entry => entry.stage === source.stage);
        const relative = `${source.binaryName.replaceAll('.', '/')}.class`;
        const original = stage.originals.find(entry => entry.path === relative), bytes = fs.readFileSync(path.join(stage.directory, relative));
        const resourcePath = `member-resolution-cases/${source.stage}/${source.binaryName.replaceAll('.', '/')}.bin`;
        const filename = path.join(directory, resourcePath);
        fs.mkdirSync(path.dirname(filename), {recursive: true});
        fs.writeFileSync(filename, bytes, {mode: 0o600});
        record.payloads.push({id: `${source.stage}:${source.binaryName}`, stage: source.stage, binaryName: source.binaryName,
          kind: 'genuine-compiler-output', edits: [], sourceSha256: source.sha256, original,
          declarations: inspectMemberResolutionPayload(bytes, source.binaryName),
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
        assertMemberResolutionClasspath(inventory(directory), record.driverClasses, record.payloads);
      };
      for (const host of ['native', ...guestHosts]) await checkMemberResolutionExecution(record, host, () => {
        const args = record.cases.map(entry => entry.id);
        return host === 'chromium' ? session.execute({classesPath: directory, mainClass, arguments: args, timeoutMs: 120_000, standardInput: ''}) :
          runCommand(host === 'native' ? path.join(prepared.home, 'bin/java') : process.execPath,
            [...(host === 'native' ? [] : ['--no-deprecation', runnerPath]), '-cp', directory, mainClass, ...args],
            {cwd: releaseRoot, timeoutMs: 120_000, standardInput: ''});
      }, verifyInputs);
      record.status = 'passed';
      console.log(`PASS member resolution Java ${release}: ${record.cases.length} cases on ${['native', ...guestHosts].join(', ')}`);
    }
    assert.deepEqual(inputs(), inputDigests, 'Unchanged corpus inputs'); checkJdks();
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(repoRoot, runnerPath), runtime, 'Unchanged CLI runtime');
    return {scope: memberResolutionLedgerScope, nativeOnly, guestHosts,
      notRunGuestHosts: ['node', 'chromium'].filter(host => !guestHosts.includes(host)), caseCount: memberResolutionCases().length,
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

export function writeMemberResolutionLedger(filename, ledger) {
  assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.scope, memberResolutionLedgerScope);
  assert.ok(['passed', 'failed'].includes(ledger.status));
  fs.mkdirSync(path.dirname(filename), {recursive: true});
  assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink(), 'No symlinked ledger directory');
  let existing;
  try { existing = fs.lstatSync(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing) {
    assert.ok(existing.isFile() && existing.nlink === 1, 'Refusing linked or non-regular ledger');
    const previous = JSON.parse(fs.readFileSync(filename));
    assert.equal(previous.schemaVersion, 1); assert.equal(previous.scope, memberResolutionLedgerScope, 'Refusing unrelated ledger');
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
  const ledger = {schemaVersion: 1, scope: memberResolutionLedgerScope, status: 'failed',
    startedAt: new Date().toISOString(), attemptedReleases: []};
  try {
    assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--browser'),
      'Official member-resolution gate requires both guest hosts; import the runner for precommit/native-only diagnostics');
    const start = await provenance();
    Object.assign(ledger, {gitCommit: start.commit, gitTrackedDirty: start.trackedDirty});
    assertDerivationProvenance(start, start);
    const summary = await runMemberResolutionTests({browser: true, onRelease: record => ledger.attemptedReleases.push(record)});
    const end = await provenance();
    Object.assign(ledger, {gitCommitAtEnd: end.commit, gitTrackedDirtyAtEnd: end.trackedDirty});
    assertDerivationProvenance(start, end);
    Object.assign(ledger, summary, {status: 'passed'}); delete ledger.attemptedReleases;
  } catch (error) {
    ledger.error = error.stack || error.message; console.error(ledger.error); process.exitCode = 1;
  } finally {
    ledger.finishedAt = new Date().toISOString();
    writeMemberResolutionLedger(path.join(repoRoot, 'build/java-member-resolution-results.json'), ledger);
  }
}
