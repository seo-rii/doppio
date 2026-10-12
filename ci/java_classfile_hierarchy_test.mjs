import groups from './classfile_hierarchy_api_cases.mjs';
import {createClassFileHarness} from './java_classfile_hierarchy_harness.mjs';

// Independent literal initial C7d subgate; no native calibration or broad C7 completion.
const inventory=[
  {id:'classfile-hierarchy',ids:[
    'cf-hierarchy-callable-resolvers','cf-hierarchy-declared-chain-cache','cf-hierarchy-resolver-options','cf-hierarchy-subtype-stack',
    'cf-hierarchy-subtype-local','cf-hierarchy-reference-array','cf-hierarchy-primitive-array','cf-hierarchy-invalid-return'
  ]},
  {id:'classfile-constant-instruction',ids:[
    'cf-constant-intrinsic-integers','cf-constant-intrinsic-wide','cf-constant-intrinsic-null','cf-constant-argument-byte',
    'cf-constant-argument-short','cf-constant-numeric-loads','cf-constant-reference-loads','cf-constant-factory-validation'
  ]}
];
const harness=createClassFileHarness({groups,requiredInventory:inventory,harnessUrl:import.meta.url});
export const {classFileScope,classFileGroups,classFileReleases,classFileHosts,classFileTimeouts,
  classFileApplicability,classFileCompletionFlags,parseClassFileMode,validateClassFileGroups,classFileSourceUnits,
  createClassFileLedger,assertClassFileCompilation,assertClassFileProofs,assertClassFileExecution,
  assertClassFileProvenance,assertClassFileLedger,classFileInputPaths,captureClassFileOutput,
  writeClassFileLedger,runClassFileApi,assertClassFileResult}=harness;
await harness.executeClassFileCli();
