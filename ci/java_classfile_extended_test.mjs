import groups from './classfile_extended_api_cases.mjs';
import {createClassFileHarness} from './java_classfile_extended_harness.mjs';

// Independent literal C7c exit; never calibrated from a selected host.
const inventory=[
  {id:'classfile-attributes',ids:[
    'cf-attributes-constant-values','cf-attributes-signatures','cf-attributes-exceptions','cf-attributes-nest-host',
    'cf-attributes-nest-members','cf-attributes-custom-stateless','cf-attributes-custom-reference','cf-attributes-processing-options'
  ]},
  {id:'classfile-bootstrap',ids:[
    'cf-bootstrap-handle-type','cf-bootstrap-arguments-dedup','cf-bootstrap-condy-null','cf-bootstrap-condy-int',
    'cf-bootstrap-condy-wide','cf-bootstrap-invokedynamic-entry','cf-bootstrap-invokedynamic-nominal','cf-bootstrap-original-typed'
  ]},
  {id:'classfile-poolremap',ids:[
    'cf-pool-original-fresh','cf-pool-ldc-widening','cf-pool-unused-dropped','cf-pool-foreign-member',
    'cf-pool-wide-imports','cf-pool-custom-reference-remap','cf-pool-bootstrap-reindex','cf-pool-index-validation'
  ]}
];
const harness=createClassFileHarness({groups,requiredInventory:inventory,harnessUrl:import.meta.url});
export const {classFileScope,classFileGroups,classFileReleases,classFileHosts,classFileTimeouts,
  classFileApplicability,classFileCompletionFlags,parseClassFileMode,validateClassFileGroups,classFileSourceUnits,
  createClassFileLedger,assertClassFileCompilation,assertClassFileProofs,assertClassFileExecution,
  assertClassFileProvenance,assertClassFileLedger,classFileInputPaths,captureClassFileOutput,
  writeClassFileLedger,runClassFileApi,assertClassFileResult}=harness;
await harness.executeClassFileCli();
