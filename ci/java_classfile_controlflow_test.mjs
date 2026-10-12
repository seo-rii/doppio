import groups from './classfile_controlflow_api_cases.mjs';
import {createClassFileHarness} from './java_classfile_controlflow_harness.mjs';

// Independent literal C7b exit, not a selected-host calibrated case list.
const inventory=[
  {id:'classfile-controlflow',ids:[
    'cf-flow-zero-predicates','cf-flow-int-predicates','cf-flow-reference-predicates','cf-flow-backward-loop',
    'cf-flow-table-switch','cf-flow-lookup-switch','cf-flow-ordered-handlers','cf-flow-label-rejections'
  ]},
  {id:'classfile-stackmaps',ids:[
    'cf-frames-original-typed','cf-frames-long-stack-merge','cf-frames-wide-double-merge','cf-frames-default-generation',
    'cf-frames-drop-option','cf-frames-transform-identity','cf-frames-transform-insertion','cf-frames-invalid-merge'
  ]}
];
const harness=createClassFileHarness({groups,requiredInventory:inventory,harnessUrl:import.meta.url});
export const {classFileScope,classFileGroups,classFileReleases,classFileHosts,classFileTimeouts,
  classFileApplicability,classFileCompletionFlags,parseClassFileMode,validateClassFileGroups,classFileSourceUnits,
  createClassFileLedger,assertClassFileCompilation,assertClassFileProofs,assertClassFileExecution,
  assertClassFileProvenance,assertClassFileLedger,classFileInputPaths,captureClassFileOutput,
  writeClassFileLedger,runClassFileApi,assertClassFileResult}=harness;
await harness.executeClassFileCli();
