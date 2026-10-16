import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {runCommand} from './run_java_compatibility.mjs';
import {createBrowserSession} from './java_compatibility_browser.mjs';
import {createFoundationCancellation} from './runtime_foundation_processes.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
const flags = process.argv.slice(2);
assert.ok(flags.every(flag => flag === '--browser' || flag.startsWith('--case=')),
  'Usage: node ci/cli_launch_test.mjs [--browser] [--case=id,id]');
const selections = flags.filter(flag => flag.startsWith('--case='));
assert.ok(selections.length <= 1, 'Only one --case selection is allowed');
const selected = selections.length ? selections[0].slice('--case='.length).split(',') : null;
const work = fs.mkdtempSync(path.join(repoRoot, 'build/cli-foundations-'));
const classes = path.join(work, '한글 classes with spaces');
fs.mkdirSync(classes);
const source = `package cli;
public class Probe {
  static String encode(String value) {
    if (value == null) return "null";
    StringBuilder out = new StringBuilder().append(value.length()).append('[');
    for (char c : value.toCharArray()) out.append(Integer.toHexString(c)).append(',');
    return out.append(']').toString();
  }
  public static void main(String[] args) throws Exception {
    if (args[0].equals("args")) {
      System.out.println(args.length - 1);
      for (int i = 1; i < args.length; i++) System.out.println(encode(args[i]));
    } else if (args[0].equals("property")) {
      System.out.println(encode(System.getProperty("sample")));
    } else {
      boolean active = false;
      assert active = true;
      System.out.println(active + ":" + Probe.class.desiredAssertionStatus() + ":" +
        Other.class.desiredAssertionStatus() + ":" + cli.sub.Nested.class.desiredAssertionStatus() + ":" +
        Class.forName("UnnamedProbe").desiredAssertionStatus() + ":" +
        String.class.desiredAssertionStatus() + ":" + java.util.ArrayList.class.desiredAssertionStatus() + ":" +
        int.class.desiredAssertionStatus() + ":" + int[].class.desiredAssertionStatus() + ":" +
        String[].class.desiredAssertionStatus());
    }
  }
}
class Other { }
`;
const sources = {
  'Probe.java': source,
  'Nested.java': 'package cli.sub; public class Nested {}\n',
  'UnnamedProbe.java': 'public class UnnamedProbe {}\n',
  'NativeProbe.java': 'package cli; public class NativeProbe { private static native int value(); public static void main(String[] args) { System.out.println(value()); } }\n'
};
for (const [name, contents] of Object.entries(sources)) fs.writeFileSync(path.join(work, name), contents);
const ledger = {schemaVersion: 1, scope: 'CLI argument, assertion and native module launch regressions',
  runId: process.env.DOPPIO_FOUNDATIONS_RUN_ID || null,
  node: process.version, startedAt: new Date().toISOString(), status: 'running',
  sources: Object.entries(sources).map(([name, value]) => ({name,
    sha256: crypto.createHash('sha256').update(value).digest('hex')})), cases: []};
const runner = path.join(repoRoot, 'build/release-cli/console/runner.js');
const rawArguments = ['', ' ', '  padded  ', '\t', '\n', '한글', '𐐀😀', '-ea', 'path with spaces'];
const assertionCases = [[], ['-ea'], ['-ea', '-da'], ['-da', '-ea'],
  ['-ea:cli...'], ['-ea:cli...', '-da:cli...'], ['-da:cli...', '-ea:cli...'],
  ['-ea:cli...', '-da:cli.Probe'], ['-ea:cli.Probe', '-da:cli...'],
  ['-ea:cli...', '-da:cli.sub...'], ['-da:cli.sub...', '-ea:cli...'],
  ['-ea:cli.Probe', '-da:cli.Probe', '-ea:cli.Other'], ['-ea:...'],
  ['-ea', '-da:...'], ['-esa', '-dsa'], ['-dsa', '-esa'],
  ['-ea:java.lang...', '-dsa'], ['-esa', '-da:java.lang.String'],
  ['-enableassertions:cli...', '-disableassertions:cli.Probe', '-ea:cli.Probe']];
const inventory = ['application-arguments', 'property-whitespace',
  ...assertionCases.map((_, index) => `assertions-${index}`),
  'native-module-jit', 'native-module-interpreter', 'missing-native-path-fails-boot',
  ...(flags.includes('--browser') ? ['chromium-application-arguments'] : [])];
if (selected) assert.ok(selected.length > 0 && selected.every(id => inventory.includes(id)) &&
  new Set(selected).size === selected.length, 'Unknown or duplicate CLI case selection');
