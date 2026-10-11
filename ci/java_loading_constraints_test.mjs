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
const sourcePath = path.join(repoRoot, 'classes/modern_fixture/JavaLoadingConstraints.java');
const mainClass = 'classes.modern_test.JavaLoadingConstraints';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const token = 'constraints.Token', full = name => `constraints.${name}`;
export const loadingConstraintsLedgerScope = 'JVM-002 B4b genuine loading constraints with exact declaration loaders and late identity records';
export {assertDerivationProvenance as assertLoadingConstraintsProvenance};

export function loadingConstraintCases() {
  const cases = [];
  const add = (id, kind, names, trace, section = '5.4.2') => cases.push({id, kind, payloads: [token, ...names.map(full)], trace,
    section, packageId: 'JVM-002', mutation: false});
  for (const [prefix, shape] of [['inherited-scalar', 'Scalar'], ['inherited-abstract', 'Abstract'],
    ['array1', 'ArrayOne'], ['array2', 'ArrayTwo'], ['return', 'ReturnOnly']]) {
    for (const shared of [true, false]) add(`${prefix}-${shared ? 'shared' : 'distinct'}`, 'inherited-declaration-loaders',
      [`${shape}BaseA`, `${shape}InterfaceB`, `${shape}BridgeC`],
      [shared ? 'base-interface-token-shared-child-distinct' : 'base-token-distinct-child-interface-shared',
        `${shared ? 'accepted' : 'java.lang.LinkageError'}@prepare`,
        ...(shape === 'Abstract' ? ['abstract-bridge-published', `abstract-bridge-initializations=${shared ? 1 : 0}`] : []),
        'token-not-initialized']);
  }
  for (const shared of [true, false]) add(`override-${shared ? 'shared' : 'distinct'}`, 'declared-override',
    ['OverrideBaseA', 'OverrideChildB'], [shared ? 'token-shared' : 'token-distinct',
      `${shared ? 'accepted' : 'java.lang.LinkageError'}@prepare`, 'token-not-initialized']);
  for (const [id, shape] of [['private-not-override', 'Private'], ['static-not-override', 'Hiding'],
    ['runtime-package-not-override', 'Package'], ['primitive-array-unconstrained', 'Primitive']]) {
    add(id, 'non-constraining-control', [`${shape}BaseA`, `${shape}ChildB`],
      ['token-distinct', 'accepted@prepare', 'token-not-initialized']);
  }
  for (const [kind, shape, section] of [['field', 'Field', '5.4.3.2'], ['static', 'Static', '5.4.3.3'],
    ['interface', 'Interface', '5.4.3.4']]) {
    for (const shared of [true, false]) add(`${kind}-${shared ? 'shared' : 'distinct'}`, 'resolved-declaration-loader',
      [`${shape}BaseA`, `${shape}SubB`, `${shape}CallerC`],
      [shared ? 'caller-declaration-token-shared-symbolic-distinct' : 'caller-token-distinct-symbolic-declaration-shared',
        `${shared ? (kind === 'interface' ? 'java.lang.NullPointerException' : 'accepted') : 'java.lang.LinkageError'}@invoke`,
        ...(kind === 'field' ? [] : [`target-effects=${shared && kind !== 'interface' ? 1 : 0}`]), 'token-not-initialized'], section);
  }
  for (const [kind, shape, family] of [['scalar', 'Scalar', 'inherited'], ['array1', 'ArrayOne', 'inherited'],
    ['array2', 'ArrayTwo', 'inherited'], ['return', 'ReturnOnly', 'inherited'], ['override', 'Override', 'direct'],
    ['field', 'Field', 'member'], ['static', 'Static', 'member'], ['interface', 'Interface', 'member']]) {
    add(`late-${kind}`, 'late-record-and-corrected-retry', family === 'inherited' ?
      [`${shape}BaseA`, `${shape}InterfaceB`, `${shape}BridgeC`] : family === 'direct' ?
        [`${shape}BaseA`, `${shape}ChildB`] : [`${shape}BaseA`, `${shape}SubB`, `${shape}CallerC`],
    [`${kind === 'interface' ? 'java.lang.NullPointerException' : 'accepted'}@impose`, 'token-loads=0', 'first-token-recorded',
      'java.lang.LinkageError@late-define', 'failed-token-not-published', 'corrected-delegation-accepted', 'token-not-initialized'],
    '5.3.4');
  }
  add('failed-edge-rollback', 'transitive-failed-edge-rollback', ['ScalarBaseA', 'ScalarInterfaceB', 'ScalarBridgeC',
    'SecondBaseB', 'SecondInterfaceC', 'SecondBridgeA'], ['accepted@first-edge', 'middle-token-not-loaded',
    'java.lang.LinkageError@conflicting-edge', 'failed-edge-rolled-back', 'token-not-initialized'], '5.3.4');
  return cases.map(entry => {
    const difference = entry.id === 'inherited-abstract-distinct';
    const nativeTrace = difference ? entry.trace.map(event => event === 'java.lang.LinkageError@prepare' ?
      'accepted@prepare' : event === 'abstract-bridge-initializations=0' ? 'abstract-bridge-initializations=1' : event) : entry.trace;
    return {...entry, expectedTraces: {native: nativeTrace, node: entry.trace, chromium: entry.trace},
      ...(difference ? {oracleDifference: {
        nativeExpected: 'accepted@prepare', specExpected: 'java.lang.LinkageError@prepare',
        nativeInitializationCount: 1, specInitializationCount: 0,
        reason: 'Pinned HotSpot 21/25 accepts this inherited abstract-owner boundary. JVMS 5.4.2 Rule 2 and 5.4.6 select the abstract Base declaration and require its loader constraint. Guest expectations retain that normative edge.',
        nativeFeatures: [21, 25], ownBridgeInstanceMethods: [], selectedDeclaration: 'constraints.AbstractBaseA.exchange(Lconstraints/Token;)Lconstraints/Token;',
        selectedMethodFlags: 0x401
      }} : {}), specificationRefs: Object.fromEntries([21, 25].map(release => [release,
        [...new Set(['5.3.4', entry.section, ...(difference ? ['5.4.6', '5.5'] : [])])].map(section =>
          `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-5.html#jvms-${section}`)]))};
  });
}

