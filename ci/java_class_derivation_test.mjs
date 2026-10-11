import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {inspectClassFiles, runCommand, runtimeSnapshot, validateToolchains} from './run_java_compatibility.mjs';
import {treeDigest} from './prepare_java_compatibility_toolchains.mjs';

const harnessPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(harnessPath), '..');
const sourcePath = path.join(repoRoot, 'classes/modern_fixture/JavaClassDerivation.java');
const mainClass = 'classes.modern_test.JavaClassDerivation';
const parent = 'derivation.p.Parent', role = 'derivation.p.Role', peer = 'derivation.p.Peer';
const child = 'derivation.q.Child', host = 'derivation.p.LookupHost', target = 'derivation.p.LookupTarget';
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const payloadId = (variant, name) => `${variant}/${name}`;
const base = name => payloadId('baseline', name);
export const derivationLedgerScope = 'JVM-002 B4a genuine class derivation, publication and defining/initiating loader identities';

/** Exact complete traces, including the contractual failure phase and publication. */
export function derivationCases() {
  const cases = [];
  const add = (id, kind, payloads, trace) => cases.push({id, kind, payloads, trace});
  for (const [kind, name] of [['class', parent], ['interface', role]]) {
    for (const argument of ['exact', 'null']) add(`named-${kind}-${argument}`, 'name-argument', [base(name)],
      ['accepted@define', 'accepted@resolve', 'identity-preserved', 'no-initialization']);
  }
  for (const [kind, name] of [['class', parent], ['interface', role]]) add(`wrong-name-${kind}`, 'name-argument', [base(name)],
    ['java.lang.NoClassDefFoundError@define', 'not-published', 'retry-accepted@resolve', 'no-initialization']);
  for (const [kind, name] of [['class', parent], ['interface', role]]) {
    for (const first of ['exact', 'null']) for (const second of ['exact', 'null']) {
      add(`duplicate-${kind}-${first}-${second}`, 'duplicate-name-arguments', [base(name)],
        ['accepted@define', 'java.lang.LinkageError@define', 'identity-preserved', 'no-initialization']);
    }
  }
  for (const variant of ['malformed-magic', 'malformed-truncation']) {
    add(`${variant}-repair`, 'explicit-byte-mutation', [base(parent), payloadId(variant, parent)],
      ['java.lang.ClassFormatError@define', 'not-published', 'retry-accepted@resolve', 'no-initialization']);
  }
  for (const [id, parentVariant, roleVariant, error] of [
    ['super-kind-interface', 'parent-interface', 'baseline', 'IncompatibleClassChangeError'],
    ['super-final', 'parent-final', 'baseline', 'IncompatibleClassChangeError'],
    ['super-access-foreign-package', 'parent-package', 'baseline', 'IllegalAccessError'],
    ['interface-kind-class', 'baseline', 'role-class', 'IncompatibleClassChangeError'],
    ['interface-access-foreign-package', 'baseline', 'role-package', 'IllegalAccessError']
  ]) add(id, 'separately-compiled-evolution', [base(child), payloadId('repair', child),
    payloadId(parentVariant, parent), payloadId(roleVariant, role)],
  [`java.lang.${error}@define`, 'not-published', 'repaired@define', 'repaired@resolve', 'no-initialization']);
  for (const [kind, parentVariant, roleVariant] of [
    ['super', 'parent-package', 'baseline'], ['interface', 'baseline', 'role-package']
  ]) add(`${kind}-access-same-loader`, 'same-runtime-package', [base(peer), payloadId(parentVariant, parent), payloadId(roleVariant, role)],
    ['accepted@define', 'accepted@resolve', 'no-initialization']);
  for (const [kind, parentVariant, roleVariant] of [
    ['super', 'parent-package', 'baseline'], ['interface', 'baseline', 'role-package']
  ]) add(`${kind}-access-other-loader`, 'different-runtime-package-loader', [base(peer), payloadId(parentVariant, parent), payloadId(roleVariant, role)],
    ['java.lang.IllegalAccessError@define', 'not-published', 'no-initialization']);
  add('identity-independent', 'defining-loader-identity', [base(child), base(parent), base(role)],
    ['class-interface-identities-distinct', 'no-initialization', 'instance-cast-identities-preserved', 'explicit-initializations=6']);
  add('identity-delegated', 'delegated-loader-identity', [base(child), base(parent), base(role)],
    ['shared-class-interface-identities', 'no-initialization']);
  for (const [kind, name] of [['class', parent], ['interface', role]]) add(`initiating-duplicate-${kind}`, 'initiating-loader-identity', [base(name)],
    ['delegated-initiation-recorded', 'java.lang.LinkageError@define', 'identity-preserved', 'no-initialization']);
  for (const invalid of [false, true]) add(invalid ? 'lookup-invalid-publication' : 'lookup-valid',
    invalid ? 'explicit-byte-mutation' : 'genuine-lookup-control',
    [base(host), base(target), ...(invalid ? [payloadId('lookup-invalid', target)] : [])],
    [`${invalid ? 'java.lang.VerifyError' : 'accepted'}@lookup-define`, 'published-identity-preserved',
      'java.lang.LinkageError@duplicate-define', 'no-initialization']);
  for (const [variant, name] of [['circular-super', parent], ['circular-interface', role]]) add(`${variant}-repair`,
    'explicit-byte-mutation', [base(name), payloadId(variant, name)],
    ['java.lang.ClassCircularityError@define', 'not-published', 'retry-accepted@resolve', 'no-initialization']);
  add('module-descriptor-not-class', 'genuine-module-descriptor', [payloadId('module-descriptor', 'module-info')],
    ['java.lang.NoClassDefFoundError@define', 'not-published', 'java.lang.NoClassDefFoundError@repeat-define', 'no-initialization']);
  for (const rank of [1, 2]) add(`passive-array-rank${rank}`, 'passive-array-of-invalid-component',
    [base(host), base(target), payloadId('lookup-invalid', target)],
    ['java.lang.VerifyError@lookup-define', 'forname-false-array-identity', 'forname-true-array-identity',
      'array-component-chain-and-loader', 'array-instance-identity', 'published-component-retained',
      'java.lang.VerifyError@component-initialize', 'no-initialization']);
  return cases.map(entry => ({...entry, packageId: 'JVM-002', specificationRefs: Object.fromEntries([21, 25].map(release =>
    [release, ['5.3', '5.3.5', '5.4.4', ...(entry.kind === 'passive-array-of-invalid-component' ? ['5.3.3'] : [])].map(section =>
      `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-5.html#jvms-${section}`)]))}));
}

