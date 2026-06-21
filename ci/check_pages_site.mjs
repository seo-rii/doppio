import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const docsDir = path.join(repoRoot, 'docs');
const requiredFiles = [
  'index.html',
  'docs.html',
  'playground/index.html',
  'playground/runtime/browserfs.min.js',
  'playground/runtime/doppio.js',
  'playground/runtime/listings.json',
  'playground/runtime/vendor/java_home/lib/rt.jar',
  'playground/runtime/vendor/java_home/lib/tools.jar',
  'playground/runtime/compilers/kotlin/kotlin-compiler.jar',
  'playground/runtime/compilers/kotlin/kotlin-reflect.jar',
  'playground/runtime/compilers/kotlin/kotlin-stdlib.jar',
  `playground/runtime/compilers/scala/scala-compiler-${process.env.SCALA_COMPILER_VERSION || '2.13.18'}.jar`,
  `playground/runtime/compilers/scala/scala-library-${process.env.SCALA_COMPILER_VERSION || '2.13.18'}.jar`
];

for (const relativePath of requiredFiles) {
  assert.ok(fs.statSync(path.join(docsDir, relativePath)).size > 0, `${relativePath} must be non-empty`);
}

const homeHtml = fs.readFileSync(path.join(docsDir, 'index.html'), 'utf8');
const docsHtml = fs.readFileSync(path.join(docsDir, 'docs.html'), 'utf8');
const playgroundHtml = fs.readFileSync(path.join(docsDir, 'playground/index.html'), 'utf8');
assert.match(homeHtml, /Doppio Modern JVM/);
assert.match(homeHtml, /playground\//);
assert.doesNotMatch(homeHtml, /href="[^"]+\.md"/);
assert.match(docsHtml, /id="document-content"/);
assert.match(playgroundHtml, /id="source-editor"/);
assert.match(playgroundHtml, /id="run-button"/);

const listing = JSON.parse(
  fs.readFileSync(path.join(docsDir, 'playground/runtime/listings.json'), 'utf8')
);
assert.equal(listing['doppio.js'], null);
assert.equal(listing.vendor.java_home.lib['rt.jar'], null);
assert.equal(listing.compilers.kotlin['kotlin-compiler.jar'], null);
assert.ok(Object.keys(listing.compilers.scala).some((name) => name.startsWith('scala-compiler-')));

const generatedAssets = fs.readdirSync(path.join(docsDir, 'assets'));
assert.ok(generatedAssets.some((name) => name.endsWith('.css')), 'site CSS asset is missing');
assert.ok(generatedAssets.some((name) => name.endsWith('.js')), 'site JavaScript asset is missing');

console.log('Pages site artifact checks passed.');
