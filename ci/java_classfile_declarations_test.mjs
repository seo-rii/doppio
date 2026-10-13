import groups from './classfile_declarations_api_cases.mjs';
import {createClassFileHarness} from './java_classfile_declarations_harness.mjs';
// Independently fixed C7d4 4-by-8 original Java25 exit.
const inventory=[
  {
    "id": "classfile-declarations-signatures",
    "ids": [
      "cf-decl-method-signature",
      "cf-decl-class-signature",
      "cf-decl-signature-attributes",
      "cf-decl-annotation-values",
      "cf-decl-visible-annotations",
      "cf-decl-invisible-newpool",
      "cf-decl-parameter-annotations",
      "cf-decl-default-parameters"
    ]
  },
  {
    "id": "classfile-declarations-type-annotations",
    "ids": [
      "cf-type-target-models",
      "cf-type-field-paths",
      "cf-type-method-targets",
      "cf-type-class-targets",
      "cf-type-code-locals",
      "cf-type-code-offsets-catch",
      "cf-type-code-relocation",
      "cf-type-visible-invisible"
    ]
  },
  {
    "id": "classfile-declarations-metadata",
    "ids": [
      "cf-meta-record-model",
      "cf-meta-record-accessor",
      "cf-meta-record-components",
      "cf-meta-sealed-metadata",
      "cf-meta-enclosing-method",
      "cf-meta-markers",
      "cf-meta-module-vectors",
      "cf-meta-module-extras"
    ]
  },
  {
    "id": "classfile-declarations-combinators",
    "ids": [
      "cf-combinator-block",
      "cf-combinator-if-then",
      "cf-combinator-if-else",
      "cf-combinator-try-catch",
      "cf-combinator-try-multi-all",
      "cf-combinator-transforming",
      "cf-combinator-stateful",
      "cf-combinator-chain"
    ]
  }
];
const harness=createClassFileHarness({groups,requiredInventory:inventory,harnessUrl:import.meta.url});
export const {classFileScope,classFileGroups,classFileReleases,classFileHosts,classFileTimeouts,classFileApplicability,classFileCompletionFlags,
  parseClassFileMode,validateClassFileGroups,classFileSourceUnits,createClassFileLedger,assertClassFileCompilation,assertClassFileProofs,assertClassFileExecution,
  assertClassFileProvenance,assertClassFileLedger,classFileInputPaths,captureClassFileOutput,writeClassFileLedger,runClassFileApi,assertClassFileResult}=harness;
await harness.executeClassFileCli();