/** Sources, not relabelled headers: every variant is a separate javac operation. */
export function derivationSources() {
  const marker = name => `${mainClass}.initialized("${name}")`;
  const parentSource = (modifier = 'public', kind = 'class') => kind === 'interface' ?
    `package derivation.p; public interface Parent { int MARK = ${marker(parent)}; }\n` :
    `package derivation.p; ${modifier} class Parent { public static int MARK = ${marker(parent)}; public Parent() {} }\n`;
  const roleSource = (modifier = 'public', kind = 'interface') =>
    `package derivation.p; ${modifier} ${kind} Role { public static ${kind === 'interface' ? 'final ' : ''}int MARK = ${marker(role)}; }\n`;
  const childSource = (name, repaired = false) => {
    const split = name.lastIndexOf('.'), simple = name.slice(split + 1);
    return `package ${name.slice(0, split)}; public class ${simple}${repaired ? '' : ' extends derivation.p.Parent implements derivation.p.Role'} { ` +
      `public static int MARK = ${marker(name)}; public ${simple}() {} }\n`;
  };
  return [
    {variant: 'baseline', sources: [
      {binaryName: parent, text: parentSource()}, {binaryName: role, text: roleSource()},
      {binaryName: peer, text: childSource(peer)}, {binaryName: child, text: childSource(child)},
      {binaryName: host, text: 'package derivation.p; public class LookupHost { public static java.lang.invoke.MethodHandles.Lookup lookup() { return java.lang.invoke.MethodHandles.lookup(); } }\n'},
      {binaryName: target, text: `package derivation.p; public class LookupTarget { public static int MARK = ${marker(target)}; public static int integerProbe() { return 5; } }\n`}
    ]},
    {variant: 'parent-interface', sources: [{binaryName: parent, text: parentSource('public', 'interface')}]},
    {variant: 'parent-final', sources: [{binaryName: parent, text: parentSource('public final')}]},
    {variant: 'parent-package', sources: [{binaryName: parent, text: parentSource('')}]},
    {variant: 'role-class', sources: [{binaryName: role, text: roleSource('public', 'class')}]},
    {variant: 'role-package', sources: [{binaryName: role, text: roleSource('')}]},
    {variant: 'repair', sources: [{binaryName: child, text: childSource(child, true)}]},
    {variant: 'module-descriptor', sources: [{binaryName: 'module-info', text: 'module doppio.derivation.fixture {}\n'}]}
  ];
}

