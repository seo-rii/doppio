import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const repoRoot = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const typescript = require('typescript');

export function readPackageArtifactContract(root = repoRoot) {
  return {
    manifestSource: fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
    gruntTasksSource: fs.readFileSync(path.join(root, 'Grunttasks.ts'), 'utf8'),
    prepackSource: fs.readFileSync(path.join(root, 'prepack.cjs'), 'utf8'),
    publicTypesSource: fs.readFileSync(path.join(root, 'types', 'public.d.ts'), 'utf8'),
    downloaderSource: fs.readFileSync(path.join(root, 'console', 'download_jdk.ts'), 'utf8'),
    downloaderTestSource: fs.readFileSync(path.join(root, 'ci', 'download_jdk_transaction_test.cjs'), 'utf8'),
    smokeSource: fs.readFileSync(path.join(root, 'ci', 'package_artifact_smoke.mjs'), 'utf8'),
    workflowSource: fs.readFileSync(path.join(root, '.github', 'workflows', 'package-artifact.yml'), 'utf8')
  };
}

function declarationValueExports(source) {
  const declaration = typescript.createSourceFile(
    'types/public.d.ts',
    source,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS
  );
  const exports = [];
  for (const statement of declaration.statements) {
    const exported = statement.modifiers?.some((modifier) => modifier.kind === typescript.SyntaxKind.ExportKeyword);
    if (!exported) {
      continue;
    }
    if (typescript.isClassDeclaration(statement) || typescript.isFunctionDeclaration(statement)) {
      if (statement.name !== undefined) {
        exports.push(statement.name.text);
      }
    } else if (typescript.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        assert.ok(typescript.isIdentifier(declaration.name), 'public value exports must use identifiers');
        exports.push(declaration.name.text);
      }
    }
  }
  return exports.sort();
}

