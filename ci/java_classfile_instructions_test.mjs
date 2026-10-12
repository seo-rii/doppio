import groups from './classfile_instructions_api_cases.mjs';
import {createClassFileHarness} from './java_classfile_instructions_harness.mjs';
// Independent literal original-source exit, never calibrated at execution time.
const inventory=[
  {id:'classfile-instruction-arrays',ids:['cf-array-int-long','cf-array-float-double','cf-array-byte-boolean','cf-array-char-short','cf-array-reference','cf-array-nested-reference','cf-array-multi-primitive','cf-array-multi-reference']},
  {id:'classfile-instruction-arithmetic',ids:['cf-arithmetic-operators','cf-arithmetic-shifts-bits','cf-arithmetic-compare-convert','cf-arithmetic-dup-swap','cf-arithmetic-dup-x2','cf-arithmetic-dup2','cf-arithmetic-dup2-x1','cf-arithmetic-dup2-x2']},
  {id:'classfile-instruction-members',ids:['cf-member-fields','cf-member-virtual','cf-member-interface','cf-member-special-interface','cf-member-typechecks','cf-member-monitor','cf-member-monitor-handler','cf-member-throw']},
  {id:'classfile-instruction-frames',ids:['cf-frame-forward-wide','cf-frame-backward-wide','cf-frame-goto-wide','cf-frame-dead-patch','cf-frame-dead-keep','cf-frame-protected-new','cf-frame-uninitialized-join','cf-frame-interface-join']}
];
const harness=createClassFileHarness({groups,requiredInventory:inventory,harnessUrl:import.meta.url});
export const {classFileScope,classFileGroups,classFileReleases,classFileHosts,classFileTimeouts,classFileApplicability,classFileCompletionFlags,
  parseClassFileMode,validateClassFileGroups,classFileSourceUnits,createClassFileLedger,assertClassFileCompilation,assertClassFileProofs,assertClassFileExecution,
  assertClassFileProvenance,assertClassFileLedger,classFileInputPaths,captureClassFileOutput,writeClassFileLedger,runClassFileApi,assertClassFileResult}=harness;
await harness.executeClassFileCli();