export function mutateDerivation(original, variant) {
  const layout = readStructureLayout(original);
  let edit;
  switch (variant) {
    case 'malformed-magic': edit = {offset: 0, removeBytes: 1, insertHex: '00', reason: 'Invalid class magic, genuine version bytes unchanged'}; break;
    case 'malformed-truncation': edit = {offset: original.length - 1, removeBytes: 1, insertHex: '', reason: 'Truncate the final declared class attribute byte'}; break;
    case 'circular-super': {
      const index = Buffer.alloc(2); index.writeUInt16BE(layout.thisClass);
      edit = {offset: layout.superClassOffset, removeBytes: 2, insertHex: index.toString('hex'), reason: 'Superclass points to this_class, preserving genuine class version'};
      break;
    }
    case 'circular-interface': {
      assert.equal(layout.interfaceCount, 0, 'Genuine control has no superinterfaces');
      const replacement = Buffer.alloc(4); replacement.writeUInt16BE(1); replacement.writeUInt16BE(layout.thisClass, 2);
      edit = {offset: layout.interfacesOffset - 2, removeBytes: 2, insertHex: replacement.toString('hex'), reason: 'One direct superinterface points to this_class'};
      break;
    }
    case 'lookup-invalid': {
      const method = layout.methods.entries.find(entry => entry.name === 'integerProbe' && entry.descriptor === '()I');
      assert.ok(method?.code, 'Genuine LookupTarget integerProbe()I');
      assert.deepEqual(original.subarray(method.code.instructionsOffset, method.code.instructionsOffset + method.code.codeLength),
        Buffer.from([0x08, 0xac]), 'Genuine integerProbe uses iconst_5 and ireturn');
      edit = {offset: method.code.instructionsOffset, removeBytes: 1, insertHex: '0b', reason: 'fconst_0 cannot satisfy integerProbe()I ireturn'};
      break;
    }
    default: assert.fail(`Unknown derivation mutation: ${variant}`);
  }
  edit.beforeHex = original.subarray(edit.offset, edit.offset + edit.removeBytes).toString('hex');
  return {bytes: Buffer.concat([original.subarray(0, edit.offset), Buffer.from(edit.insertHex, 'hex'),
    original.subarray(edit.offset + edit.removeBytes)]), edits: [edit]};
}

function completed(result, label) {
  assert.ok(result && !result.timedOut && !result.outputLimitExceeded && !result.error && !result.signal,
    `${label}: incomplete execution ${JSON.stringify(result)}`);
}

export function assertDerivationResult(result, label = 'class derivation') {
  completed(result, label);
  assert.equal(result.status, 'passed', `${label}: ${result.stderr}`);
  assert.equal(result.exitCode, 0, `${label}: ${result.stderr}`);
  assert.equal(result.stderr.replaceAll('\r\n', '\n'), '', `${label}: stderr`);
  const lines = result.stdout.replaceAll('\r\n', '\n').split('\n');
  const outcomes = derivationCases().map(entry => {
    for (const event of entry.trace) assert.equal(lines.shift(), `${entry.id}=${event}`, `${label}: exact ordered trace ${entry.id}`);
    return {id: entry.id, trace: entry.trace};
  });
  assert.deepEqual(lines, ['CLASS_DERIVATION_OK', ''], `${label}: complete corpus without extra initialization/output`);
  return outcomes;
}

export async function checkDerivationExecution(record, host, execute) {
  const evidence = {host, status: 'running'};
  record.executions.push(evidence);
  try {
    evidence.result = await execute();
    evidence.outcomes = assertDerivationResult(evidence.result, `${host} Java ${record.release}`);
    evidence.status = 'passed';
  } catch (error) {
    evidence.status = record.status = 'failed';
    evidence.error = error.stack || error.message;
    throw error;
  }
}

function inventory(directory) {
  const result = [];
  const visit = candidate => {
    const stat = fs.lstatSync(candidate);
    assert.ok(!stat.isSymbolicLink(), 'No linked classpath inputs');
    if (stat.isDirectory()) for (const name of fs.readdirSync(candidate).sort()) visit(path.join(candidate, name));
    else {
      assert.ok(stat.isFile(), 'Regular classpath inputs only');
      result.push({path: path.relative(directory, candidate).split(path.sep).join('/'), size: stat.size,
        sha256: digest(fs.readFileSync(candidate))});
    }
  };
  visit(directory);
  return result;
}