ledger.selected = selected || inventory;
ledger.omitted = inventory.filter(id => selected && !selected.includes(id));
const included = id => selected === null || selected.includes(id);
const cancellation = createFoundationCancellation();
const command = (executable, args) => runCommand(executable, args,
  {cwd: repoRoot, timeoutMs: 30_000, maxOutputBytes: 1024 * 1024, signal: cancellation.signal});
function completed(record, code = 0) {
  assert.equal(record.timedOut, false, 'Execution must finish within the original budget');
  assert.equal(record.signal, null);
  assert.equal(record.error, null);
  assert.equal(record.outputLimitExceeded, false);
  assert.equal(record.exitCode, code, JSON.stringify(record));
}
async function compare(id, vmOptions, programArguments) {
  const native = await command('java', [...vmOptions, '-cp', classes, 'cli.Probe', ...programArguments]);
  completed(native);
  const record = {id, vmOptions, programArguments, native, guests: {}};
  ledger.cases.push(record);
  for (const [mode, flags] of [['jit', []], ['interpreter', ['-Xint']]]) {
    const guest = record.guests[mode] = await command(process.execPath,
      ['--no-deprecation', runner, ...flags, ...vmOptions, '-cp', classes, 'cli.Probe', ...programArguments]);
    completed(guest);
    assert.equal(guest.stdout, native.stdout, `${id} ${mode}: exact stdout`);
    assert.equal(guest.stderr, native.stderr, `${id} ${mode}: exact stderr`);
  }
}
let browser;
try {
  ledger.compilation = await command('javac', ['--release', '8', '-encoding', 'UTF-8', '-d', classes,
    ...Object.keys(sources).map(name => path.join(work, name))]);
  completed(ledger.compilation);
  if (included('application-arguments')) await compare('application-arguments', [], ['args', ...rawArguments]);
  if (included('property-whitespace')) await compare('property-whitespace', ['-Dsample=  trailing spaces  '], ['property']);
  for (const [index, vmFlags] of assertionCases.entries()) {
    if (included(`assertions-${index}`)) await compare(`assertions-${index}`, vmFlags, ['assertions']);
  }
  const nativePath = path.join(work, '네이티브 with spaces');
  fs.mkdirSync(nativePath);
  fs.writeFileSync(path.join(nativePath, 'probe.js'),
    "registerNatives({'cli/NativeProbe': {'value()I': function() { return 4321; }}});\n");
  for (const mode of [[], ['-Xint']]) {
    const id = `native-module-${mode.length ? 'interpreter' : 'jit'}`;
    if (!included(id)) continue;
    const execution = await command(process.execPath, ['--no-deprecation', runner, ...mode,
      '-Xnative-classpath', nativePath, '-cp', classes, 'cli.NativeProbe']);
    ledger.cases.push({id, execution});
    completed(execution);
    assert.equal(execution.stdout, '4321\n');
    assert.equal(execution.stderr, '');
  }
  if (included('missing-native-path-fails-boot')) {
    const missing = await command(process.execPath, ['--no-deprecation', runner,
      '-Xnative-classpath', path.join(work, 'missing-natives'), '-cp', classes, 'cli.NativeProbe']);
    ledger.cases.push({id: 'missing-native-path-fails-boot', execution: missing});
    completed(missing, 1);
    assert.match(missing.stderr, /ENOENT/);
  }
  if (flags.includes('--browser') && included('chromium-application-arguments')) {
    browser = await createBrowserSession({repoRoot, signal: cancellation.signal});
    ledger.browserProvenance = browser.provenance;
    const execution = await browser.execute({classesPath: classes, mainClass: 'cli.Probe',
      arguments: ['args', ...rawArguments], timeoutMs: 30_000});
    ledger.cases.push({id: 'chromium-application-arguments', execution});
    completed(execution);
    assert.deepEqual(execution.browserErrors, []);
    const native = ledger.cases.find(record => record.id === 'application-arguments')?.native ||
      await command('java', ['-cp', classes, 'cli.Probe', 'args', ...rawArguments]);
    completed(native);
    assert.equal(execution.stdout, native.stdout);
    assert.equal(execution.stderr, '');
    ledger.browserIntegrity = browser.verifyIntegrity();
  }
  ledger.status = 'passed';
  console.log(`cli-launch:${ledger.cases.length}:ok`);
} catch (error) {
  ledger.status = 'failed';
  ledger.error = error.stack;
  throw error;
} finally {
  try {
    await browser?.close();
  } finally {
    cancellation.dispose();
    ledger.finishedAt = new Date().toISOString();
    try {
      fs.writeFileSync(path.join(repoRoot, 'build/cli-foundations-results.json'),
        JSON.stringify(ledger, null, 2) + '\n', {mode: 0o600});
    } finally {
      fs.rmSync(work, {recursive: true, force: true});
    }
  }
}
