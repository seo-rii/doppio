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
| B6: records | Component generic/type-annotation reflection, constructors, accessors and object methods | Selected 77-case corpus below; C still owns handles and general bootstrap foundations. |
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
./node_modules/.bin/grunt --stack modern-ci-release-cli
./node_modules/.bin/grunt --stack make_build_dir:release vite-release listings:release
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

These implementations and selected gates do not close B4. B4c below adds member
access/resolution and symbolic failure caching; evolved invocation/default-method
receiver selection remains a separate batch. A full retained regression must
also pass after the final runtime build. No Java SE or full Phase B conformance
claim follows from this selected inventory.

## B4c symbolic member resolution and access

Field resolution uses both name and complete descriptor. It searches the named
class, its direct superinterfaces recursively in declaration order, then its
superclass. A different-descriptor child field does not hide a matching inherited
declaration. Methodref and InterfaceMethodref retain their symbolic owner kind;
a class/interface kind mismatch fails with `IncompatibleClassChangeError` before
receiver-dependent invocation checks. Private declarations keep exact MemberName
metadata indices without entering virtual override selection.

Array `clone()` retains its public array-member contract even though execution
reuses the exact protected bootstrap `Object.clone` declaration. Only an actual
array symbolic owner and that exact declaration receive this exception; ordinary
protected/private access, reference-array leaf access and invocation staticness
checks remain intact. The original `Object.clone` flags are never made public.
See [JLS 10.7](https://docs.oracle.com/javase/specs/jls/se25/html/jls-10.html#jls-10.7).

Each real class CP entry retains its referring class identity. Symbolic owner
access, including reference-array leaf access, precedes member cache publication.
Runtime packages compare package spelling **and actual defining loader**. Private
access compares determined nest-host identities, not NestHost spelling. The host
must be in the same runtime package and reciprocally name the member. A missing
or invalid host determines self without initializing, verifying or preparing the
host; an earlier API-driven determination is respected by later access checks.
`Class.getNestMembers` starts with that actual host and filters members by their
actual determined host, retaining failures in the real member CP references.

Successful class/member symbolic resolution and `LinkageError` failures are
retained per CP reference; independent references remain independent. The actual
bootstrap LinkageError hierarchy decides persistence, not an error name. Other
Throwables leave the reference retryable. Receiver-dependent invocation errors
do not poison successful symbolic resolution. Waiting callbacks finish once and
receive the original guest Throwable; a transient retry cannot replace the
previous attempt's error for its remaining waiters.

Resource-error handling follows the selected pinned-native policy: an actual
bootstrap `VirtualMachineError` during host/member lookup is propagated without
a partial nest result or a completed host determination, allowing later retry.
Ordinary missing-host failures still determine self and retain their CP linkage
failure. [HotSpot's nest-host implementation](https://github.com/openjdk/jdk/blob/jdk-25-ga/src/hotspot/share/oops/instanceKlass.cpp#L250)
and genuine Java 21/25 controls establish this distinction. JVMS
[5.4.4](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-5.html#jvms-5.4.4)
describes ordinary host-resolution fallback, while
[6.3](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-6.html#jvms-6.3)
permits resource errors during VM operation; this does not assert that 5.4.4 alone
mandates the selected VME timing.

Pinned Java 8 lambda/reflection forwarding code has narrowly scoped producer
capabilities. They require actual bootstrap generator frames, captured inputs,
decoded forwarding instructions and the exact installed class. They authorize
only captured class identities, the exact target declaration and required
reflection parent constructor. Lambda-like names, MagicAccessor inheritance,
copied bytes and another loader do not convey authority. Generated declarations
still pass normal verification. The Java 8 MethodHandle nest bridge waits for
actual hosts; general Lookup-mode/MethodHandle conformance remains a C dependency.

Two distinct genuine corpora record unchanged old callers and separately compiled
replacement owners, mounted as resource-only `.bin` payloads. The
`ci/java_member_resolution_test.mjs` gate requires 30 descriptor, declaration-order,
owner-kind and array-clone scenarios per release. Clone controls cover primitive,
reference and multirank identity/shallow copying, null receivers and a separately
evolved inaccessible reference leaf, while checking bootstrap clone flags before
and after invocation. `ci/java_member_access_test.mjs` requires
37 runtime-package, array-leaf, reciprocal/invalid nest, sticky linkage failure
and transient VME scenarios per release. No caller byte patches or golden
regeneration are used. Executable CP operands at exact instruction boundaries
prove the intended owner/name/descriptor and, for the missing-host control, the
same CP entry shared by NestHost and an ordinary class literal.

```sh
yarn ci:member-resolution:test
yarn ci:member-resolution
yarn ci:member-access:test
yarn ci:member-access
```

Official gates require both native releases, Node and Chromium, a clean committed
tree and unchanged source/compiler/runtime/HEAD provenance. Attempted failures
are retained in `build/java-member-resolution-results.json` and
`build/java-member-access-results.json`. Native-only diagnostics and source unit
tests are not guest-host evidence. These commands describe required gates, not a
fresh passing result. The broader retained execution, named-module access and
general bootstrap boundaries remain explicit. B4d adds evolved receiver controls.

## B4d evolved invocation and declaring-owner initialization

The `ci/java_invocation_evolution_test.mjs` gate requires 34 scenarios per release
from genuine, separate javac 21/25 compilations. Replacement compilation changes
only designated owners. Eighteen original callers and seven original receiver
classes retain their exact bytes; all payload classes are mounted as resource-only
`.bin` files, with no caller mutations or fallback payload `.class` files.
Decoded executable operands bind the exact opcode, CP tag, owner, name and
descriptor rather than merely finding a matching constant somewhere in the pool.

The matrix covers removed defaults, subinterface reabstraction, unrelated default
conflicts, superclass `invokespecial`, a single concrete default alongside an
unrelated abstract method, and diamond/more-specific defaults. Exact inherited
class declarations win over interface defaults, including an abstract superclass
declaration that masks a default. On one unchanged caller/CP entry, an overriding
receiver succeeds before and after a conflicting receiver, a null receiver still
throws `NullPointerException`, and a repeat conflict retains its specified error.
These receiver-dependent errors must not poison successful symbolic resolution.

Special invocation has its own metadata-only selector, shared by the interpreter
and emitted JIT. For a non-constructor reference to an actual superclass, lookup
starts at the caller's direct superclass; otherwise it starts at the symbolic
owner. It does not dispatch on the receiver or reuse the virtual override
predicate. Instance declarations precede maximally-specific interface defaults,
including abstract class declarations. Java SE 8+ treats `ACC_SUPER` as set even
when the class-file bit is clear. Parsed-metadata and frame tests retain exact
private/constructor/interface targets, category-two argument slots and the
original CP declaration; their emitted-JIT controls are not a native compilation
or whole-language conformance claim.

Class/interface static-to-instance and instance-to-static evolution requires
`IncompatibleClassChangeError` before null receiver checks or initialization.
Field-kind evolution has matching controls. Static active use initializes the
actual declaration owner, not an intermediate symbolic subclass; interface
static use does not initialize an otherwise unused parent. Explicit later active
use proves that the deferred class/interface was not already initialized.
The slow instruction paths validate a resolved member's staticness and access
before installing a fast opcode. Instance fields resolve before the null check;
static fields and methods reject a wrong kind before initialization. These
instruction-local errors do not turn successful CP resolution into a cached
symbolic failure, so the same reference remains usable by a correct instruction.

There is one narrowly recorded native-oracle boundary. Pinned Java 21 reports
exact `AbstractMethodError` for the evolved `invokeinterface` unrelated-default
conflict; pinned Java 25 reports exact `IncompatibleClassChangeError`. Both guest
hosts require the latter, as specified by
[JVMS 6.5.invokeinterface](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-6.html#jvms-6.5.invokeinterface).
Actual default flags, declaring/implementing class identities, defining loaders
and stage routing are checked. Although AME is an ICCE subclass, the oracle never
accepts a generic superclass match. Explicit host/release profiles apply only to
this named case: 33/34 Java 21 cases and 34/34 Java 25 cases are parity candidates,
not a claim that all native and specified outcomes agree.

At clean `c27d38a8f`, strict CLI and browser builds, an actual JVM bootstrap
callback, and all eight B1–B4 Java 21/25 native/Node/Chromium gates pass. The
fresh retained inventory also passes 77 default and 246 modern fixtures with
original goldens and class files, unchanged HEAD and source/runtime/input
snapshots, and no unrun cases. This is selected integration evidence, not a
claim of exhaustive linking or whole-JVM conformance. The 607-test compiled
unit/contract run has 606 passes and one optional native-taxonomy skip; that
optional check passes in a separate pinned-native-enabled 13-test run.

```sh
yarn ci:invocation-evolution:test
yarn ci:invocation-evolution
```

The official gate requires both native releases, Node and Chromium, unchanged
source/compiler/runtime inputs and a clean, unchanged committed tree. It retains
attempted failures in `build/java-invocation-evolution-results.json`, with exact
host/release expectations and the documented oracle difference. Native-only runs
do not establish guest execution. These selected cases do not prove every
linking rule or complete JVM-002; broader retained execution is B5, module access
is G, and arbitrary bootstrap/Lookup behavior remains C.

## B5 selected retained execution

`ci/java_core_semantics_test.mjs` runs a fixed five-group corpus on genuine
javac 21/25 output, matching native Java with `-Xverify:all`, Node and Chromium.
Every group/release/host cell is registered before compilation. Missing,
duplicate, pruned, timed-out or otherwise incomplete cells cannot become passes.
Expected ordered traces are checked independently of native/guest agreement.

| Group | Cases per release | Selected evidence |
| --- | --- | --- |
| Numeric | 48 | Integer/long operations, binary32/64 arithmetic, comparisons and conversion boundaries, including direct long-to-float rounding. |
| Arrays and objects | 40 | Primitive/reference arrays, covariance and store failures, null/bounds/evaluation order, field/cast/identity behavior and exact nominal ConstantDesc interfaces. |
| Control and frames | 26 | Branches, switches, returns, wide locals/increments, wide constant-pool loads and actual long branch operands. |
| Exceptions | 18 | Null and non-null throws, handler selection, original Throwable identity, finally and suppression/abrupt-completion behavior. |
| Explicit stack forms | 25 | Seventeen modern category-one/two stack forms and eight explicitly mutated major-49/50 subroutine/finally payloads. |

The first 132 cases execute untouched compiler-produced bytes. The stack group
keeps its genuine modern carrier compilation outside the runtime classpath;
each resource-only payload records replayable edits, original/result hashes and
decoded operands. Historical mutations are not presented as genuine legacy
compiler output. The driver has no parent-classpath payload fallback.
Independent instruction decoding binds each ordinary entry to its reachable
parameterized probe and actual operands, rather than treating an opcode-looking
constant-pool byte as an instruction. These are static bytecode/call-graph
checks, not dynamic branch coverage or proof of JIT execution.

Both interpreter and emitted JIT throw a guest `NullPointerException` for null
`athrow` and enforce reference-array component compatibility before writing.
Null and bounds errors retain their precedence, failed stores leave the array
unchanged, and checks use actual defining-loader identities. The corrected
store check exposed a retained ConstantDesc failure: Integer, Long, Float,
Double and String had direct-call support but lacked the real interface role.
Their bootstrap overlays now append that exact role, generic interface
signature and native typed/erased bridge declarations, preserving original
members and Code. Both calls ignore null/non-null Lookup and return the receiver.
The compiler-facing bootstrap artifact carries byte-identical transformations;
Boolean, Byte, Short, Character and Object still do not acquire ConstantDesc.
This does not add Constable or general constant/bootstrap resolution.

```sh
yarn ci:core-semantics:test
yarn ci:core-semantics
```

The official command requires a clean unchanged committed tree and both releases
on all three hosts. It checkpoints raw compiler/execution failures before
integrity validation in `build/java-core-semantics-results.json`; native-only
and Node-only diagnostics use distinct, non-official ledgers. CI validates the
exact unit/host commands and timeout budgets and uploads the official ledger
even on failure. Source-index references retain their original owner and
unassessed status; passing a selected case does not close a source section.

At clean `3d6728056`, strict CLI/browser builds pass, all 157 cases pass in all
30 mandatory cells, and all twelve genuine compilation operations pass. The
compiled B1–B5 unit/contract run has 706 passes, no failures and one optional
native-taxonomy diagnostic skip. Fresh retained execution passes the original
77 default and 246 modern fixtures, with unchanged goldens, class files, HEAD
and source/runtime/input snapshots. The earlier 322/323 retained failure was
not waived or repaired by regenerating expectations. This records the selected
B5 exit, not exhaustive JVM-002 or Phase B completion.

## B6 selected records

`ci/java_record_semantics_test.mjs` executes three fixed groups on genuine
javac 21/25 output with native `-Xverify:all`, Node and Chromium. All 18
group/release/host cells are registered before compilation; missing or pruned
cases, compiler failures, timeouts and incomplete traces fail the gate.

| Group | Cases per release | Selected evidence |
| --- | --- | --- |
| Types | 29 | Raw and parameterized types, generic arrays, record-scoped type variables and recursive bounds, nested owners, wildcard bounds, complete visible type-use paths and declaration annotations, paired with ordinary fields. |
| Semantics | 40 | Implicit, explicit, compact, auxiliary and varargs constructors; accessors and defensive copies; field-based object methods, primitive/reference/array/null behavior and original component Throwable identity. |
| Lazy signatures | 8 | Genuine controls, missing generic classes, separately evolved generic arity and three explicit component-only malformed Signature mutations. |

The first two groups execute untouched compiler output. Signature carriers and
evolved generic classes compile separately outside the driver classpath; the
driver loads only exact `.bin` payloads with no parent-classpath fallback.
Malformed signatures append a UTF-8 constant and redirect only the component's
Signature index, preserving the backing field, Code, major version and unrelated
attributes. Independent replay, hashes and bounded metadata proofs bind every
mutation. Generic failures remain lazy: raw component metadata is usable before
the exact `TypeNotPresentException`, `MalformedParameterizedTypeException` or
`GenericSignatureFormatError`. Repeated queries and controlled initialization
markers are checked without requiring a newly allocated Throwable each time.

`RecordComponent` now builds lazy generic repositories with the declaring
record's scope and full component type-annotation bytes, reusing the bundled
generic and annotation machinery. Lower-bounded annotated wildcards return an
unannotated implicit Object upper bound; the target-only helper overlay retains
all original constant-pool indices and other methods. The compiler bootstrap
artifact is required to contain the byte-identical overlay. ObjectMethods'
existing field-handle fast path invokes Java virtual `toString` for reference
components and Java Float/Double conversion for primitive components, waiting
for deferred class initialization before resuming the consumed invokedynamic
frame. Original component exceptions propagate without a fabricated result.
Record hash algorithms and whole string formatting remain unspecified, so
property checks do not require one native hash or complete formatting algorithm.

```sh
yarn ci:record-semantics:test
yarn ci:record-semantics
```

The clean official browser command checkpoints raw failures before integrity
validation in `build/java-record-semantics-results.json`. Native-only and
Node-only diagnostics use different, non-official ledgers. Exact compiler
inventories, decoded executable operands and independent member/attribute
contracts are required; static reachability is not dynamic branch/JIT coverage.
CI checks the exact commands, timeout budgets and always-attempted evidence
upload. All fourteen JVM-006 source units retain their original owner,
unassessed status and false full-unit-conformance flag.

At clean `db5faa90c`, strict CLI/browser builds pass; all 77 cases pass across
18 mandatory cells and all ten genuine compiler operations succeed. Compiled
B1–B6 units/contracts pass 753 of 754 tests, with no failures and one optional
native-taxonomy diagnostic skip. B5 remains green in all 30 cells. Fresh
retained execution passes the original 77 default and 246 modern fixtures;
goldens, original class files, HEAD and source/runtime/input snapshots stay
unchanged. The earlier B6 eight-cell failure and 322/323 retained result were
fixed, not waived or repaired by changing expectations. This is the selected
B6 exit, not complete JVM-006, general ObjectMethods/bootstrap support or
Phase B conformance.

## B7 selected sealed types

`ci/java_sealed_semantics_test.mjs` registers 62 fixed cases and all 18 Java
21/25 native, Node and Chromium cells before compilation. Twenty cases cover
passive reflection and fresh arrays; twenty cover actual defining-loader,
runtime-package and direct-parent identities; twenty-two cover bounded metadata
mutations, ordinary loader failures, original VirtualMachineError propagation
and passive verification boundaries. All twenty genuine compiler operations
must succeed without compiler diagnostics. Independent readers bind original
constant-pool references, class headers, executable operands and bounded
mutation replay; generated or mutated payloads are explicitly distinguished
from untouched compiler output.

Derivation rejects unlisted children, different actual defining loaders and
non-public children in a different runtime package with exact
`IncompatibleClassChangeError`. Public cross-package children in the same
unnamed module remain accepted. Reflection resolves metadata through the
declaring owner's original constant-pool entries without preparing or
initializing children, retains only actual direct superclass/interface matches,
skips ordinary loading failures and propagates the original bootstrap
VirtualMachineError. Duplicate entries, array entries and old-major opaque
attributes have explicit pinned-native classifications; array order is not a
general specification promise. Named-module carriers are compilation-only,
not evidence for runtime module access.

```sh
yarn ci:sealed-semantics:test
yarn ci:sealed-semantics
```

The clean official command checkpoints failures in
`build/java-sealed-semantics-results.json`; diagnostics use separate ledgers.
The first full run exposed a compiler module-name warning, and the next exposed
a cached metadata failure that left an internal exception boundary above a
native frame. Neither result was waived. The exact-frame native return guard
now preserves that boundary, with actual JVMThread/NativeStackFrame/cache
regressions covering synchronous, exceptional and waiting returns.

At clean `fb2fa583e`, strict CLI/browser builds, all 62 cases in 18 mandatory
cells and all twenty compiler operations pass. B1–B7 compiled units/contracts
pass 808 of 809 tests, with no failures and one optional native-taxonomy
diagnostic skip. All eight B1–B4 host gates and B5/B6 remain green. Fresh
retained execution passes the original 77 default and 246 modern fixtures
without changing sources, class files, goldens, HEAD or input/runtime snapshots.
All eight JVM-007 source units remain unassessed with false full-unit flags.
This records the selected B7 exit, not complete sealed-type, class-file,
initialization, module or Phase B conformance.

## Remaining boundaries

These batches do not finish B1, JVM-002 or Phase B. B2's structural corpus does
not establish B3's verification constraints; the separate B3 gates are required.
Passing the selected verifier corpus is not an exhaustive proof of every
verification rule, historical class shape or adversarial resource limit.
Remaining initialization cases include exceptional allocation during error
wrapping and broader concurrency/memory-model interactions. General linkage,
module access, hidden classes and arbitrary bootstrap behavior remain separate.
The record and sealed packages remain partial beyond the selected B6/B7
evidence; final-language work follows in B8.