export function checkPackageArtifactContract(sources) {
  const manifest = JSON.parse(sources.manifestSource);
  const expectedValueExports = ['Debug', 'Heap', 'Testing', 'VM'];
  const expectedBins = {
    doppio: './bin/doppio',
    doppioh: './bin/doppioh',
    'doppio-dev': './bin/doppio-dev',
    'doppio-fast-dev': './bin/doppio-fast-dev'
  };
  const expectedFiles = [
    'CHANGELOG.md',
    'bin',
    'dist',
    'docs/README.md',
    'docs/modern-java.md',
    'docs/support.md',
    'install.js',
    'prepack.cjs',
    'types/public.d.ts'
  ];

  assert.equal(manifest.name, 'doppiojvm');
  assert.equal(manifest.version, '0.6.0');
  assert.deepEqual(manifest.engines, {node: '>=24 <25'});
  assert.equal(manifest.main, 'dist/release-cli/src/doppiojvm.js');
  assert.equal(manifest.browser, 'dist/release/doppio.js');
  assert.equal(manifest.types, 'types/public.d.ts');
  assert.deepEqual(manifest.bin, expectedBins);
  assert.deepEqual(manifest.files, expectedFiles);
  assert.equal(manifest.scripts.prepack, 'node ./prepack.cjs');
  assert.equal(manifest.scripts.install, 'node ./install.js');
  assert.equal(manifest.scripts.prepublish, undefined);

  assert.match(
    sources.gruntTasksSource,
    /grunt\.registerTask\('dist',[\s\S]*?'clean-distribution', 'release', 'fast-dev', 'dev', 'clean_natives', 'copy:dist'/,
    'dist must clean distribution products without deleting checked-in test oracles'
  );
  assert.match(sources.gruntTasksSource, /deleteGeneratedArtifacts\(grunt, false\)/);

  assert.match(sources.prepackSource, /require\.resolve\('grunt-cli\/bin\/grunt'\)/);
  assert.match(
    sources.prepackSource,
    /spawnSync\(\s*process\.execPath,\s*\[gruntExecutable, 'dist'\]/s,
    'prepack must invoke a strict dist build with the current Node executable'
  );
  assert.doesNotMatch(sources.prepackSource, /grunt-ignore-compile-errors/);
  for (const output of [
    'dist/doppio.jar',
    'dist/dev-cli/console/download_jdk.js',
    'dist/release/doppio.js',
    'dist/release-cli/src/doppiojvm.js'
  ]) {
    assert.ok(sources.prepackSource.includes(`'${output}'`), `prepack does not verify ${output}`);
  }

  assert.deepEqual(declarationValueExports(sources.publicTypesSource), expectedValueExports);
  assert.doesNotMatch(sources.publicTypesSource, /export\s+class\s+JVM\b/);
  assert.match(sources.publicTypesSource, /export\s+interface\s+JVM\b/);
  assert.match(sources.publicTypesSource, /JVM:\s*JVMConstructor/);
  assert.doesNotMatch(sources.publicTypesSource, /^\s+Heap\??:\s*typeof Heap/m);
  assert.match(sources.publicTypesSource, /export\s+type\s+LogLevel\s*=\s*1\s*\|\s*5\s*\|\s*9\s*\|\s*10/);
  assert.match(sources.publicTypesSource, /^\s+LogLevel:\s*LogLevelEnum;/m);
  assert.match(sources.publicTypesSource, /^\s+logLevel:\s*LogLevel;/m);
  assert.match(sources.publicTypesSource, /^\s+SequenceMatcher:\s*SequenceMatcherConstructor;/m);
  assert.match(sources.publicTypesSource, /callback:\s*\(error:\s*Error\s*\|\s*null,/);

  assert.match(
    sources.downloaderSource,
    /const JDK_SHA256 = 'bee079d16b8631ff56d3bdc66b4d03e0ecbf9ee46baeef9b041c0bc497f25c34';/
  );
  assert.match(sources.downloaderSource, /const MAX_REDIRECTS = 5;/);
  assert.match(sources.downloaderSource, /\[301, 302, 303, 307, 308\]/);
  assert.match(sources.downloaderSource, /statusCode !== 200/);
  assert.match(sources.downloaderSource, /Refusing (?:non-HTTPS JDK URL|JDK redirect to non-HTTPS URL)/);
  assert.match(sources.downloaderSource, /pipeline\(input, meter, output,/);
  assert.match(sources.downloaderSource, /actualSha256 !== expectedSha256/);
  assert.match(sources.downloaderSource, /header\.type !== 'file' && header\.type !== 'directory'/);
  assert.match(sources.downloaderSource, /normalizeArchiveEntry\(header\.name\)/);
  assert.match(sources.downloaderSource, /MAX_EXTRACTED_BYTES/);
  assert.match(sources.downloaderSource, /MAX_ARCHIVE_ENTRIES/);
  assert.match(sources.downloaderSource, /\.doppio-jdk-integrity\.json/);
  assert.match(sources.downloaderSource, /classpathSha256:/);
  assert.match(sources.downloaderSource, /sha256RegularFile\(absolutePath\)/);
  assert.equal(
    sources.downloaderSource.match(/entry !== 'lib\/doppio\.jar'/g)?.length,
    2,
    'doppio.jar must stay unhashed because install.js replaces it'
  );
  assert.match(sources.downloaderSource, /fs\.renameSync\(finalJdkHome, backupJdkHome\)/);
  assert.match(sources.downloaderSource, /fs\.renameSync\(stagedJdkHome, finalJdkHome\)/);
  assert.match(sources.downloaderSource, /fs\.renameSync\(backupJdkHome, finalJdkHome\)/);
  assert.match(sources.downloaderSource, /DOPPIO_JDK_TEST_FAIL_REPLACE/);
  const stagedMetadataIndex = sources.downloaderSource.indexOf('writeMetadata(stagedJdkHome, config)');
  const replaceJdkIndex = sources.downloaderSource.indexOf('replaceJdk(stagedJdkHome, config, workDirectory)');
  assert.ok(stagedMetadataIndex !== -1 && stagedMetadataIndex < replaceJdkIndex);

  for (const fixtureCase of [
    "'wrong-hash'",
    "'corrupt'",
    "'truncated'",
    "'traversal'",
    "'symlink'",
    "'hardlink'",
    "'rollback'",
    "'fail-closed'"
  ]) {
    assert.ok(sources.downloaderTestSource.includes(fixtureCase), `missing downloader fixture case ${fixtureCase}`);
  }
  assert.match(sources.downloaderTestSource, /tampered tools jar/);
  assert.match(sources.downloaderTestSource, /package install replacement jar/);
  assert.match(sources.downloaderTestSource, /JDK is up-to-date and passed integrity checks/);
  assert.match(sources.downloaderTestSource, /assertFailedRunPreservesInstall/);
  assert.match(sources.downloaderTestSource, /DOPPIO_JDK_TEST_FAIL_REPLACE: 'after-backup'/);
  assert.match(sources.downloaderTestSource, /assert\.equal\(completedCases, 12\)/);

  assert.match(sources.smokeSource, /function resolveNpmCli\(\)/);
  assert.match(sources.smokeSource, /run\(\s*process\.execPath,\s*\[npmCli, 'pack', '--json', '--silent'/s);
  assert.doesNotMatch(sources.smokeSource, /\[npmCli, 'pack'[^\]]*--ignore-scripts/s);
  assert.match(sources.smokeSource, /\[npmCli, 'install', '--no-package-lock'\]/);
  assert.match(sources.smokeSource, /\[npmCli, 'rebuild', 'doppiojvm'\]/);
  assert.doesNotMatch(sources.smokeSource, /npm\.cmd|node_modules['"],\s*['"]\.bin/);
  assert.match(sources.smokeSource, /package-artifact-stale-sentinel\.txt/);
  assert.match(sources.smokeSource, /const trackedFilesBeforePack = snapshotTrackedFiles\(\)/);
  assert.match(sources.smokeSource, /normal npm pack changed tracked source files or Java test oracles/);
  assert.match(sources.smokeSource, /delete isolatedEnvironment\.NODE_PATH/);
  assert.match(sources.smokeSource, /for \(let attempt = 0; attempt < 2; attempt \+= 1\)/);
  assert.match(sources.smokeSource, /const expectedValueExports = \['Debug', 'Heap', 'Testing', 'VM'\]/);
  assert.match(
    sources.smokeSource,
    /for \(const \[binName, relativePath\] of Object\.entries\(manifest\.bin\)\)/
  );
  assert.match(sources.smokeSource, /spawnSync\(process\.execPath, \[executable, '-help'\]/);
  assert.match(sources.smokeSource, /vmHasHeap:\s*Object\.hasOwn\(api\.VM, 'Heap'\)/);
  assert.match(sources.smokeSource, /api\.Debug\.Logging\.LogLevel\.ERROR/);
  assert.match(sources.smokeSource, /api\.Debug\.Logging\.logLevel/);
  assert.match(sources.smokeSource, /api\.Debug\.Difflib\.SequenceMatcher/);
  assert.match(sources.smokeSource, /api\.Testing\.DoppioTest\.prototype\.run/);
  assert.match(sources.smokeSource, /@ts-expect-error Heap is a top-level export/);
  assert.match(sources.smokeSource, /'vite\.js'\), 'build'/);
  assert.match(sources.smokeSource, /browserConsumerResult/);
  assert.match(sources.smokeSource, /globalThis\.window = globalThis; globalThis\.self = globalThis;/);
  assert.match(sources.smokeSource, /'typescript\/package\.json'/);
  assert.match(sources.smokeSource, /skipLibCheck:\s*false/);
  assert.match(sources.smokeSource, /DOPPIO_PACKAGE_OUTPUT_DIR must target build\/package-artifact/);
  assert.match(sources.smokeSource, /DOPPIO_PACKAGE_ARTIFACT_BASENAME/);
  assert.match(sources.smokeSource, /\[0-9a-f\]\{40\}/);
  assert.match(sources.smokeSource, /path\.join\(outputDirectory, outputBasename\)/);

  assert.match(sources.workflowSource, /node-version:\s*24/);
  assert.match(sources.workflowSource, /java-version:\s*17/);
  assert.match(sources.workflowSource, /node ci\/check_package_artifact_contract_test\.mjs/);
  assert.match(sources.workflowSource, /node ci\/check_package_artifact_contract\.mjs/);
  assert.match(sources.workflowSource, /run:\s*node ci\/download_jdk_transaction_test\.cjs/);
  assert.match(sources.workflowSource, /DOPPIO_PACKAGE_OUTPUT_DIR:\s*build\/package-artifact/);
  assert.match(
    sources.workflowSource,
    /DOPPIO_PACKAGE_ARTIFACT_BASENAME:\s*doppiojvm-0\.6\.0-\$\{\{ github\.sha \}\}-\$\{\{ github\.run_attempt \}\}\.tgz/
  );
  assert.match(sources.workflowSource, /uses:\s*actions\/upload-artifact@v7/);
  assert.match(
    sources.workflowSource,
    /path:\s*build\/package-artifact\/doppiojvm-0\.6\.0-\$\{\{ github\.sha \}\}-\$\{\{ github\.run_attempt \}\}\.tgz/
  );
  assert.match(sources.workflowSource, /if-no-files-found:\s*error/);
  assert.match(sources.workflowSource, /retention-days:\s*14/);
  assert.match(sources.workflowSource, /archive:\s*false/);
  const uploadConfiguration = sources.workflowSource.slice(
    sources.workflowSource.indexOf('uses: actions/upload-artifact@v7')
  );
  assert.doesNotMatch(uploadConfiguration, /^\s+name:/m, 'archive:false ignores the name input');

  const contractIndex = sources.workflowSource.indexOf('node ci/check_package_artifact_contract.mjs');
  const downloaderIndex = sources.workflowSource.indexOf('node ci/download_jdk_transaction_test.cjs');
  const smokeIndex = sources.workflowSource.indexOf('run: yarn ci:check-package-artifact');
  const uploadIndex = sources.workflowSource.indexOf('uses: actions/upload-artifact@v7');
  assert.ok(
    contractIndex !== -1 &&
    contractIndex < downloaderIndex &&
    downloaderIndex < smokeIndex &&
    smokeIndex < uploadIndex
  );

  return {
    bins: Object.keys(expectedBins).length,
    valueExports: expectedValueExports.length
  };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = checkPackageArtifactContract(readPackageArtifactContract());
  console.log(`package-artifact-contract:${result.bins}:${result.valueExports}:ok`);
}
