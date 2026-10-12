import condyGroups from './bootstrap_condy_cases.mjs';
import indyGroups from './bootstrap_indy_cases.mjs';
import errorGroups from './bootstrap_error_cases.mjs';
import {createMethodHandleHarness} from './java_methodhandle_harness.mjs';

// This independent literal inventory cannot shrink with a case configuration,
// a selected-host mode, or a generated class-file plan.
const inventory = [
  {id: 'bootstrap-condy', ids: [
    'bootstrap-condy-int-exact', 'bootstrap-condy-long-exact', 'bootstrap-condy-float-exact', 'bootstrap-condy-double-exact',
    'bootstrap-condy-reference-identity', 'bootstrap-condy-null-cached', 'bootstrap-condy-boxed-int-adaptation',
    'bootstrap-condy-boxed-long-adaptation', 'bootstrap-condy-methodtype-handle-arguments', 'bootstrap-condy-nested-null-argument',
    'bootstrap-condy-nested-wide-arguments', 'bootstrap-condy-variable-arguments', 'bootstrap-condy-adapted-leading',
    'bootstrap-condy-class-literal', 'bootstrap-condy-private-lookup', 'bootstrap-condy-constant-pool-caching'
  ]},
  {id: 'bootstrap-indy', ids: [
    'bootstrap-indy-exact-site', 'bootstrap-indy-adapted-leading', 'bootstrap-indy-variable-arguments',
    'bootstrap-indy-narrow-parameters', 'bootstrap-indy-wide-parameters', 'bootstrap-indy-reference-adaptation',
    'bootstrap-indy-void-result', 'bootstrap-indy-null-reference', 'bootstrap-indy-private-lookup',
    'bootstrap-indy-constructor-bootstrap', 'bootstrap-indy-methodtype-handle-arguments', 'bootstrap-indy-lexical-two-instructions',
    'bootstrap-indy-lexical-two-methods', 'bootstrap-indy-mutable-target', 'bootstrap-indy-volatile-target', 'bootstrap-indy-target-error-identity'
  ]},
  {id: 'bootstrap-errors', ids: [
    'bootstrap-error-condy-runtime-cause', 'bootstrap-error-condy-error-passthrough', 'bootstrap-error-condy-null-primitive',
    'bootstrap-error-condy-wrong-reference', 'bootstrap-error-condy-lookup-parameter', 'bootstrap-error-condy-arity',
    'bootstrap-error-condy-lookup-denied', 'bootstrap-error-condy-nested-failure', 'bootstrap-error-indy-runtime-cause',
    'bootstrap-error-indy-error-passthrough', 'bootstrap-error-indy-null-site', 'bootstrap-error-indy-wrong-site',
    'bootstrap-error-indy-wrong-target', 'bootstrap-error-indy-arity', 'bootstrap-error-indy-lexical-failure-caching',
    'bootstrap-error-indy-nested-constant-failure'
  ]}
];
const harness = createMethodHandleHarness({scope: 'JVM-004 C4 selected original user invokedynamic and CONSTANT_Dynamic linkage',
  groups: [...condyGroups, ...indyGroups, ...errorGroups], requiredInventory: inventory, harnessUrl: import.meta.url,
  contractFilename: 'java_methodhandle_bootstrap_contract_test.mjs', ledgerBase: 'java-methodhandle-bootstrap', phaseId: 'C4'});
export const {methodHandleScope, methodHandleGroups, methodHandleReleases, methodHandleHosts, methodHandleTimeouts,
  parseMethodHandleMode, validateMethodHandleGroups, methodHandleSourceUnits, createMethodHandleLedger,
  assertMethodHandleCompilation, assertMethodHandleProofs, assertMethodHandleExecution, assertMethodHandleProvenance,
  assertMethodHandleLedger, methodHandleInputPaths, captureMethodHandleOutput, writeMethodHandleLedger,
  runMethodHandleCore} = harness;
await harness.executeMethodHandleCli();
