# Phase B: loading and final language

Phase B owns `JVM-002`, `JVM-006`, `JVM-007` and `JVM-008` from the
[compatibility roadmap](compatibility-roadmap.md). It is an implementation
workstream, not a single feature or a new support level. The Phase A source
catalogues remain the contract inventory; these batches do not replace its
unassessed entries with a passing aggregate status.

## Batches and dependencies

| Batch | Related work | Exit evidence and dependency |
| --- | --- | --- |
| B1: initialization | Class/interface order, active-use triggers, reentrancy and failure caching | Selected corpus below; complete initialization also needs remaining spec cases, not just this slice. |
| B2: structural validation | Class, attribute, Code and StackMapTable structure | Valid and intentionally malformed binaries, exact specified errors, immutable source/mutation provenance; build on A's admission controls. |
| B3: bytecode verification | Operand/local types, branches, handlers, uninitialized objects | Real verification before execution; separate modern stack-map and legacy policies. Depends on B2. |
| B4: linking | Loader identity/constraints, access, resolution/default selection and failure caching | Positive, negative and evolved binaries on both hosts. Depends on B2/B3; module access needs G, general bootstraps need C. |
| B5: retained execution | Remaining core-language, conversion, control-flow, array, object and exception contracts owned by JVM-002 | Map contract units to executable evidence; synchronization/memory-model dependencies remain D. |
| B6: records | Component generic/type-annotation reflection, constructors, accessors and object methods | Genuine annotated/generic records and negative/general-bootstrap cases; C owns handles and general bootstrap foundations. |
| B7: sealed types | Metadata, custom-loader enforcement, reflective errors and binary evolution | Exact error and permitted-parent cases; B4 plus G for named-module conditions. |
| B8: final language | Patterns/switches, constructors and launcher behavior | Broader final 21/25 matrices on B6/B7/C foundations; retain specified-versus-native launcher differences. |

The source inventory also assigns retained language and opcode requirements to
JVM-002; completing its initialization or verifier subsets cannot close that
package. Source-section counts are neither effort estimates nor pass rates.

## Current B1 slice

The [manifest](../ci/java_initialization_manifest.json) maps six selected
requirements to one genuine source compiled by each pinned javac 21 and 25.
There are two release cases and four required guest comparisons (Node and
Chromium), plus their native oracles. The fixture asserts 24 deterministic
scenario traces and a final completion marker. Its exact stdout is part of the
manifest, so two equally incomplete executions do not pass by merely agreeing.

The runtime uses one prerequisite enumeration in its synchronous no-`<clinit>`
fast path and its locked asynchronous initialization path. State queries no
longer promote a class solely because its superclass is initialized. The
enumeration initializes the superclass first, then recursively visits direct
interface hierarchies in declaration order, parents before children, selecting
interfaces with declared non-abstract/non-static methods. It deduplicates class
identities, not names. Even an already-initialized interface's ancestors must
still be considered. Direct interface initialization does not initialize parents.

This follows [JVMS 21 §5.5](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-5.html#jvms-5.5)
and [JVMS 25 §5.5](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-5.html#jvms-5.5).
The VM predicate includes private instance methods and synthetic concrete
bridges, not just methods for which reflection reports `isDefault()`.
Both pinned native releases confirm the private-instance case; private-static,
public-static and abstract-only controls remain uninitialized until used.
This does not change method inheritance or dispatch rules.

The source fixture covers:

- superclass/interface ordering, diamonds and non-default intermediates;
- classes without their own initializer, overridden defaults and synthetic bridges;
- direct-interface initialization and passive class literals, arrays, constants
  and `Class.forName(..., false, ...)`;
- active uses of the actual declaring class, reflection, field reads/writes and
  static method calls;
- same-thread recursive initialization and observable default field values;
- original `Error` identity and `ExceptionInInitializerError` cause identity;
- failed superclass/interface prerequisites, dependent erroneous classes,
  later `NoClassDefFoundError`, and still-usable skipped interfaces.

The separate [VM unit checks](../ci/class_initialization_test.cjs) use the actual
parsed `ReferenceClassData` and `ClassLock` implementations with controlled
initializer callbacks. They exercise ownership, waiters, same-name classes from
distinct loaders and observation of a no-initializer class while dependencies
are in progress. They are not native or browser evidence. The retained
`Java15LookupEnsureInitialized` runtime fixture continues to cover real Java
waiter and lookup paths.

## Reproduce and interpret results

With the existing Linux x64 build prerequisites and prepared pinned toolchains:

```sh
./node_modules/.bin/grunt --stack modern-ci-release-cli --grunt-ignore-compile-errors
./node_modules/.bin/grunt --stack make_build_dir:release vite-release listings:release --grunt-ignore-compile-errors
yarn ci:java-initialization:test
yarn ci:java-initialization
```

The host gate reuses the existing comparison runner with the dedicated manifest
and `build/java-initialization-results.json`. It retains raw failed executions,
compiler commands, genuine major 65/69 class hashes, source/manifest/toolchain
and runtime hashes, host versions and start/end Git provenance. Only CRLF is
normalized. CI requires both releases/hosts and uploads the ledger even on
failure; neither a local Node-only run nor these instructions is a fresh result.

Before the runtime correction, the Java 21 fixture failed its first trace:
`Base,Ordered` ran while the required interface initializers were omitted.
Both pinned native releases produce the manifest's full expected output.
Passing runs after the correction must be established by the retained ledger,
not by this regression description. Phase A's last detached run had no verified
completion status when B began; A remains unconfirmed until its two gates pass.

## B2 structural validation

The parser bounds every byte read, checks class/member names and descriptors,
constant-pool kinds and versioned tags, modifier combinations, duplicate
declarations and required Code attributes. Parsed attributes are isolated to
their declared payloads. Code length and handler numeric ranges, StackMap
encoding tags, singleton attributes and recognized metadata references are
checked before execution. Reserved flags and unknown or inapplicable attributes
remain ignored; opaque annotation data is not eagerly treated as a reflection
request. These are format checks, not operand-type verification.

`ci/java_class_structure_test.mjs` compiles the genuine `JavaClassStructure`
fixture with each pinned javac 21/25. Its 50 cases per release contain one
untouched control, seven opaque-annotation acceptance controls, and 42 explicit
structural mutations. The original files are never relabeled or changed.
Every mutation records replayable edits and original/result hashes. Native,
Node and Chromium must produce the complete ordered outcome list, with exact
Java error classes and no initialization of rejected classes. Checking time
(definition, resolution or initialization) is recorded but need not match
HotSpot's implementation choice.

```sh
yarn ci:class-structure:test
yarn ci:class-structure
```

The cross-host command requires a clean committed tree and unchanged start/end
HEAD. `build/java-class-structure-results.json` retains compiler, toolchain,
source, mutation-tree, runtime and browser provenance, including raw failures.
CI uploads that ledger even on failure. Unit tests use the actual compiled VM
and include valid reserved flags, historical attribute recognition, modified
UTF-8, category-2 parameter slots and malformed opaque annotation controls.
These commands document the gate; a fresh passing ledger is the evidence.

## Remaining boundaries

This slice does not finish B1, JVM-002 or Phase B. General Code/StackMap bytecode
type checking is not currently an enforcement phase: parsing and storing a
StackMapTable is not verification. B2's structural corpus does not establish
the opcode, branch or type-flow constraints assigned to B3 and `VerifyError`.
Remaining initialization cases include exceptional allocation during error
wrapping and broader concurrency/memory-model interactions. General linkage,
module access, hidden classes and arbitrary bootstrap behavior remain separate.
The record, sealed and final-language batches keep their existing partial status.