export function loadingConstraintOracleBoundary() {
  const cases = loadingConstraintCases(), differences = cases.filter(entry => entry.oracleDifference);
  return {strictNativeParity: false, crossHostSpecAgreement: false, nativeParityCaseCount: cases.length - differences.length,
    documentedOracleDifferenceCaseCount: differences.length,
    oracleDifferences: differences.map(entry => ({id: entry.id, ...entry.oracleDifference, specificationRefs: entry.specificationRefs}))};
}

/** One javac payload compilation, then independent definitions of the unchanged
 * genuine bytes. No synthetic headers, descriptor edits or bytecode mutations.
 */
export function loadingConstraintSources() {
  const sources = [];
  const add = (name, body) => sources.push({binaryName: full(name), text: `package constraints; ${body}\n`});
  add('Token', `public class Token { static { ${mainClass}.tokenInitialized(); } }`);
  for (const [shape, type, returnOnly, abstractBase] of [['Scalar', 'Token', false, false],
    ['Abstract', 'Token', false, true], ['ArrayOne', 'Token[]', false, false],
    ['ArrayTwo', 'Token[][]', false, false], ['ReturnOnly', 'Token', true, false]]) {
    const parameters = returnOnly ? '' : `${type} value`, body = `return ${returnOnly ? 'null' : 'value'};`;
    add(`${shape}BaseA`, `public ${abstractBase ? 'abstract ' : ''}class ${shape}BaseA { public ${abstractBase ? 'abstract ' : ''}${type} exchange(${parameters})` +
      `${abstractBase ? ';' : ` { ${body} }`} }`);
    add(`${shape}InterfaceB`, `public interface ${shape}InterfaceB { ${abstractBase ? 'default ' : ''}${type} exchange(${parameters})` +
      `${abstractBase ? ` { ${body} }` : ';'} }`);
    add(`${shape}BridgeC`, `public ${abstractBase ? 'abstract ' : ''}class ${shape}BridgeC extends ${shape}BaseA implements ${shape}InterfaceB {` +
      `${abstractBase ? ` static { ${mainClass}.effect(); } ` : ''}}`);
  }
  for (const [shape, modifier, childModifier, type] of [['Override', 'public', 'public', 'Token'],
    ['Private', 'private', 'public', 'Token'], ['Hiding', 'public static', 'public static', 'Token'],
    ['Package', '', 'public', 'Token'], ['Primitive', 'public', 'public', 'int[][]']]) {
    add(`${shape}BaseA`, `public class ${shape}BaseA { ${modifier} ${type} exchange(${type} value) { return value; } }`);
    add(`${shape}ChildB`, `public class ${shape}ChildB extends ${shape}BaseA { ${childModifier} ${type} exchange(${type} value) { return value; } }`);
  }
  add('FieldBaseA', `public class FieldBaseA { public static Token value; static { ${mainClass}.effect(); } }`);
  add('FieldSubB', 'public class FieldSubB extends FieldBaseA {}');
  add('FieldCallerC', 'public class FieldCallerC { public static void run() { if (FieldSubB.value != null) throw new AssertionError(); } }');
  add('StaticBaseA', `public class StaticBaseA { public static Token exchange(Token value) { ${mainClass}.effect(); return value; } }`);
  add('StaticSubB', 'public class StaticSubB extends StaticBaseA {}');
  add('StaticCallerC', 'public class StaticCallerC { public static void run() { StaticSubB.exchange(null); } }');
  add('InterfaceBaseA', 'public interface InterfaceBaseA { Token exchange(Token value); }');
  add('InterfaceSubB', 'public interface InterfaceSubB extends InterfaceBaseA {}');
  add('InterfaceCallerC', 'public class InterfaceCallerC { public static void run() { ((InterfaceSubB) null).exchange(null); } }');
  add('SecondBaseB', 'public class SecondBaseB { public Token exchange(Token value) { return value; } }');
  add('SecondInterfaceC', 'public interface SecondInterfaceC { Token exchange(Token value); }');
  add('SecondBridgeA', 'public class SecondBridgeA extends SecondBaseB implements SecondInterfaceC {}');
  return sources;
}

