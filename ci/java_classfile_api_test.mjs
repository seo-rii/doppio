import groups from './classfile_api_cases.mjs';
import {createClassFileHarness} from './java_classfile_api_harness.mjs';

// Selected C7a exits are literal and independent of compiler output, a chosen
// host, or the catalogue. Java 21 applicability is not an execution waiver.
const inventory = [
  {id: 'classfile-model', ids: [
    'cf-model-name-version', 'cf-model-flags-locations', 'cf-model-super-interfaces', 'cf-model-field-symbols',
    'cf-model-method-code', 'cf-model-traversal-inventory', 'cf-model-sourcefile-parent', 'cf-model-constantpool'
  ]},
  {id: 'classfile-build', ids: [
    'cf-build-empty-model', 'cf-build-int-execute', 'cf-build-long-execute', 'cf-build-double-execute',
    'cf-build-reference-execute', 'cf-build-constructor-field', 'cf-build-sourcefile-last', 'cf-build-explicit-pool'
  ]},
  {id: 'classfile-transform', ids: [
    'cf-transform-accept-all', 'cf-transform-drop-method', 'cf-transform-rename-ownerfree', 'cf-transform-sourcefile',
    'cf-transform-constant', 'cf-transform-end-handler', 'cf-transform-composition', 'cf-transform-callback-identity'
  ]},
  {id: 'classfile-verify', ids: [
    'cf-verify-valid-model', 'cf-verify-typed-invalid-return', 'cf-verify-bad-magic-list', 'cf-verify-bad-magic-parse',
    'cf-verify-truncated-parse', 'cf-verify-pool-failures', 'cf-verify-primitive-build', 'cf-verify-null-bytes'
  ]}
];
const harness = createClassFileHarness({groups, requiredInventory: inventory, harnessUrl: import.meta.url});
export const {classFileScope, classFileGroups, classFileReleases, classFileHosts, classFileTimeouts,
  classFileApplicability, classFileCompletionFlags, parseClassFileMode, validateClassFileGroups, classFileSourceUnits,
  createClassFileLedger, assertClassFileCompilation, assertClassFileProofs, assertClassFileExecution,
  assertClassFileProvenance, assertClassFileLedger, classFileInputPaths, captureClassFileOutput,
  writeClassFileLedger, runClassFileApi, assertClassFileResult} = harness;
await harness.executeClassFileCli();
