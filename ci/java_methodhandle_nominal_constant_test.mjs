import groups from './nominal_constant_cases.mjs';
import {createMethodHandleHarness} from './java_methodhandle_harness.mjs';

// Independent literal selected exit. Neither the fixture catalogue, a source
// parser, compiler output nor a chosen host is allowed to define this inventory.
const inventory = [
  {id: 'nominal-type', ids: [
    'nc-type-class-factories', 'nc-type-class-metadata', 'nc-type-class-arrays', 'nc-type-class-nested',
    'nc-type-class-validation', 'nc-type-class-rank', 'nc-type-class-access-passive', 'nc-type-class-hidden-nonnominal',
    'nc-type-method-factories', 'nc-type-method-components', 'nc-type-method-immutability', 'nc-type-method-changes',
    'nc-type-method-validation', 'nc-type-method-bounds', 'nc-type-method-resolution', 'nc-type-method-access-passive'
  ]},
  {id: 'nominal-handle', ids: [
    'nc-handle-kind-metadata', 'nc-handle-factory-equality', 'nc-handle-factory-validation', 'nc-handle-static-wide',
    'nc-handle-interface-static-wide', 'nc-handle-virtual-dispatch', 'nc-handle-interface-virtual-dispatch',
    'nc-handle-class-special-dispatch', 'nc-handle-interface-special-dispatch', 'nc-handle-constructor-wide',
    'nc-handle-instance-field-wide', 'nc-handle-static-field-wide', 'nc-handle-as-type-adaptation',
    'nc-handle-resolution-failures', 'nc-handle-direct-description-roundtrip', 'nc-handle-hidden-bound-description'
  ]},
  {id: 'nominal-dynamic', ids: [
    'nc-dynamic-factory-metadata', 'nc-dynamic-factory-validation', 'nc-dynamic-canonical-null-primitive',
    'nc-dynamic-canonical-enum', 'nc-dynamic-user-lookup-name-type', 'nc-dynamic-private-bootstrap-access',
    'nc-dynamic-nested-order', 'nc-dynamic-no-cache-identity', 'nc-dynamic-null-result', 'nc-dynamic-wide-varargs',
    'nc-dynamic-erased-result', 'nc-dynamic-error-passthrough', 'nc-dynamic-exception-wrapper',
    'nc-dynamic-nested-failure-barrier', 'nc-dynamic-bootstrap-shape', 'nc-dynamic-hidden-class-data'
  ]},
  {id: 'nominal-varhandle', ids: [
    'nc-varhandle-factory-metadata', 'nc-varhandle-factory-validation', 'nc-varhandle-instance-wide',
    'nc-varhandle-static-wide', 'nc-varhandle-array-wide', 'nc-varhandle-reference-array', 'nc-varhandle-private-access',
    'nc-varhandle-resolution-failures', 'nc-varhandle-final-readonly', 'nc-varhandle-field-roundtrip',
    'nc-varhandle-static-roundtrip', 'nc-varhandle-array-roundtrip', 'nc-varhandle-view-roundtrip',
    'nc-varhandle-canonical-projection', 'nc-varhandle-passive-resolution', 'nc-varhandle-hidden-description'
  ]}
];
const harness = createMethodHandleHarness({scope: 'LIB-007 C6 selected original nominal constant descriptors and lookup resolution',
  groups, requiredInventory: inventory, harnessUrl: import.meta.url, phaseId: 'C6',
  contractFilename: 'java_methodhandle_nominal_constant_contract_test.mjs', ledgerBase: 'java-methodhandle-nominal-constant'});

export const {methodHandleScope, methodHandleGroups, methodHandleReleases, methodHandleHosts, methodHandleTimeouts,
  parseMethodHandleMode, validateMethodHandleGroups, methodHandleSourceUnits, createMethodHandleLedger,
  assertMethodHandleCompilation, assertMethodHandleProofs, assertMethodHandleExecution, assertMethodHandleProvenance,
  assertMethodHandleLedger, methodHandleInputPaths, captureMethodHandleOutput, writeMethodHandleLedger,
  runMethodHandleCore} = harness;
await harness.executeMethodHandleCli();