export function inspectConstraintDeclarations(bytes, binaryName) {
  const layout = readStructureLayout(bytes);
  if (binaryName === 'constraints.AbstractBridgeC') {
    assert.equal(layout.flags, 0x421, 'Genuine abstract bridge class flags');
    assert.deepEqual(layout.methods.entries.filter(method => method.name !== '<init>' && !(method.flags & 8)).map(method => method.name), [],
      'Abstract bridge must declare no instance method or generated bridge method');
    assert.ok(layout.methods.entries.some(method => method.name === '<clinit>' && method.flags === 8),
      'An actual class initializer proves native preparation completed before acceptance');
  }
  const utf = index => layout.pool[index].value;
  const references = layout.pool.filter(entry => entry && [9, 10, 11].includes(entry.tag)).map(entry => ({
    kind: entry.tag, owner: utf(layout.pool[entry.first].first),
    name: utf(layout.pool[entry.second].first), descriptor: utf(layout.pool[entry.second].second)}));
  if (binaryName.endsWith('CallerC')) {
    const shape = binaryName.slice('constraints.'.length, -'CallerC'.length);
    const expected = {kind: shape === 'Field' ? 9 : shape === 'Static' ? 10 : 11,
      owner: `constraints/${shape}SubB`, name: shape === 'Field' ? 'value' : 'exchange',
      descriptor: shape === 'Field' ? 'Lconstraints/Token;' : '(Lconstraints/Token;)Lconstraints/Token;'};
    assert.ok(references.some(entry => JSON.stringify(entry) === JSON.stringify(expected)),
      `${binaryName}: genuine javac reference must retain symbolic intermediary owner, not the actual inherited declaration`);
  }
  return {classFlags: layout.flags, fields: layout.fields.entries.map(({name, descriptor, flags}) => ({name, descriptor, flags})),
    methods: layout.methods.entries.map(({name, descriptor, flags}) => ({name, descriptor, flags})), references};
}

