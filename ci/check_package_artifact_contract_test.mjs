import assert from 'node:assert/strict';
import {
  checkPackageArtifactContract,
  readPackageArtifactContract
} from './check_package_artifact_contract.mjs';

const baseline = readPackageArtifactContract();
checkPackageArtifactContract(baseline);

function replaced(source, from, to) {
  assert.ok(source.includes(from), `fixture replacement did not match: ${from}`);
  return source.replace(from, to);
}

function rejects(label, override) {
  assert.throws(
    () => checkPackageArtifactContract({...baseline, ...override}),
    (error) => error instanceof assert.AssertionError,
    label
  );
}

rejects('Node 24 is mandatory', {
  workflowSource: replaced(baseline.workflowSource, 'node-version: 24', 'node-version: 22')
});
rejects('Java 17 is mandatory', {
  workflowSource: replaced(baseline.workflowSource, 'java-version: 17', 'java-version: 21')
});
rejects('the verified JDK downloader runs before package consumption', {
  workflowSource: replaced(
    baseline.workflowSource,
    'run: node ci/download_jdk_transaction_test.cjs',
    'run: node --version'
  )
});
rejects('the JDK release asset digest is pinned', {
  downloaderSource: replaced(
    baseline.downloaderSource,
    'bee079d16b8631ff56d3bdc66b4d03e0ecbf9ee46baeef9b041c0bc497f25c34',
    '0'.repeat(64)
  )
});
rejects('JDK redirects remain bounded', {
  downloaderSource: replaced(baseline.downloaderSource, 'const MAX_REDIRECTS = 5;', 'const MAX_REDIRECTS = 50;')
});
rejects('archive streaming errors close every stream before extraction', {
  downloaderSource: replaced(
    baseline.downloaderSource,
    '(stream as any).pipeline(input, meter, output,',
    'input.pipe(meter).pipe(output); finish('
  )
});
rejects('installed classpath jars carry integrity digests', {
  downloaderSource: replaced(
    baseline.downloaderSource,
    "entry !== 'lib/doppio.jar'",
    "entry !== 'lib/doppio-runtime.jar'"
  )
});
rejects('the downloader gate repairs classpath tampering', {
  downloaderTestSource: replaced(baseline.downloaderTestSource, 'tampered tools jar', 'untested tools jar')
});
rejects('the package support contract discloses the prepack download boundary', {
  supportSource: replaced(
    baseline.supportSource,
    'Building the tarball from a fresh\ncheckout still obtains the pinned JDK archive during prepack',
    'Building the tarball from a fresh checkout uses only the offline fixture'
  )
});
rejects('raw artifact filenames must identify the commit and attempt', {
  workflowSource: replaced(
    baseline.workflowSource,
    'path: build/package-artifact/doppiojvm-0.6.0-${{ github.sha }}-${{ github.run_attempt }}.tgz',
    'path: build/package-artifact/doppiojvm-0.6.0.tgz'
  )
});
rejects('artifact retention is bounded', {
  workflowSource: replaced(baseline.workflowSource, 'retention-days: 14', 'retention-days: 90')
});
rejects('archive:false cannot rely on the ignored name input', {
  workflowSource: replaced(
    baseline.workflowSource,
    'with:\n          path: build/package-artifact/',
    'with:\n          name: ignored-by-raw-upload\n          path: build/package-artifact/'
  )
});
rejects('non-self-contained examples cannot enter the package allowlist', {
  manifestSource: replaced(
    baseline.manifestSource,
    '"docs/README.md",',
    '"docs/README.md",\n    "docs/examples/simple.html",'
  )
});
rejects('prepack compile errors are fatal', {
  prepackSource: replaced(
    baseline.prepackSource,
    "[gruntExecutable, 'dist']",
    "[gruntExecutable, 'dist', '--grunt-ignore-compile-errors']"
  )
});
rejects('package builds preserve checked-in Java test oracles', {
  gruntTasksSource: replaced(
    baseline.gruntTasksSource,
    "'clean-distribution', 'release', 'fast-dev', 'dev', 'clean_natives', 'copy:dist'",
    "'clean', 'release', 'fast-dev', 'dev', 'clean_natives', 'copy:dist'"
  )
});
rejects('npm pack scripts cannot be bypassed', {
  smokeSource: replaced(
    baseline.smokeSource,
    "[npmCli, 'pack', '--json', '--silent', '--pack-destination'",
    "[npmCli, 'pack', '--ignore-scripts', '--json', '--silent', '--pack-destination'"
  )
});
rejects('npm pack verifies that tracked inputs remain unchanged', {
  smokeSource: replaced(
    baseline.smokeSource,
    'const trackedFilesBeforePack = snapshotTrackedFiles();',
    'const trackedFilesBeforePack = [];'
  )
});
rejects('npm must run through its JavaScript entry point', {
  smokeSource: replaced(
    baseline.smokeSource,
    "process.execPath,\n    [npmCli, 'pack'",
    "process.platform === 'win32' ? 'npm.cmd' : 'npm',\n    ['pack'"
  )
});
rejects('the declaration cannot invent a top-level JVM value', {
  publicTypesSource: replaced(baseline.publicTypesSource, 'export interface JVM {', 'export class JVM {')
});
rejects('the VM namespace cannot invent a Heap value', {
  publicTypesSource: replaced(
    baseline.publicTypesSource,
    '  CLI: JavaCLI;',
    '  CLI: JavaCLI;\n  Heap?: typeof Heap;'
  )
});
rejects('DoppioTest completion can report success with null', {
  publicTypesSource: replaced(baseline.publicTypesSource, 'error: Error | null', 'error: Error')
});
rejects('Debug.Logging exposes its enum-typed current level', {
  publicTypesSource: replaced(baseline.publicTypesSource, '  logLevel: LogLevel;', '  logLevel: number;')
});
rejects('Debug.Difflib exposes SequenceMatcher', {
  publicTypesSource: replaced(
    baseline.publicTypesSource,
    '  SequenceMatcher: SequenceMatcherConstructor;',
    '  matcher: SequenceMatcherConstructor;'
  )
});
rejects('all declared bins must be exercised', {
  smokeSource: replaced(
    baseline.smokeSource,
    'for (const [binName, relativePath] of Object.entries(manifest.bin))',
    "for (const [binName, relativePath] of [['doppio', manifest.bin.doppio]])"
  )
});
rejects('bin scripts must run through Node instead of cmd shims', {
  smokeSource: replaced(
    baseline.smokeSource,
    "spawnSync(process.execPath, [executable, '-help']",
    "spawnSync(`${executable}.cmd`, ['-help']"
  )
});
rejects('the isolated browser consumer must build with Vite', {
  smokeSource: replaced(baseline.smokeSource, "'vite.js'), 'build'", "'vite.js'), 'serve'")
});
rejects('the browser-targeted consumer executes with browser globals', {
  smokeSource: replaced(
    baseline.smokeSource,
    'globalThis.window = globalThis; globalThis.self = globalThis;',
    'globalThis.browserGlobalsAreMissing = true;'
  )
});
rejects('the isolated TypeScript consumer must use strict library checking', {
  smokeSource: replaced(baseline.smokeSource, 'skipLibCheck: false', 'skipLibCheck: true')
});
rejects('the verified tarball must be uploaded after the smoke', {
  workflowSource: replaced(
    baseline.workflowSource,
    'uses: actions/upload-artifact@v7',
    'uses: actions/upload-artifact@v6'
  )
});

console.log('package-artifact-contract-negative:29:ok');
