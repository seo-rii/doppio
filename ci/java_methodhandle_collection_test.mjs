import arrayGroups from './methodhandle_collection_cases.mjs';
import routingGroups from './methodhandle_routing_cases.mjs';
import controlFlowGroups from './methodhandle_control_flow_cases.mjs';
import {createMethodHandleHarness} from './java_methodhandle_harness.mjs';

// Independent fixed inventory: no group, release, host, or case selector can
// silently shrink this C2 gate. API and source-unit conformance remain false.
const inventory = [
  {
    "id": "methodhandle-arrays",
    "ids": [
      "collector-reference-trailing",
      "collector-reference-position-wide",
      "collector-zero-reference",
      "collector-primitive-int",
      "collector-primitive-long-wide",
      "collector-primitive-double-wide",
      "spreader-reference-trailing",
      "spreader-reference-position-wide",
      "spreader-zero-null",
      "spreader-primitive-int",
      "spreader-primitive-long-double-wide",
      "spreader-length-null-before-target",
      "spreader-cast-before-target",
      "arrays-target-throwable-identity",
      "collector-factory-rejections",
      "spreader-factory-rejections"
    ]
  },
  {
    "id": "methodhandle-routing",
    "ids": [
      "routing-lookup-varargs-flags",
      "routing-array-static-type-passthrough",
      "routing-object-array-single-element",
      "routing-zero-multiple-varargs",
      "routing-fixed-arity-normalization",
      "routing-fixed-arity-failure-timing",
      "routing-reference-collector",
      "routing-wide-primitive-collector",
      "routing-with-varargs-toggle",
      "routing-invoke-with-arguments-array",
      "routing-invoke-with-arguments-list",
      "routing-invoke-with-arguments-empty",
      "routing-collect-value-nonzero-wide",
      "routing-collect-void-order-failure",
      "routing-spread-invoker-leading",
      "routing-permute-drop-insert-errors"
    ]
  },
  {
    "id": "methodhandle-control-flow",
    "ids": [
      "cf-while-predicate-first",
      "cf-while-zero-default-init",
      "cf-do-while-body-first",
      "cf-while-wide-state-arguments",
      "cf-loop-void-side-effects",
      "cf-counted-iterations-order",
      "cf-counted-range-wide-state",
      "cf-counted-empty-reversed",
      "cf-iterated-explicit-order",
      "cf-iterated-default-empty",
      "cf-component-throwable-identity",
      "cf-general-one-clause-order",
      "cf-general-dependent-clauses",
      "cf-general-null-varargs-helpers",
      "cf-table-switch-wide-default",
      "cf-table-switch-void-errors"
    ]
  }
];

const harness = createMethodHandleHarness({
  scope: 'JVM-003 C2 selected collectors, spreaders, varargs, argument routing and control flow',
  groups: [...arrayGroups, ...routingGroups, ...controlFlowGroups], requiredInventory: inventory,
  harnessUrl: import.meta.url, contractFilename: 'java_methodhandle_collection_contract_test.mjs',
  ledgerBase: 'java-methodhandle-collection', phaseId: 'C2'
});
export const {methodHandleScope, methodHandleGroups, methodHandleReleases, methodHandleHosts, methodHandleTimeouts,
  parseMethodHandleMode, validateMethodHandleGroups, methodHandleSourceUnits, createMethodHandleLedger,
  assertMethodHandleCompilation, assertMethodHandleProofs, assertMethodHandleExecution, assertMethodHandleProvenance,
  assertMethodHandleLedger, methodHandleInputPaths, captureMethodHandleOutput, writeMethodHandleLedger,
  runMethodHandleCore} = harness;
await harness.executeMethodHandleCli();