function completed(result, label) {
  assert.ok(result && !result.timedOut && !result.outputLimitExceeded && !result.error && !result.signal,
    `${label}: incomplete execution ${JSON.stringify(result)}`);
}

export function assertLoadingConstraintsResult(result, label = 'loading constraints', host = 'node') {
  assert.ok(['native', 'node', 'chromium'].includes(host), 'Explicit known host expectation required');
  completed(result, label);
  assert.equal(result.status, 'passed', `${label}: ${result.stderr}`);
  assert.equal(result.exitCode, 0, `${label}: ${result.stderr}`);
  assert.equal(result.stderr.replaceAll('\r\n', '\n'), '', `${label}: stderr`);
  const lines = result.stdout.replaceAll('\r\n', '\n').split('\n');
  const outcomes = loadingConstraintCases().map(entry => {
    const trace = entry.expectedTraces[host];
    for (const event of trace) assert.equal(lines.shift(), `${entry.id}=${event}`, `${label}: exact ${entry.id} ${host} trace`);
    return {id: entry.id, trace, expectationProfile: host === 'native' ? 'pinned-native' : 'jvms',
      oracleDifference: Boolean(entry.oracleDifference)};
  });
  assert.deepEqual(lines, ['LOADING_CONSTRAINTS_OK', ''], `${label}: required complete corpus and no additional effects`);
  return outcomes;
}

export async function checkLoadingConstraintsExecution(record, host, execute, verifyInputs = () => {}) {
  const evidence = {host, status: 'running'};
  record.executions.push(evidence);
  try {
    assert.ok(['native', 'node', 'chromium'].includes(host), 'Known execution host');
    evidence.expectationProfile = host === 'native' ? 'pinned-native' : 'jvms';
    verifyInputs();
    evidence.result = await execute();
    verifyInputs();
    evidence.outcomes = assertLoadingConstraintsResult(evidence.result, `${host} Java ${record.release}`, host);
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
    assert.ok(!stat.isSymbolicLink(), 'No linked inputs');
    if (stat.isDirectory()) for (const name of fs.readdirSync(candidate).sort()) visit(path.join(candidate, name));
    else {
      assert.ok(stat.isFile(), 'Regular inputs only');
      result.push({path: path.relative(directory, candidate).split(path.sep).join('/'), size: stat.size,
        sha256: digest(fs.readFileSync(candidate))});
    }
  };
  visit(directory);
  return result;
}

export function assertLoadingConstraintsClasspath(files, driverClasses, payloads) {
  assert.deepEqual(driverClasses.map(entry => entry.path).sort(), [
    'classes/modern_test/JavaLoadingConstraints$PayloadLoader.class', 'classes/modern_test/JavaLoadingConstraints.class'
  ], 'Only genuine driver classes may be on the runtime classpath');
  assert.ok(payloads.every(entry => entry.resource.path.startsWith('loading-constraint-cases/') && entry.resource.path.endsWith('.bin')));
  const expected = [...driverClasses.map(({path: name, size, sha256}) => ({path: name, size, sha256})),
    ...payloads.map(({resource}) => ({path: resource.path, size: resource.size, sha256: resource.sha256}))];
  const sort = entries => [...entries].sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(sort(files), sort(expected), 'No fallback payload .class files or undeclared resources');
}

