import fieldGroups from './varhandle_field_cases.mjs';
import arrayGroups from './varhandle_array_cases.mjs';
import interopGroups from './varhandle_interop_cases.mjs';
import {createMethodHandleHarness} from './java_methodhandle_harness.mjs';

// The literal C3 inventory is independent of the case configurations and C1/C2.
// No selected-case or host filter can redefine the mandatory evidence matrix.
const inventory = [
  {id: 'varhandle-fields', ids: [
    'vh-field-int-read-write-modes',
    'vh-field-long-add-overflow',
    'vh-field-narrow-add-wrap',
    'vh-field-boolean-bitwise',
    'vh-field-integral-bitwise-wide',
    'vh-field-reference-cas-exchange',
    'vh-field-float-raw-comparison',
    'vh-field-double-raw-comparison',
    'vh-field-get-set-witness',
    'vh-field-weak-cas-safe-outcomes',
    'vh-field-static-zero-coordinates',
    'vh-field-static-initialization',
    'vh-field-final-read-only',
    'vh-field-inherited-private-capability',
    'vh-field-factory-rejections',
    'vh-field-receiver-type-errors'
  ]},
  {id: 'varhandle-arrays', ids: [
    'vh-array-int-read-write-modes',
    'vh-array-long-add-overflow',
    'vh-array-narrow-add-wrap',
    'vh-array-boolean-bitwise',
    'vh-array-integral-bitwise-wide',
    'vh-array-float-raw-comparison',
    'vh-array-double-raw-comparison',
    'vh-array-reference-cas-exchange',
    'vh-array-get-set-witness',
    'vh-array-weak-cas-safe-outcomes',
    'vh-array-null-bounds-before-update',
    'vh-array-reference-covariant-store',
    'vh-array-nested-reference-elements',
    'vh-array-unsupported-update-types',
    'vh-array-factory-rejections',
    'vh-array-call-descriptor-errors'
  ]},
  {id: 'varhandle-interop', ids: [
    'vh-query-coordinate-value-immutable',
    'vh-query-access-mode-types',
    'vh-query-supported-type-matrix',
    'vh-access-mode-name-roundtrip',
    'vh-behavior-toggle-identity',
    'vh-invoke-adaptation-box-wide',
    'vh-invoke-exact-rejections',
    'vh-invoke-adaptation-errors',
    'vh-to-method-handle-bound',
    'vh-exact-invoker-wide',
    'vh-adaptable-invoker-box-wide',
    'vh-lookup-virtual-access-mode',
    'vh-unreflect-accessible-ignored',
    'vh-reflective-access-placeholders',
    'vh-interop-unsupported-modes',
    'vh-interop-factory-errors'
  ]}
];
const harness = createMethodHandleHarness({
  scope: 'JVM-003 C3 selected VarHandle field, array and interoperation single-thread execution',
  groups: [...fieldGroups, ...arrayGroups, ...interopGroups], requiredInventory: inventory,
  harnessUrl: import.meta.url, contractFilename: 'java_methodhandle_varhandle_contract_test.mjs',
  ledgerBase: 'java-methodhandle-varhandle', phaseId: 'C3'
});
export const {methodHandleScope, methodHandleGroups, methodHandleReleases, methodHandleHosts, methodHandleTimeouts,
  parseMethodHandleMode, validateMethodHandleGroups, methodHandleSourceUnits, createMethodHandleLedger,
  assertMethodHandleCompilation, assertMethodHandleProofs, assertMethodHandleExecution, assertMethodHandleProvenance,
  assertMethodHandleLedger, methodHandleInputPaths, captureMethodHandleOutput, writeMethodHandleLedger,
  runMethodHandleCore} = harness;
await harness.executeMethodHandleCli();