export function assertDerivationClasspath(files, driverClasses, payloads) {
  assert.deepEqual(driverClasses.map(entry => entry.path).sort(), [
    'classes/modern_test/JavaClassDerivation$PayloadLoader.class',
    'classes/modern_test/JavaClassDerivation.class'
  ], 'Only the two genuine driver class files may be on the runtime classpath');
  const expected = [...driverClasses.map(({path: filename, size, sha256}) => ({path: filename, size, sha256})),
    ...payloads.map(entry => ({path: entry.resource.path, size: entry.resource.size, sha256: entry.resource.sha256}))]
    .sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual([...files].sort((a, b) => a.path.localeCompare(b.path)), expected,
    'Runtime classpath must contain only exact driver classes and declared resource-only .bin payloads');
  assert.ok(payloads.every(entry => entry.resource.path.startsWith('derivation-cases/') && entry.resource.path.endsWith('.bin')));
}

export async function runClassDerivationTests({browser = false, nativeOnly = false, onRelease = () => {}} = {}) {
  assert.ok(!browser || !nativeOnly, 'Native-only diagnostics are not guest evidence');
  const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json');
  const markerPath = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
  const lockBytes = fs.readFileSync(lockPath), lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(markerPath));
  validateToolchains(marker, lock, digest(lockBytes), [21, 25]);
  const inputPaths = [sourcePath, harnessPath, path.join(repoRoot, 'ci/java_class_derivation_contract_test.mjs'),
    path.join(repoRoot, 'ci/java_class_structure_test.mjs'), path.join(repoRoot, 'ci/run_java_compatibility.mjs'),
    path.join(repoRoot, 'ci/prepare_java_compatibility_toolchains.mjs'),
    ...(browser ? [path.join(repoRoot, 'ci/java_compatibility_browser.mjs')] : []), lockPath, markerPath, process.execPath];
  const inputs = () => inputPaths.map(filename => ({path: filename, sha256: digest(fs.readFileSync(filename))}));
  const inputDigests = inputs();
  const checkJdks = () => marker.toolchains.forEach(prepared => assert.equal(treeDigest(prepared.home),
    lock.toolchains.find(item => item.id === prepared.id).treeSha256, `${prepared.id}: locked compiler/runtime tree`));
  checkJdks();
  const runnerPath = path.join(repoRoot, 'build/release-cli/console/runner.js');
  const runtime = nativeOnly ? null : runtimeSnapshot(repoRoot, runnerPath);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-class-derivation-'));
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
      const prepared = marker.toolchains.find(item => item.feature === release);
      const releaseRoot = path.join(temporaryRoot, `release${release}`), directory = path.join(releaseRoot, 'runtime');
      const compilationRoot = path.join(releaseRoot, 'compilations');
      fs.mkdirSync(directory, {recursive: true}); fs.mkdirSync(compilationRoot);
      const record = {release, status: 'running', cases: derivationCases(), operations: [], variants: [], payloads: [], executions: []};
      results.push(record); onRelease(record);
      const compile = async (variant, sources, output, classpath, sourcepath = emptySourcepath) => {
        fs.mkdirSync(output, {recursive: true});
        const operation = {variant, sources, destination: output, classpath, sourcepath,
          command: path.join(prepared.home, 'bin/javac'), arguments: ['--release', String(release), '-encoding', 'UTF-8', '-proc:none', '-g',
            '-classpath', classpath, '-sourcepath', sourcepath, '-d', output, ...sources]};
        record.operations.push(operation);
        operation.result = await runCommand(operation.command, operation.arguments, {cwd: releaseRoot, timeoutMs: 60_000});
        completed(operation.result, `compile ${variant} Java ${release}`);
        assert.equal(operation.result.exitCode, 0, operation.result.stderr);
        assert.equal(operation.result.stdout + operation.result.stderr, '', 'Clean genuine compiler output');
      };
      await compile('driver', [sourcePath], directory, emptySourcepath);
      record.driverClasses = inspectClassFiles(directory, release, mainClass);
      const driverTree = treeDigest(directory), originals = new Map();
      for (const variant of derivationSources()) {
        const sourceDirectory = path.join(releaseRoot, 'sources', variant.variant);
        const sourceRecords = variant.sources.map(source => {
          const filename = path.join(sourceDirectory, `${source.binaryName.replaceAll('.', '/')}.java`);
          fs.mkdirSync(path.dirname(filename), {recursive: true});
          fs.writeFileSync(filename, source.text, {mode: 0o600});
          return {...source, path: filename, sha256: digest(source.text)};
        });
        const output = path.join(compilationRoot, variant.variant);
        // javac requires module-info.java to belong to the explicit source path.
        // This directory contains only the one recorded module descriptor.
        await compile(variant.variant, sourceRecords.map(source => source.path), output, directory,
          variant.variant === 'module-descriptor' ? sourceDirectory : emptySourcepath);
        const classes = inspectClassFiles(output, release, variant.sources[0].binaryName);
        assert.deepEqual(classes.map(entry => entry.path).sort(), variant.sources.map(source => `${source.binaryName.replaceAll('.', '/')}.class`).sort(),
          'Separate compilation must emit only its declared payloads');
        record.variants.push({variant: variant.variant, sources: sourceRecords, classFiles: classes});
        for (const source of variant.sources) {
          const relative = `${source.binaryName.replaceAll('.', '/')}.class`;
          originals.set(payloadId(variant.variant, source.binaryName), {bytes: fs.readFileSync(path.join(output, relative)),
            binaryName: source.binaryName, variant: variant.variant,
            sourceSha256: digest(source.text), original: classes.find(entry => entry.path === relative)});
        }
        assert.equal(treeDigest(directory), driverTree, 'Separate payload compilation must not modify driver classes');
      }
      record.originalsTreeSha256 = treeDigest(compilationRoot);
      const addPayload = (original, variant, mutation) => {
        const relative = `derivation-cases/${variant}/${original.binaryName.replaceAll('.', '/')}.bin`;
        const filename = path.join(directory, relative);
        fs.mkdirSync(path.dirname(filename), {recursive: true});
        fs.writeFileSync(filename, mutation.bytes, {mode: 0o600});
        record.payloads.push({id: payloadId(variant, original.binaryName), binaryName: original.binaryName, variant,
          originalVariant: original.variant, original: original.original, sourceSha256: original.sourceSha256,
          kind: mutation.edits.length ? 'explicit-byte-mutation' : 'genuine-compiler-output', edits: mutation.edits,
          resource: {path: relative, size: mutation.bytes.length, sha256: digest(mutation.bytes),
            major: mutation.bytes.readUInt16BE(6), minor: mutation.bytes.readUInt16BE(4)}});
      };
      for (const original of originals.values()) addPayload(original, original.variant, {bytes: original.bytes, edits: []});
      for (const [variant, name] of [['malformed-magic', parent], ['malformed-truncation', parent],
        ['circular-super', parent], ['circular-interface', role], ['lookup-invalid', target]]) {
        const original = originals.get(base(name));
        addPayload(original, variant, mutateDerivation(original.bytes, variant));
      }
      assert.deepEqual([...new Set(record.cases.flatMap(entry => entry.payloads))].sort(), record.payloads.map(entry => entry.id).sort(),
        'Every resource is required by the complete case manifest');
      record.classpath = {directory, files: inventory(directory), fallbackPayloadClassFiles: false,
        separatePayloadCompilationRoot: compilationRoot, treeSha256: treeDigest(directory)};
      assertDerivationClasspath(record.classpath.files, record.driverClasses, record.payloads);
      const execute = async executionHost => {
        assert.equal(treeDigest(directory), record.classpath.treeSha256, 'Immutable runtime inputs before execution');
        const args = record.cases.map(entry => entry.id);
        const result = executionHost === 'chromium' ? await session.execute({classesPath: directory, mainClass,
          arguments: args, timeoutMs: 120_000, standardInput: ''}) : await runCommand(
          executionHost === 'native' ? path.join(prepared.home, 'bin/java') : process.execPath,
          [...(executionHost === 'native' ? [] : ['--no-deprecation', runnerPath]), '-cp', directory, mainClass, ...args],
          {cwd: releaseRoot, timeoutMs: 120_000, standardInput: ''});
        assert.equal(treeDigest(directory), record.classpath.treeSha256, 'Immutable runtime inputs after execution');
        assert.equal(treeDigest(compilationRoot), record.originalsTreeSha256, 'Genuine children/variants never recompiled or replaced');
        assert.deepEqual(inspectClassFiles(directory, release, mainClass), record.driverClasses, 'Genuine driver bytes unchanged');
        assertDerivationClasspath(inventory(directory), record.driverClasses, record.payloads);
        return result;
      };
      for (const executionHost of ['native', ...guestHosts]) await checkDerivationExecution(record, executionHost, () => execute(executionHost));
      record.status = 'passed';
      console.log(`PASS class derivation Java ${release}: ${record.cases.length} scenarios on ${['native', ...guestHosts].join(', ')}`);
    }
    assert.deepEqual(inputs(), inputDigests, 'Unchanged derivation inputs');
    checkJdks();
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(repoRoot, runnerPath), runtime, 'Unchanged CLI runtime');
    return {scope: derivationLedgerScope, nativeOnly, guestHosts,
      notRunGuestHosts: ['node', 'chromium'].filter(name => !guestHosts.includes(name)), caseCount: derivationCases().length,
      releaseCount: results.length, nativeExecutions: results.length, guestExecutions: results.length * guestHosts.length,
      inputDigests, runtime, browserProvenance: session?.provenance || null,
      browserIntegrity: session ? session.verifyIntegrity() : null,
      node: {version: process.version, executable: process.execPath, sha256: inputDigests.find(entry => entry.path === process.execPath).sha256},
      toolchains: marker.toolchains.map(({id, feature, version, archiveSha256}) => ({id, feature, version, archiveSha256,
        treeSha256: lock.toolchains.find(item => item.id === id).treeSha256})),
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

export function writeDerivationLedger(filename, ledger) {
  assert.equal(ledger.schemaVersion, 1);
  assert.equal(ledger.scope, derivationLedgerScope);
  assert.ok(['passed', 'failed'].includes(ledger.status));
  fs.mkdirSync(path.dirname(filename), {recursive: true});
  assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink(), 'Refusing a symlinked ledger directory');
  let existing;
  try { existing = fs.lstatSync(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing) {
    assert.ok(existing.isFile() && existing.nlink === 1, 'Refusing to overwrite a linked or non-regular ledger');
    const previous = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(previous.schemaVersion, 1);
    assert.equal(previous.scope, derivationLedgerScope, 'Refusing to overwrite an unrelated ledger');
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
    completed(result, 'Git provenance');
    assert.equal(result.exitCode, 0);
    return result.stdout.trim();
  };
  return {commit: await read(['rev-parse', '--verify', 'HEAD']),
    trackedDirty: (await read(['status', '--porcelain=v1', '--untracked-files=no'])).length > 0};
}

export function assertDerivationProvenance(start, end) {
  assert.match(start.commit, /^[a-f0-9]{40}$/);
  assert.equal(start.trackedDirty, false, 'Derivation gate must start from committed inputs');
  assert.equal(end.commit, start.commit, 'Derivation gate HEAD changed');
  assert.equal(end.trackedDirty, false, 'Derivation gate inputs changed');
}

if (process.argv[1] && path.resolve(process.argv[1]) === harnessPath) {
  const options = process.argv.slice(2);
  const ledger = {schemaVersion: 1, scope: derivationLedgerScope, status: 'failed',
    startedAt: new Date().toISOString(), requestedMode: options[0] || 'node', attemptedReleases: []};
  try {
    assert.ok(options.length <= 1 && options.every(option => ['--native-only', '--browser'].includes(option)),
      'Usage: node ci/java_class_derivation_test.mjs [--native-only | --browser]');
    const start = await provenance();
    Object.assign(ledger, {gitCommit: start.commit, gitTrackedDirty: start.trackedDirty});
    assertDerivationProvenance(start, start);
    const summary = await runClassDerivationTests({browser: options.includes('--browser'), nativeOnly: options.includes('--native-only'),
      onRelease: record => ledger.attemptedReleases.push(record)});
    const end = await provenance();
    Object.assign(ledger, {gitCommitAtEnd: end.commit, gitTrackedDirtyAtEnd: end.trackedDirty});
    assertDerivationProvenance(start, end);
    Object.assign(ledger, summary, {status: 'passed'});
    delete ledger.attemptedReleases;
  } catch (error) {
    ledger.error = error.stack || error.message;
    console.error(ledger.error);
    process.exitCode = 1;
  } finally {
    ledger.finishedAt = new Date().toISOString();
    writeDerivationLedger(path.join(repoRoot, 'build/java-class-derivation-results.json'), ledger);
  }
}
