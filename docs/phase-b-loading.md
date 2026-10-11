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
Chromium), plus their native oracles. The fixture asserts 30 deterministic
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
- inherited abstract/default instance calls without initializing their symbolic
  interfaces or abstract declaration owners, including an initialized child
  whose parent remains independently initializable;
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

## B3 pre-execution verification

The verifier reads the retained declaration, not interpreter-quickened bytes or
a native replacement. An immutable decoder checks instruction operands, local
slots, branch/switch targets, exception-handler boundaries and stack-map
positions. Type checking then applies explicit stack-map frames to modern
classes (major 51+) and an inference/subroutine policy to historical classes.
It checks operand/local categories, array components, calls/fields, handlers,
constructor initialization and uninitialized aliases. It does not execute a
bootstrap method or resolve a symbolic member to prove a type obligation.

Reference constraints are checked against actual class and defining-loader
identities, including runtime packages, array covariance, protected receivers
and special-invocation owners. Metadata loading is distinct from verification:
ordinary class definition and bootstrap delegation prepare the hierarchy but
do not recursively verify dependencies. Explicit linking, initialization and
bytecode/native execution require the verification gate. Failed verification
cannot be caught by an unverified method's own handlers. Concurrent waiters
share the result; a metadata loading failure retains its guest Throwable.
Protected-member checks first establish whether the receiver rule applies;
unrelated symbolic owners and non-protected members do not cause otherwise
unnecessary receiver loads before their instructions execute. Native allocation
and static reflective invocation also wait for successful verification and
initialization, preserving the original failure instead of accessing an
unverified executable constructor.

