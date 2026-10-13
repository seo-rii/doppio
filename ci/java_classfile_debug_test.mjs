import groups from './classfile_debug_api_cases.mjs';
import {createClassFileHarness} from './java_classfile_debug_harness.mjs';
// Independent literal original Java25 exit; no source, host or mandatory-cell pruning.
const inventory=[
  {id:'classfile-debug-model',ids:['cf-debug-line','cf-debug-local','cf-debug-generic-local','cf-debug-character','cf-debug-source-extension','cf-debug-drop-line','cf-debug-drop-debug','cf-debug-drop-both']},
  {id:'classfile-debug-remap',ids:['cf-remap-original-debug','cf-remap-debug-identity','cf-remap-debug-insertion','cf-remap-debug-fresh','cf-remap-debug-widen','cf-remap-debug-drop','cf-remap-character-scope','cf-remap-debug-options']},
  {id:'classfile-debug-lifecycle',ids:['cf-lifecycle-deferred-owner','cf-lifecycle-fresh-reference','cf-lifecycle-read-exception','cf-lifecycle-write-exception','cf-lifecycle-manual-branch','cf-lifecycle-manual-wide','cf-lifecycle-manual-dead','cf-lifecycle-manual-invalid']}
];
const harness=createClassFileHarness({groups,requiredInventory:inventory,harnessUrl:import.meta.url});
export const {classFileScope,classFileGroups,classFileReleases,classFileHosts,classFileTimeouts,classFileApplicability,classFileCompletionFlags,
  parseClassFileMode,validateClassFileGroups,classFileSourceUnits,createClassFileLedger,assertClassFileCompilation,assertClassFileProofs,assertClassFileExecution,
  assertClassFileProvenance,assertClassFileLedger,classFileInputPaths,captureClassFileOutput,writeClassFileLedger,runClassFileApi,assertClassFileResult}=harness;
await harness.executeClassFileCli();
