import groups from './hidden_class_cases.mjs';
import {createMethodHandleHarness} from './java_methodhandle_harness.mjs';

// Independent literal exit inventory. Do not derive it from the fixture
// configuration, source parser, observed output or a selected host.
const inventory = [
  {id: 'hidden-class-definition', ids: [
    'hc-definition-passive', 'hc-definition-eager', 'hc-definition-ensure-initialized',
    'hc-definition-private-constructor-handle', 'hc-definition-public-lookup-denied',
    'hc-definition-dropped-private-denied', 'hc-definition-dropped-module-denied',
    'hc-definition-dropped-original-allowed', 'hc-definition-foreign-package-denied',
    'hc-definition-null-arguments', 'hc-definition-malformed-bytes', 'hc-definition-unsupported-version',
    'hc-definition-interface', 'hc-definition-strong-option', 'hc-definition-combined-options',
    'hc-definition-self-return-verification'
  ]},
  {id: 'hidden-class-identity', ids: [
    'hc-identity-distinct-definitions', 'hc-identity-runtime-name-descriptor',
    'hc-identity-for-name-non-discovery', 'hc-identity-lookup-non-discovery',
    'hc-identity-ordinary-twin-distinct', 'hc-identity-this-class-mirror',
    'hc-identity-ordinary-self-descriptors', 'hc-identity-array-mirrors',
    'hc-identity-array-non-discovery', 'hc-identity-non-nominal-restrictions',
    'hc-identity-default-nest-isolation', 'hc-identity-nestmate-non-enumeration',
    'hc-identity-nest-bytecode-access', 'hc-identity-nest-lookup-access',
    'hc-identity-final-field-reflection', 'hc-identity-mutable-reflection'
  ]},
  {id: 'hidden-class-data', ids: [
    'hc-data-reference-identity', 'hc-data-definition-isolation', 'hc-data-query-initializes',
    'hc-data-indexed-query-initializes', 'hc-data-missing-data', 'hc-data-missing-data-conversion-index',
    'hc-data-reference-conversion', 'hc-data-reference-conversion-failure', 'hc-data-primitive-widening',
    'hc-data-primitive-conversion-failure', 'hc-data-list-identity-mutation', 'hc-data-list-bounds',
    'hc-data-list-conversion-null', 'hc-data-invalid-arguments', 'hc-data-original-authority-required',
    'hc-data-originating-hidden-lookup'
  ]}
];
const harness = createMethodHandleHarness({scope: 'JVM-005 C5 selected original hidden class definition identity and class data',
  groups, requiredInventory: inventory, harnessUrl: import.meta.url, phaseId: 'C5',
  contractFilename: 'java_methodhandle_hidden_class_contract_test.mjs', ledgerBase: 'java-methodhandle-hidden-class'});

export const {methodHandleScope, methodHandleGroups, methodHandleReleases, methodHandleHosts, methodHandleTimeouts,
  parseMethodHandleMode, validateMethodHandleGroups, methodHandleSourceUnits, createMethodHandleLedger,
  assertMethodHandleCompilation, assertMethodHandleProofs, assertMethodHandleExecution, assertMethodHandleProvenance,
  assertMethodHandleLedger, methodHandleInputPaths, captureMethodHandleOutput, writeMethodHandleLedger,
  runMethodHandleCore} = harness;
await harness.executeMethodHandleCli();
