import groups from './classfile_structural_api_cases.mjs';
import {createClassFileHarness} from './java_classfile_structural_harness.mjs';
// Independently fixed C7d5 3-by-8 original Java25 exit.
const inventory=[
  {
    "id": "classfile-structural-legacy",
    "ids": [
      "cf-legacy-jsr-models",
      "cf-legacy-ret-models",
      "cf-legacy-jsr-ret",
      "cf-legacy-jsrw-ret",
      "cf-legacy-jsr-retw",
      "cf-legacy-jsrw-retw",
      "cf-legacy-relocate-promote",
      "cf-legacy-version-policy"
    ]
  },
  {
    "id": "classfile-structural-special",
    "ids": [
      "cf-special-current-private",
      "cf-special-direct-super",
      "cf-special-class-ancestor",
      "cf-special-direct-interface",
      "cf-special-indirect-interface",
      "cf-special-unrelated-owner",
      "cf-special-wrong-current-receiver",
      "cf-special-interface-major51"
    ]
  },
  {
    "id": "classfile-structural-debug",
    "ids": [
      "cf-struct-debug-valid",
      "cf-struct-debug-lvt-start",
      "cf-struct-debug-lvt-end",
      "cf-struct-debug-lvt-reversed",
      "cf-struct-debug-slots",
      "cf-struct-debug-type-text",
      "cf-struct-debug-local-type-ranges",
      "cf-struct-debug-line-ranges"
    ]
  }
];
const harness=createClassFileHarness({groups,requiredInventory:inventory,harnessUrl:import.meta.url});
export const {classFileScope,classFileGroups,classFileReleases,classFileHosts,classFileTimeouts,classFileApplicability,classFileCompletionFlags,
  parseClassFileMode,validateClassFileGroups,classFileSourceUnits,createClassFileLedger,assertClassFileCompilation,assertClassFileProofs,assertClassFileExecution,
  assertClassFileProvenance,assertClassFileLedger,classFileInputPaths,captureClassFileOutput,writeClassFileLedger,runClassFileApi,assertClassFileResult}=harness;
await harness.executeClassFileCli();