export async function runLoadingConstraintTests({nativeOnly = false, browser = !nativeOnly, onRelease = () => {}} = {}) {
  assert.ok(!nativeOnly || !browser, 'Native diagnostic cannot claim browser evidence');
  const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json');
  const markerPath = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
  const lockBytes = fs.readFileSync(lockPath), lock = JSON.parse(lockBytes), marker = JSON.parse(fs.readFileSync(markerPath));
  validateToolchains(marker, lock, digest(lockBytes), [21, 25]);
  const inputPaths = [sourcePath, harnessPath, path.join(repoRoot, 'ci/java_loading_constraints_contract_test.mjs'),
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
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-loading-constraints-'));
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
      const payloadDirectory = path.join(releaseRoot, 'payload-classes');
      fs.mkdirSync(directory, {recursive: true}); fs.mkdirSync(payloadDirectory);
      const record = {release, status: 'running', cases: loadingConstraintCases(), operations: [], sources: [], payloads: [], executions: []};
      results.push(record); onRelease(record);
      const compile = async (stage, sourceFiles, output, classpath) => {
        const operation = {stage, sources: sourceFiles, destination: output, classpath, sourcepath: emptySourcepath,
          command: path.join(prepared.home, 'bin/javac'), arguments: ['--release', String(release), '-encoding', 'UTF-8', '-proc:none', '-g',
            '-classpath', classpath, '-sourcepath', emptySourcepath, '-d', output, ...sourceFiles]};
        record.operations.push(operation);
        operation.result = await runCommand(operation.command, operation.arguments, {cwd: releaseRoot, timeoutMs: 60_000});
        completed(operation.result, `genuine ${stage} Java ${release}`);
        assert.equal(operation.result.exitCode, 0, operation.result.stderr);
        assert.equal(operation.result.stdout + operation.result.stderr, '', 'Clean genuine compiler output');
      };
      await compile('driver', [sourcePath], directory, emptySourcepath);
      record.driverClasses = inspectClassFiles(directory, release, mainClass);
      const driverTree = treeDigest(directory);
      for (const source of loadingConstraintSources()) {
        const filename = path.join(releaseRoot, 'sources', `${source.binaryName.replaceAll('.', '/')}.java`);
        fs.mkdirSync(path.dirname(filename), {recursive: true});
        fs.writeFileSync(filename, source.text, {mode: 0o600});
        record.sources.push({...source, path: filename, sha256: digest(source.text)});
      }
      await compile('payloads', record.sources.map(entry => entry.path), payloadDirectory, directory);
      assert.equal(treeDigest(directory), driverTree, 'Payload compilation cannot modify the driver');
      record.originalClassFiles = inspectClassFiles(payloadDirectory, release, token);
      assert.deepEqual(record.originalClassFiles.map(entry => entry.path).sort(), record.sources.map(entry =>
        `${entry.binaryName.replaceAll('.', '/')}.class`).sort(), 'Only the exact declared genuine payloads');
      for (const source of record.sources) {
        const relative = `${source.binaryName.replaceAll('.', '/')}.class`;
        const original = record.originalClassFiles.find(entry => entry.path === relative);
        const bytes = fs.readFileSync(path.join(payloadDirectory, relative));
        const resourcePath = `loading-constraint-cases/${source.binaryName.replaceAll('.', '/')}.bin`;
        const filename = path.join(directory, resourcePath);
        fs.mkdirSync(path.dirname(filename), {recursive: true});
        fs.writeFileSync(filename, bytes, {mode: 0o600});
        record.payloads.push({binaryName: source.binaryName, kind: 'genuine-compiler-output', edits: [], original,
          sourceSha256: source.sha256, declarations: inspectConstraintDeclarations(bytes, source.binaryName),
          resource: {path: resourcePath, size: bytes.length, sha256: digest(bytes), major: bytes.readUInt16BE(6), minor: bytes.readUInt16BE(4)}});
      }
      assert.deepEqual([...new Set(record.cases.flatMap(entry => entry.payloads))].sort(), record.payloads.map(entry => entry.binaryName).sort(),
        'All and only mandatory case payloads are compiled');
      record.classpath = {directory, separatePayloadCompilationRoot: payloadDirectory, files: inventory(directory),
        fallbackPayloadClassFiles: false, treeSha256: treeDigest(directory)};
      record.originalsTreeSha256 = treeDigest(payloadDirectory);
      const verifyInputs = () => {
        assert.equal(treeDigest(directory), record.classpath.treeSha256, 'Unchanged exact runtime inputs');
        assert.equal(treeDigest(payloadDirectory), record.originalsTreeSha256, 'Unchanged genuine original payloads');
        assert.deepEqual(inspectClassFiles(directory, release, mainClass), record.driverClasses, 'Unchanged genuine driver');
        assertLoadingConstraintsClasspath(inventory(directory), record.driverClasses, record.payloads);
      };
      for (const executionHost of ['native', ...guestHosts]) await checkLoadingConstraintsExecution(record, executionHost, () => {
        const args = [executionHost === 'native' ? 'pinned-native' : 'jvms', ...record.cases.map(entry => entry.id)];
        return executionHost === 'chromium' ? session.execute({classesPath: directory, mainClass,
          arguments: args, timeoutMs: 120_000, standardInput: ''}) : runCommand(
          executionHost === 'native' ? path.join(prepared.home, 'bin/java') : process.execPath,
          [...(executionHost === 'native' ? [] : ['--no-deprecation', runnerPath]), '-cp', directory, mainClass, ...args],
          {cwd: releaseRoot, timeoutMs: 120_000, standardInput: ''});
      }, verifyInputs);
      record.status = 'passed';
      console.log(`PASS loading constraints Java ${release}: 30 agreement cases + 1 documented normative-boundary case on ${['native', ...guestHosts].join(', ')}`);
    }
    assert.deepEqual(inputs(), inputDigests, 'Unchanged corpus inputs'); checkJdks();
    if (!nativeOnly) assert.deepEqual(runtimeSnapshot(repoRoot, runnerPath), runtime, 'Unchanged CLI runtime');
    return {scope: loadingConstraintsLedgerScope, nativeOnly, guestHosts, ...loadingConstraintOracleBoundary(),
      notRunGuestHosts: ['node', 'chromium'].filter(name => !guestHosts.includes(name)), caseCount: loadingConstraintCases().length,
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

export function writeLoadingConstraintsLedger(filename, ledger) {
  assert.equal(ledger.schemaVersion, 1); assert.equal(ledger.scope, loadingConstraintsLedgerScope);
  assert.ok(['passed', 'failed'].includes(ledger.status));
  fs.mkdirSync(path.dirname(filename), {recursive: true});
  assert.ok(!fs.lstatSync(path.dirname(filename)).isSymbolicLink(), 'No symlinked ledger directory');
  let existing;
  try { existing = fs.lstatSync(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing) {
    assert.ok(existing.isFile() && existing.nlink === 1, 'Refusing linked or non-regular ledger');
    const previous = JSON.parse(fs.readFileSync(filename));
    assert.equal(previous.schemaVersion, 1); assert.equal(previous.scope, loadingConstraintsLedgerScope, 'Refusing unrelated ledger');
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
  return {commit: await read(['rev-parse', '--verify', 'HEAD']),
    trackedDirty: (await read(['status', '--porcelain=v1', '--untracked-files=no'])).length > 0};
}

if (process.argv[1] && path.resolve(process.argv[1]) === harnessPath) {
  const ledger = {schemaVersion: 1, scope: loadingConstraintsLedgerScope, status: 'failed',
    startedAt: new Date().toISOString(), attemptedReleases: []};
  try {
    assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--browser'),
      'Official loading-constraint gate requires all hosts. Use imported runner for precommit/native-only diagnostics.');
    const start = await provenance();
    Object.assign(ledger, {gitCommit: start.commit, gitTrackedDirty: start.trackedDirty});
    assertDerivationProvenance(start, start);
    const summary = await runLoadingConstraintTests({browser: true, onRelease: record => ledger.attemptedReleases.push(record)});
    const end = await provenance();
    Object.assign(ledger, {gitCommitAtEnd: end.commit, gitTrackedDirtyAtEnd: end.trackedDirty});
    assertDerivationProvenance(start, end);
    Object.assign(ledger, summary, {status: 'passed'}); delete ledger.attemptedReleases;
  } catch (error) {
    ledger.error = error.stack || error.message; console.error(ledger.error); process.exitCode = 1;
  } finally {
    ledger.finishedAt = new Date().toISOString();
    writeLoadingConstraintsLedger(path.join(repoRoot, 'build/java-loading-constraints-results.json'), ledger);
  }
}
