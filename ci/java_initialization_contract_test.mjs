import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { validateManifest } from './run_java_compatibility.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = () => JSON.parse(fs.readFileSync(path.join(repoRoot, 'ci/java_initialization_manifest.json')));

test('Phase B initialization stays a separate mandatory two-release workload slice', () => {
  const spec = validateManifest(manifest());
  assert.equal(spec.profile, 'phase-b-class-interface-initialization');
  assert.equal(spec.inventory.phaseBComplete, false);
  assert.equal(spec.inventory.completeJavaSeInventory, false);
  assert.deepEqual(spec.inventory.packageIds, ['JVM-002']);
  assert.deepEqual(spec.approvedTarget.requiredHosts.map(host => host.id), ['ubuntu-node24', 'chromium']);
  assert.deepEqual(spec.releases, [21, 25]);
  assert.equal(spec.fixtures.length, 1);
  const fixture = spec.fixtures[0];
  assert.equal(fixture.id, 'class-interface-initialization');
  assert.equal(fixture.source, 'classes/modern_fixture/JavaInitializationOrder.java');
  assert.equal(fixture.mainClass, 'classes.modern_test.JavaInitializationOrder');
  assert.equal(fixture.classGenerator, undefined);
  assert.deepEqual(fixture.releases, [21, 25]);
  assert.deepEqual(fixture.workloadIds, ['W-JAVA21', 'W-JAVA25']);
  assert.deepEqual(fixture.packageIds, ['JVM-002']);
  assert.deepEqual(fixture.arguments, []);
  assert.ok(fs.statSync(path.join(repoRoot, fixture.source)).isFile());
});

test('initialization requirements retain normative ownership and release references', () => {
  const spec = validateManifest(manifest());
  const ids = ['JVM-INIT-SUPERINTERFACE-ORDER', 'JVM-INIT-DECLARED-INSTANCE-METHODS',
    'JVM-INIT-INTERFACE-DIRECT', 'JVM-INIT-ACTIVE-USE', 'JVM-INIT-REENTRANCY', 'JVM-INIT-FAILURE-CACHING'];
  assert.deepEqual(spec.requirements.map(item => item.id), ids);
  assert.deepEqual(spec.fixtures[0].requirementIds, ids);
  for (const requirement of spec.requirements) {
    assert.equal(requirement.packageId, 'JVM-002');
    assert.equal(requirement.implementationState, 'implemented-slice');
    for (const release of spec.releases) {
      assert.ok([
        `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-5.html#jvms-5.5`,
        `https://docs.oracle.com/javase/specs/jls/se${release}/html/jls-12.html#jls-12.4.1`,
        `https://docs.oracle.com/javase/specs/jls/se${release}/html/jls-12.html#jls-12.4.2`,
      ].includes(requirement.specificationRefs[release]));
    }
  }
});

test('native oracle must execute every deterministic scenario including private and synthetic methods', () => {
  const fixture = manifest().fixtures[0];
  const expected = fixture.expectedStdout.split('\n');
  assert.equal(expected.length, 26);
  assert.equal(expected.at(-1), '');
  assert.equal(expected.at(-2), 'INITIALIZATION_OK');
  assert.deepEqual(expected.slice(0, -2).map(line => line.split('=')[0]), [
    'order', 'repeat', 'no-clinit', 'direct-interface', 'direct-interface-parent',
    'method-flags', 'non-eager-interfaces', 'synthetic-default', 'overridden-default',
    'passive-uses', 'reflective-active-use', 'declaring-members', 'declaring-child',
    'getstatic', 'putstatic', 'invokestatic', 'recursive', 'recursive-default',
    'runtime-failure', 'error-failure', 'default-runtime-failure', 'default-error-failure',
    'superclass-failure', 'skipped-interfaces-remain-usable',
  ]);
  assert.ok(expected.includes('method-flags=PrivateOnly,NonDefaultClass'));
  assert.ok(expected.includes('synthetic-default=BridgeChild,BridgeClass'));
  assert.match(fixture.limitations, /not a general verifier\/linkage/);
});
