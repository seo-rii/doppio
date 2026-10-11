import conversionGroups from './methodhandle_core_conversion_cases.mjs';
import referenceGroups from './methodhandle_core_reference_cases.mjs';
import {createMethodHandleHarness} from './java_methodhandle_harness.mjs';
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
// Independent literal inventory: deleting cases in an imported module is not a
// smaller passing gate. These are selected contracts, not full API coverage.
const inventory = freeze([
  {id: 'methodhandle-adaptation', ids: ['astype-same-identity', 'primitive-argument-widening-19',
    'primitive-return-widening-19', 'reference-argument-cast-timing', 'reference-return-cast-timing',
    'primitive-argument-boxing', 'primitive-return-boxing', 'wrapper-argument-unboxing', 'wrapper-return-unboxing',
    'null-unboxing-before-target', 'wrong-wrapper-before-target', 'reject-primitive-narrowing', 'reject-fixed-arity-change',
    'reject-boolean-numeric', 'discard-return-after-target', 'void-to-primitive-zero', 'void-to-reference-null',
    'unrelated-reference-null']},
  {id: 'methodhandle-invocation', ids: ['exact-mixed-wide-identity', 'exact-argument-mismatch-before-target',
    'exact-return-mismatch-before-target', 'exact-uncast-null-descriptor', 'invoke-as-type-equivalence',
    'target-throwable-identity', 'exact-invoker-descriptor', 'inexact-invoker-adaptation',
    'lookup-signature-polymorphic-invokers', 'reflective-invoker-placeholders']},
  {id: 'methodhandle-lookup', ids: ['lookup-authority', 'lookup-static-wide', 'lookup-virtual-dispatch',
    'lookup-interface-dispatch', 'lookup-special-nonvirtual', 'lookup-constructor-identity',
    'lookup-instance-reference-fields', 'lookup-instance-wide-fields', 'lookup-static-wide-fields',
    'lookup-private-nest-capability', 'lookup-private-lookup-in', 'lookup-package-access', 'lookup-protected-receiver',
    'lookup-unreflect-identity', 'lookup-creation-errors', 'lookup-null-receiver']},
  {id: 'methodhandle-combinators', ids: ['combinator-guard-select', 'combinator-guard-predicate-failure',
    'combinator-filter-argument-order', 'combinator-filter-argument-failure', 'combinator-filter-return-order',
    'combinator-fold-value-wide', 'combinator-fold-void-order', 'combinator-catch-match', 'combinator-catch-miss',
    'combinator-finally-success', 'combinator-finally-target-failure', 'combinator-finally-cleanup-failure',
    'combinator-permute-wide-duplicates', 'combinator-insert-bound-wide', 'combinator-drop-wide-slots',
    'combinator-factory-rejections']}
]);

const harness = createMethodHandleHarness({
  scope: 'JVM-003 C1 selected Lookup, direct handles, invocation, adaptation and combinators',
  groups: [...conversionGroups, ...referenceGroups], requiredInventory: inventory,
  harnessUrl: import.meta.url, contractFilename: 'java_methodhandle_core_contract_test.mjs',
  ledgerBase: 'java-methodhandle-core', phaseId: 'C1'
});
export const {methodHandleScope, methodHandleGroups, methodHandleReleases, methodHandleHosts, methodHandleTimeouts, parseMethodHandleMode, validateMethodHandleGroups, methodHandleSourceUnits, createMethodHandleLedger, assertMethodHandleCompilation, assertMethodHandleProofs, assertMethodHandleExecution, assertMethodHandleProvenance, assertMethodHandleLedger, methodHandleInputPaths, captureMethodHandleOutput, writeMethodHandleLedger, runMethodHandleCore} = harness;
await harness.executeMethodHandleCli();