This separation follows [JVMS 25 §5.4.1](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-5.html#jvms-5.4.1):
loading a type while verifying another type does not require verifying that
dependency. In particular, checking a parent's method that accepts its child
must not recursively wait for the parent's verification again. Lookup-defined
and anonymous classes retain their exact identity and explicit linking paths.

The bootstrap bytecode overlays use the same verifier, without an exemption.
Their generated branching methods now carry stack maps; the overlay unit gate
checks all 1,385 methods from the 36 transformed classes, verifies that 1,273
original Code attributes remain byte-identical, and rejects ten controls with
required frames removed. These decoder/type tests are not, by themselves,
evidence that metadata obligations or Java execution succeeded.

The pinned Java 8 lambda and reflection generators also rely on privileged
special-call shapes which ordinary class files cannot use. Their VM definition
hooks recognize the actual bootstrap producer and its captured metadata, then
emit typed private native adapters for exact, nonvirtual calls. Serialization
uses a separate allocation adapter at the original allocation instruction and
an exact superclass-constructor adapter. Instruction widths and handler ranges
are preserved. The original bytes, transformed bytes and per-instruction edits
remain available as generation provenance; every transformed Code attribute
still passes through the ordinary verifier. A generated name or inheritance
from `MagicAccessorImpl` does not authorize this transformation. Unit tests
cover untrusted inputs, unrelated invalid code, exact target identity and
verification/initialization failure propagation. Retained Java execution is
required in addition to those unit checks.

`ci/java_bytecode_verification_test.mjs` compiles genuine Java 21 and 25
fixtures. Its 66 bytecode cases include untouched compiler output, valid
mutations, invalid instruction/type-flow cases and explicitly labeled
historical mutations. The expected outcomes are 11 acceptances, 50
`VerifyError`s and five `ClassFormatError`s per release. Every modification is
replayable and hashed; no modern input is silently relabeled as an older class.
The loader re-entry regression separately checks that metadata loading does
not verify the dependency, but its later active use does.

```sh
yarn ci:bytecode-verification:test
yarn ci:bytecode-verification
```

The host gate requires native Java, Node and Chromium for both releases and a
clean unchanged committed tree. It writes
`build/java-bytecode-verification-results.json`, retaining failed attempts,
source/compiler/runtime hashes, binary mutation provenance, exact ordered
errors and completion traces. CI uploads failures too. Source-transpiled
lifecycle units and local precommit diagnostics are explicitly separate from
this clean-tree execution evidence.

## B4a class derivation and loader identity

Named definition reserves a parsed candidate privately, admits its superclass
before its direct superinterfaces, and only then publishes its identity.
Direct interface metadata is fetched before the superclass, matching the
observable Java loader order of the pinned OpenJDK hosts; this anticipatory
load neither verifies the interface nor publishes constant-pool resolution.
Superclass-first admission remains a separate check, and the unpublished
candidate participates in cycle detection during both steps.
Pending candidates are absent from loaded-class and array queries. Admission
rejects wrong names, module descriptors, circular hierarchies, wrong parent
kinds, final superclasses and inaccessible parents. Runtime packages include
the defining loader, so matching package names alone do not grant access.
Failed derivation releases only its own reservation; a successful definition
remains registered if subsequent verification or user loader code fails.
Competing definitions wait and then check their own request against the result.

Hierarchy ancestry follows actual Java loader invocation frames. Independent
metadata requests on the same thread can wait for a candidate without being
misclassified as an inheritance cycle. Loader return values must have the
requested name and a reference-class identity. Non-missing-class exceptions
retain their original guest Throwable. Interfaces and array marker supertypes
use actual class identities, including the bootstrap Object, Cloneable and
Serializable classes, rather than equal names from different loaders.

Noninitializing `Class.forName` returns loaded metadata. An array query prepares
each rank's component and bootstrap superclass pointers without verifying or
initializing the element class, even if that element previously failed
verification. Explicit component linking and active use still take the full
linking gate. Binding a Lookup member completes that gate before publishing
native method indices or static-method bridges, without running the target's
class initializer; linking failures retain their original guest Throwable.
Trusted reflection superclass access is attached to the
proven generator preparation and exact candidate; admission requires the actual
bootstrap parent identity, including when that parent loads after preparation.

`ci/java_class_derivation_test.mjs` compiles the genuine driver and separate
parent/interface variants with each pinned javac 21/25. Its 36 scenarios cover
exact/null names, wrong-name and malformed-byte retries, duplicate and initiating
loader identities, separately compiled hierarchy evolution, runtime-package
access, independent/delegated identities, Lookup publication after VerifyError,
passive arrays, circularity and module descriptors. Payloads are resource-only
`.bin` files; their compiled `.class` trees stay outside the driver classpath.
The five explicit binary mutations retain replayable edits and genuine original
headers. Exact traces include failure phase, publication and initialization
effects, rather than only comparing two final output streams.

```sh
yarn ci:class-derivation:test
yarn ci:class-derivation
```

The cross-host gate requires native Java, Node and Chromium on both releases,
clean unchanged committed sources, immutable compiler/runtime inputs and a
retained `build/java-class-derivation-results.json` ledger on success or failure.
The lifecycle and parsed-hierarchy units supplement that gate with pending
definitions, waiters and native-entry controls. B4a does not close B4: loading
constraints, member access/resolution, default selection and symbolic failure
caching remain dependent batches.

## B4b preparation and loading constraints

Initiating-loader records and descriptor constraints share a per-VM registry
keyed by the actual bootstrap loader, not Java's null bootstrap mirror. A
constraint connects actual class identities transitively; failed records and
merges leave their previous groups intact. Arrays constrain their reference
leaf, and primitive descriptors impose no reference constraint. These checks
never load, verify or initialize descriptor classes. A later conflicting
definition or delegated loader return fails before initiating publication;
already published defining identities and independent corrected retries remain.

Full linking now requires both successful verification and preparation.
Hierarchy-only derivation and passive metadata queries do neither. Preparation
connects each declared override to its ancestor declaration owners (JVMS 5.4.2
Rule 1), and an inherited selected owner to its superinterface owner (Rule 2).
An independent child's loader does not enter an inherited-owner constraint.
Selected abstract superclass declarations still retain their owner. Failed
preparation keeps its first guest Throwable and does not reimpose constraints;
waiting callbacks complete without allowing the failed class's own handlers,
interpreter, native body, JIT or initialization to bypass the preparation gate.

Field, method and interface-method resolution impose descriptor constraints
against the actual inherited declaration owner after access checks and before
publishing CP member/constructor caches. Naming an intermediary symbolic class
does not substitute that class's loader for the declaration owner. Pure method
selection distinguishes missing implementations and conflicting defaults,
preserves private/static exclusions and runtime-package override chains, and
defers invocation errors to the actual call. Virtual execution is anchored to
the resolved declaration rather than an ambiguous string alias. Explicit
VM-native overlays have their own canonical identity without becoming genuine
class-file declarations or reflection slots.

`ci/java_loading_constraints_test.mjs` compiles the genuine driver and 38 separate
payload classes with each pinned javac 21/25. Its 31 required scenarios cover
three-loader declared/inherited constraints, scalar/array/return leaves,
inherited field/static/interface declaration owners, late descriptor loading,
failed transitive merging and corrected delegation after failure. Compiled
payloads remain resource-only `.bin` files outside the driver classpath. The
gate requires native Java, Node and Chromium on both releases and retains an
unchanged-source/compiler/runtime ledger at
`build/java-loading-constraints-results.json`, including attempted failures.

One scenario has an explicit oracle boundary: both pinned natives accept a
prepared abstract child whose selected abstract superclass and default
interface have conflicting descriptor identities. Its genuine `<clinit>` proves
native preparation completed. The stated [JVMS preparation](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-5.html#jvms-5.4.2)
and [selection](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-5.html#jvms-5.4.6)
rules instead require the inherited-owner constraint, so Node and Chromium
must reject it before initialization. Separate pinned-native and normative
profiles retain exact phase, publication and initializer traces. The ledger
explicitly identifies 30 agreement cases plus one normative-boundary case;
this is not a claim of strict native parity for all 31 cases.

```sh
yarn ci:loading-constraints:test
yarn ci:loading-constraints
```

These implementations and selected gates do not close B4. Broader member
access/resolution, evolved invocation/default-method binaries and symbolic
resolution failure caching remain subsequent batches. No Java SE or full
Phase B conformance claim follows from this selected inventory.

## Remaining boundaries

These batches do not finish B1, JVM-002 or Phase B. B2's structural corpus does
not establish B3's verification constraints; the separate B3 gates are required.
Passing the selected verifier corpus is not an exhaustive proof of every
verification rule, historical class shape or adversarial resource limit.
Remaining initialization cases include exceptional allocation during error
wrapping and broader concurrency/memory-model interactions. General linkage,
module access, hidden classes and arbitrary bootstrap behavior remain separate.
The record, sealed and final-language batches keep their existing partial status.
