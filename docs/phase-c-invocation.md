# Phase C: invocation and class metadata

Phase C owns `JVM-003`, `JVM-004`, `JVM-005` and `LIB-007` from the
[compatibility roadmap](compatibility-roadmap.md). It starts from the selected
B1–B8 loading, verification, linking and language foundation; that foundation
does not establish general method-handle, bootstrap or module conformance.
This is an ordered batch plan, not a single feature, effort estimate or new
support level. The selected C1–C6 batches and C7a–C7d5 public class-file
pipeline, control-flow/stack-map, attributes/bootstrap/fresh-pool, hierarchy
and modern instruction/frame-policy/debug relocation/declaration expansions are verified.
C7d5 closes the selected structural verification, legacy applicability and
final aggregate/nominal ABI worklist below. These finite exits do not complete
C7, Phase C or any full owner/API contract.

## Batches and dependencies

| Batch | Owner and related work | Selected exit evidence and boundary |
| --- | --- | --- |
| C1: lookup and invocation core | `JVM-003`: direct lookup/handles, exact and adaptable calls, type conversion, bounded combinator exception flow | Genuine javac 21/25 inputs and fixed semantic traces on native Java, Node and Chromium. Prove the actual symbolic descriptors and side effects, including absent effects on failure. Keep unnamed-module access separate from G. |
| C2: collection and control flow | `JVM-003`: collectors/spreaders, variable arity, argument routing and loop/combinator state | Select a finite matrix of array lengths/types, fixed-versus-variable arity, wide slots, state/helper order and throwable identities. Retain existing convenience-loop and language-consumer fixtures; their prior smoke status does not close every shape. Depends on C1. |
| C3: executable VarHandles | `JVM-003`: selected field and array access modes and handle interoperation | Establish coordinate/value types, access checks, read/write, compare-and-set/exchange and update outcomes, final/read-only rejection, bounds/null/type errors and supported-mode queries on each host. Descriptor metadata is not execution. Memory-order and concurrent visibility evidence require D's execution model and stay separate from a single-thread value matrix. Depends on C1/C2. |
| C4: user bootstrap linkage | `JVM-004`: general `invokedynamic` and `CONSTANT_Dynamic` paths | Genuine native-checked inputs with user bootstrap handles, nested arguments, adaptation/access, success/failure caching and specified error/cause identities. Independently prove bootstrap metadata and lexical call-site identity. Retain lambda, concat, record and compiler bootstrap consumers. Depends on B4 and C1/C2; VarHandle bootstrap forms also depend on C3. |
| C5: hidden classes | `JVM-005`: definition, class data, lookup privileges and reflective restrictions | Select definition/initialization, malformed bytes, privilege failures, nestmate options, runtime names/descriptors, class-data access and discovery/non-discovery cases. Preserve class/loader identity rather than comparing implementation-generated name suffixes. Depends on B2–B4 and C1; named-module cases require G. |
| C6: nominal constants | `LIB-007`: class/method/handle/dynamic/VarHandle descriptors and resolution | Verified finite 64-case original-javac 21/25 matrix: descriptors, caller-Lookup resolution, executable round trips, ordered user bootstraps and selected exact failures. Metadata-only VarHandle descriptors do not discharge C3; C6's API reinvocation is not C4 CP-entry caching. Hidden-class restrictions depend on C5. Full nominal/API/access/loader conformance remains unclaimed. |
| C7: public class-file library | `LIB-007`: Java 25 `java.lang.classfile` and its public subpackages | C7a–C7d5's selected pipeline, CFG/frames, attributes/fresh-pool, hierarchy, instruction/debug/declaration/structural profiles pass on native Java 25, Node and Chromium: 200 cases/75 cells/600 outcomes. All220 native public nominal type declarations are reconciled, including the three discontinued types. The selected worklist is closed; native sealing, general verifier breadth and full API/JVM conformance remain separate. VM-internal parsing and the test decoder are not this public API. Depends on B2/B3, C4 and C6. |

This ordering keeps invocation/adaptation foundations before their bootstrap
and descriptor consumers. C3's executable access and D's memory-model work have
different exits; neither may silently waive the other. Named-module lookup,
readability, qualified exports/opens and strong encapsulation remain owned by
`JVM-011` in G, even when the calling API belongs to C.

The source/API inventories remain authoritative. The pinned
[API census lock](../ci/java_se_api_census.lock.json) contains 682/677 projected
records owned by `JVM-003` and 294/5,703 by `LIB-007` for Java 21/25 respectively.
These are catalogue counts, not passing methods, semantic cases or percentages.
The current [spec source index](../ci/plan_spec_source_index.json) assigns no
JLS/JVMS source units directly to these four C owners. Relevant JVM linkage
clauses remain owned by `JVM-002` and serve as dependencies; C must not reassign
them merely to manufacture a source-unit pass rate. API obligations still need
their own per-contract applicability, implementation and evidence assessments.

## C1 selected scope

C1 selects related operations sharing the existing lookup and method-handle
invocation paths. Its fixed case inventory, not the API method count or one
aggregate smoke result, defines the selected batch:

- Lookup/direct handles: access capability, direct invocation and receiver/member
  identity, including rejection before target effects for selected failures.
- Invocation/adaptation: actual `invokeExact`/`invoke` call descriptors,
  reference casts and identity, primitive widening, boxing/unboxing, nulls,
  arity and return conversion/drop boundaries, including wide values.
- Combinator exception flow: bounded argument/filter/guard/catch/cleanup routes,
  exact evaluation traces and original throwable identity; an exception message
  alone is not proof of the required failure or its ordering.

These are selected matrices, not the complete conversion lattice, all lookup
modes/loaders, arbitrary combinator graphs or executable VarHandles. Named
modules, SecurityManager behavior, concurrent access ordering, general
bootstrap dispatch, hidden definitions and the public class-file library are
not C1 exits. Passing C1 must leave broader `JVM-003` and Phase C conformance
unclaimed.

The references are the pinned
[Java 21 MethodHandle API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/invoke/MethodHandle.html),
[Java 25 MethodHandle API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/invoke/MethodHandle.html),
[Java 21 Lookup API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/invoke/MethodHandles.Lookup.html),
[Java 25 Lookup API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/invoke/MethodHandles.Lookup.html),
[Java 21 combinator API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/invoke/MethodHandles.html)
and [Java 25 combinator API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/invoke/MethodHandles.html).
Resolution/invocation dependencies remain linked to
[JVMS 21 §5.4.3.5](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-5.html#jvms-5.4.3.5)
and [JVMS 25 §5.4.3.5](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-5.html#jvms-5.4.3.5).
Native execution is an independent oracle check, not permission to erase a
specification difference or infer behavior for unexecuted cases.

## C2 selected scope

C2 uses a separate fixed 48-case inventory, with 16 cases in each group:

- Array adapters: selected trailing and positioned collectors/spreaders over
  `Object[]`, `int[]`, `long[]` and `double[]`; empty/null array behavior,
  element/return identity, wide prefix/suffix routing and failure before target
  effects. Zero-length collector array sharing is deliberately not asserted.
- Variable arity and routing: lookup flags, the distinction between statically
  array-typed and `Object`-typed arguments, fixed-arity normalization,
  `withVarargs`, array/List `invokeWithArguments`, selected nonzero/wide
  collect/permute/insert/drop routes and leading-prefix spread invokers.
- Control flow: selected while/do-while, both counted-loop overloads, explicit
  and default iterators, one/two-state general loops, null/default/varargs
  helpers, exclusive table-switch branches and original component exceptions.

These are finite selected shapes, not an exhaustive array/conversion lattice,
arbitrary loop graph, maximum-slot boundary or complete API contract. The
reference documents and independent genuine compiler/host evidence follow the
same requirements as C1. C1's inventory and results remain separate.

The Java 21/25 counted-range API body pseudocode orders `end`, `start`, `init`,
while its generic-loop API Note places clauses in `end`, `init`, `start` order.
Tests observing that order or its exception barriers explicitly use
`pinned-native-regression`, not a claim to resolve the documentation conflict.
See the [Java 21 counted-range contract](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/invoke/MethodHandles.html#countedLoop(java.lang.invoke.MethodHandle,java.lang.invoke.MethodHandle,java.lang.invoke.MethodHandle,java.lang.invoke.MethodHandle))
and [Java 25 counted-range contract](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/invoke/MethodHandles.html#countedLoop(java.lang.invoke.MethodHandle,java.lang.invoke.MethodHandle,java.lang.invoke.MethodHandle,java.lang.invoke.MethodHandle)).
No other case is promoted merely by agreeing with native output.

## C3 selected scope

C3 has an independent fixed 48-case inventory, with 16 cases per group:

- Fields/static fields: all 31 access-mode names through original call-site
  descriptors; selected primitive/reference values, overflow and narrow wraps,
  exact long witnesses, identity comparisons, signed zero/observed quiet NaN,
  final/read-only rejection, inherited/private capabilities, factory and
  receiver errors, zero static coordinates and declaration initialization.
- Arrays: the same selected value families plus null/bounds checks, neighboring
  element preservation, covariant NEW-value store checks even on failed
  comparisons, nested reference elements and descriptor/adaptation failures.
- Interoperation: immutable coordinates, canonical mode types/support masks,
  access-mode names, exact/default behavior views, boxing/widening/casts,
  bound `toMethodHandle`, exact/adaptable invokers, `Lookup.findVirtual`,
  `unreflectVarHandle` without an accessible override and fixed erased
  unreflected placeholders that reject execution.

The field/static API guarantees initialization by the supported operation;
it does not prohibit earlier factory initialization. Factory/query timing is
explicitly unclaimed. Class-literal passivity, initialization by first access
and one-time actual declaration initialization are checked. Weak CAS accepts
either allowed result with its matching state; neither first-call success nor
bounded progress is required. Floating comparisons cover signed zero and an
observed quiet NaN, not arbitrary NaN payload preservation.

One mixed unsupported/type-mismatch case is a `pinned-native-regression`, not
a normative error-priority claim. The reflection-negative case uses only
`Lookup.unreflect(Method).asFixedArity()` at the erased Object/void/boolean
signatures. `Method.invoke` is excluded: the archived pinned Java 21 run wraps
`UnsatisfiedLinkError`, while 25 wraps the documented
`UnsupportedOperationException`. No cross-release exception waiver is used.
Those native-first scope corrections preceded guest execution; guest fixes
did not relax the final case IDs, traces, error expectations or timeouts.

References are the [Java 21 VarHandle API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/invoke/VarHandle.html),
[Java 25 VarHandle API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/invoke/VarHandle.html),
the release-specific Lookup/MethodHandles contracts and
[JVMS 25 §2.9.3](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-2.html#jvms-2.9.3).
Single-thread ordered-mode values do not prove memory ordering, concurrent
visibility or general atomicity. D owns that evidence. View/buffer/off-heap
handles, fences, extreme arities, complete protected/module/loader lattices,
nominal VarHandle descriptions and complete API conformance are not this exit.

## C4 selected scope

C4 has a separate fixed 48-case inventory: 16 user dynamic-constant, 16
invokedynamic and 16 linkage-error cases. It covers caller Lookup identity and
private access, ordered nested bootstrap arguments, selected primitive/wide
conversion and varargs/constructor bootstrap handles, null/reference identity,
one-time successful resolution, ConstantCallSite target capture and single-thread
MutableCallSite/VolatileCallSite target changes. Distinct instructions and
methods sharing one CP entry retain distinct lexical call-site identities.

The bootstrap instruction classes are directly generated original final-version
65/69 inputs, not rewritten javac carriers. Their drivers/support classes are
untouched genuine javac outputs. Independent Code and BootstrapMethods proofs
bind the actual instruction locations, method-handle kinds/owners and ordered
nested arguments. This is a finite user-bootstrap matrix, not arbitrary graphs,
maximal arities, concurrent linkage or cross-thread visibility.

Native-first error boundaries are explicit. Both pinned native releases retry
a user bootstrap throwing an unwrapped AssertionError. Those cases check only
the first original Error identity/pass-through; native retry policy is unclaimed.
Wrapped failures check the first cause, repeated outer error class and bootstrap
non-reexecution. Repeated wrapper/cause-object identity is not claimed: native
cached indy BootstrapMethodError loses its cause on repeat, while cached condy
retains the cause class but not the original cause object. Runtime units separately
check the VM's specified Error caching; native agreement does not close that
specification difference. No exception allowlist waives failed guest execution.

References include [JVMS 21 §5.4.3.6](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-5.html#jvms-5.4.3.6),
[JVMS 25 §5.4.3.6](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-5.html#jvms-5.4.3.6)
and the release-specific MethodHandle, Lookup and CallSite contracts. Ownership
remains JVM-004, not an expansion of JVM-003's completion claim.

## C5 selected scope

C5 independently selects 48 cases, with 16 per group:

- Definition: full-privilege and reduced-mode Lookup boundaries, passive/eager
  initialization, malformed/version/package failures, interfaces, STRONG and
  NESTMATE options, and genuine unchanged self-descriptor verification failure.
- Identity: repeated definitions/instance isolation, actual this_class literals
  versus unchanged ordinary self-type descriptors, names/packages, held-component
  arrays, non-discovery, nest membership/private access, reflection and
  MethodHandle invocation, hidden-final write restrictions and C3 VarHandle reads.
- Class data: exact stored identity and initialization, absent data, selected
  reference casts, primitive unboxing/widening and failures, original mutable
  List indexing, and ORIGINAL authority before disclosure or initialization.

All valid definition payloads are unchanged original javac 21/25 class files.
Negative API requests explicitly copy bytes for malformed/future-version cases;
they do not rewrite the valid compiler inventory. Only the original this_class
entry receives a hidden identity at runtime. Self-type descriptors still name
the ordinary class, so returning hidden this to such a descriptor is a genuine
VerifyError rather than a reason to rewrite descriptors or waive verification.
Raw payload Code and exact resource-loader operands are replayed independently
of the runtime. Generated hidden name suffix values are never compared.

Hidden classes/arrays stay out of named and initiating loader namespaces.
NESTMATE uses the actual defining Lookup's resolved host, not the payload's raw
NestHost, and does not add a discoverable NestMembers name. All nine reflected
Field write families and Lookup.unreflectSetter reject hidden finals, including
accessible private-alias Method/MethodHandle routes; ordinary/mutable fields
retain their stock paths. STRONG retention is implemented, but collection,
unloading and weak-versus-strong GC behavior are not proven.

The classDataAt bounds contract checks the specified IndexOutOfBoundsException
family, not a concrete exception subtype chosen by a List implementation. The
pinned native ArrayList throws IndexOutOfBoundsException for a negative index;
the retained guest List
throws its allowed ArrayIndexOutOfBoundsException subtype. Other selected
failures retain exact exception-class checks. Arbitrary raw InnerClasses
reflection fidelity, mixed-invalid-input priority, SecurityManager and
named-module authority are outside this batch.

References are the [Java 21 hidden-definition Lookup API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/invoke/MethodHandles.Lookup.html),
[Java 25 hidden-definition Lookup API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/invoke/MethodHandles.Lookup.html)
and [Java 25 classDataAt contract](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/invoke/MethodHandles.html#classDataAt(java.lang.invoke.MethodHandles.Lookup,java.lang.String,java.lang.Class,int)).
JVM-005 owns this finite evidence; C6 nominal resolution, G's module model and
GC/unloading remain separate.

## Evidence and retained compatibility

The C1–C6 gates must retain the original input recipes and raw outcomes
from each applicable release and host, with source, class, runtime, toolchain and Git
provenance. Fixed expected traces and completion markers must be checked
independently of native-versus-guest equality. Two equally incomplete runs cannot
pass by agreeing. Failed compilation or execution, timeout, missing cases,
filtered hosts and incomplete output fail the selected gate.

Class-file proofs must bind the actual source and original compiled/generated inventory,
then decode relevant method/field references, signature-polymorphic call
descriptors and wide-slot instructions independently of runtime execution.
Changing a class major version, injecting a carrier class or substituting a
shim probe for an unexecuted operation is not genuine 21/25 evidence. Shared
library shims and native/runtime implementation paths stay separately described
in the [invoke design](design/java-lang-invoke.md). C4's original generated
instruction classes are explicitly distinguished from its untouched javac
drivers; C5's original javac definition payloads have a separate raw-byte proof.

Retain the original Java 8 invocation/lambda corpus and Java 17 lookup,
lookup-mode/private-lookup, unreflect, conversion, combinator and control-flow
fixtures. Kotlin and Scala method-handle/bootstrap smoke paths are independent
language-consumer gates. Their existing presence in the repository is not a
fresh batch result. A runtime change must rerun the affected retained groups and
the batch-boundary regression gates with unchanged sources, goldens and class
files; record exactly which checks were actually executed.

For later batches, use the respective
[VarHandle API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/invoke/VarHandle.html),
[hidden-class Lookup API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/invoke/MethodHandles.Lookup.html),
[constant API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/constant/package-summary.html)
and [public class-file API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/package-summary.html)
contracts. In particular, `java.lang.classfile` exposes models, builders and
transforms; Doppio's own class-file reader does not provide those Java APIs.

## Reproduce and interpret C1

With the existing build prerequisites and prepared pinned toolchains:

```sh
./node_modules/.bin/grunt --stack modern-ci-release-cli
./node_modules/.bin/grunt --stack make_build_dir:release vite-release listings:release
yarn ci:methodhandle-core:test
yarn ci:methodhandle-core
```

The required host command is
`node ci/java_methodhandle_core_test.mjs --browser`; its durable ledger is
`build/java-methodhandle-core-results.json`. The workflow runs the dedicated
contract tests first, then the full release/host gate, and uploads the raw
ledger after success or failure. The workflow checker rejects diagnostic
subsets, host/release pruning, error swallowing, scheduling waivers and
missing/cross-wired artifacts. A local native-only or Node-only diagnostic
cannot replace the required native/Node/Chromium matrix.

## Reproduce and interpret C2

After the same strict CLI/browser builds and pinned-toolchain preparation:

```sh
yarn ci:methodhandle-collection:test
yarn ci:methodhandle-collection
```

The full command is `node ci/java_methodhandle_collection_test.mjs --browser`;
its ledger is `build/java-methodhandle-collection-results.json`. All six
release/group recipes and 18 native/Node/Chromium cells are mandatory. The
shared evidence protocol retains C1's compiler, raw failure, Code operand,
ordered trace and source/runtime/toolchain/Git integrity checks. Separate
literal inventories and ledger namespaces prevent C1/C2 substitution; their
contract suites exercise the same adversarial checks. Filtered diagnostics
never replace official results or claim a full Phase C/API exit.

## Reproduce and interpret C3

After the same strict CLI/browser builds and pinned-toolchain preparation:

```sh
yarn ci:varhandle-execution:test
yarn ci:varhandle-execution
```

The dedicated test command includes the contract, storage, linkage, native
boundary and actual compiled API metadata tests. The full execution command is
`node ci/java_methodhandle_varhandle_test.mjs --browser`, with ledger
`build/java-methodhandle-varhandle-results.json`. Six genuine compiler recipes
and all 18 native/Node/Chromium cells are mandatory. C3 has its own literal
inventory and official/diagnostic namespaces; C1/C2 cannot substitute for it.
CI uploads the raw official ledger after success or failure. The workflow
checker rejects omitted unit files, filtered/diagnostic commands, error
swallowing and cross-wired artifacts. All broad completion flags remain false,
including C3's explicit memory-order/concurrent-visibility flags.

## Reproduce and interpret C4/C5

After the same strict CLI/browser builds and pinned-toolchain preparation:

```sh
yarn ci:bootstrap-linkage:test
yarn ci:bootstrap-linkage
yarn ci:hidden-class:test
yarn ci:hidden-class
```

The mandatory full-host commands are
`node ci/java_methodhandle_bootstrap_test.mjs --browser` and
`node ci/java_methodhandle_hidden_class_test.mjs --browser`. Their separate
official ledgers are `build/java-methodhandle-bootstrap-results.json` and
`build/java-methodhandle-hidden-class-results.json`. Each requires all six
release/group input recipes and 18 native/Node/Chromium cells. C4 retains both
its original-generator and genuine-javac recipes; C5 retains the genuine-javac
recipes and original definition-payload/resource proofs.

C4's dedicated tests include its contract and runtime linkage units. C5's
include its contract, actual parser/loader/runtime, compiled API metadata and
real invocation-entry guard units. CI requires the exact files and full-host
commands and uploads each raw ledger after success or failure. Separate
inventories/namespaces prevent C1–C6 substitution; missing, stale, dirty,
pruned or cross-wired evidence fails. Diagnostic/native-only ledgers cannot
replace the official gates. All broader flags remain false, including C4's
concurrent/maximal-arity and C5's GC/named-module flags.

## C1 verified batch exit

At clean implementation commit `a99d5f74f`, the selected C1 gate passes on the
pinned Java 21/25 toolchains and both guest hosts:

- 60 fixed cases: 18 adaptation, 10 invocation, 16 lookup and 16 combinator cases.
- Eight genuine compilations, 24 untouched class files (majors 65/69, minor 0)
  and 158 case-linked Code probes. Shared helper probes may repeat; this is not
  a count of distinct methods or dynamic branch coverage.
- All 24 native/Node/Chromium execution cells and 360 case outcomes pass, with
  no failed, missing, skipped or timed-out required executions.

The verified ledger SHA-256 is
`7998b646585d647bb45748796353875b578dc7a6044f035f7a83728db04aeedd`.
It binds the original compiler recipes, class inventory, actual Code operands,
fixed traces and source/toolchain/runtime/Git provenance. This identifies the
2026-10-11 execution at that implementation commit; it is not evidence for an
arbitrary later runtime or a replacement for a fresh gate run.

The first pre-fix run at `f721db405` recorded 20 passing and four failed cells:
the two guest hosts evaluated multiple `filterArguments` filters in reverse
order on both releases. Its raw failed ledger remains preserved (SHA-256
`1bcd4746c6843bb7ea1d885f90ec7c2d5156bbf5bb5260aa423bea8d514d0d2d`).
The corrected path wraps filters in reverse construction order to execute them
left-to-right. It reuses the stock single-filter factory and retains the public
method's original flags and non-Code attributes. Regression subchecks retain
the original expectations and add no-op/null-filter identity, nonzero positions,
null gaps, three-filter order, caller-array mutation isolation, selected
wide/type-changing unary filters and first/later throwable barriers.

The same clean implementation also passes:

- Strict release CLI/browser builds, ES5 type checking, the actual workflow
  checker and its mutation tests.
- 853 unit/contract tests; one existing optional JDK error-category diagnostic
  is skipped (854 total, zero failures).
- All 15 B1–B8 and retained-language/launcher/evolved-switch host gates, including
  the previously selected explicit Java 21 oracle difference in B4.
- The original 323 fixtures (77 legacy and 246 modern), with sources, class
  files, goldens and all four input snapshots unchanged; zero failures/timeouts.
- The selected Kotlin 2.4.0 and Scala 2.13.18 MethodHandle compiler smokes,
  compiled inside Doppio and checked on Node against native Java 17 using
  lock-verified compiler inputs. These are separate selected consumer checks,
  not a Chromium/compiler-language conformance claim.

The overlay tests preserve all 113 previous generated bodies and the complete
stock single-filter method. The new straight-line delegate yields 114 generated
bodies and 1,271 unchanged stock Code attributes across 36 transformed classes;
all 1,385 Code methods still pass independent decoding/type verification.

C1's selected batch is verified. All broader completion flags remain false:
full Phase C, JVM-003, source-unit/API conformance, general bootstrap dispatch,
VarHandle execution and named-module runtime conformance are not established.
Indexed source ownership remains unchanged. At that C1 exit, C2–C7 remained
pending; the later selected C2 exit follows.

## C2 verified batch exit

At clean implementation commit `be7cb5dc2`, the selected C2 gate passes on the
pinned Java 21/25 toolchains and both guest hosts:

- 48 fixed cases: 16 array-adapter, 16 variable-arity/routing and 16 control-flow
  cases, with 91 selected ordered trace events.
- Six genuine compilations, eight untouched class files (majors 65/69, minor 0)
  and 192 case-linked Code probes. Shared helper probes may repeat; these are
  not distinct-method or dynamic-branch counts.
- All 18 native/Node/Chromium execution cells and 288 case outcomes pass, with
  no failed, missing, skipped or timed-out required executions.

The 2026-10-11 UTC verified ledger SHA-256 is
`b6e079d0d5a3a116797e28279e44e379bea9b931fc7d42b4fc6f2dae328f68d0`.
It binds the original compiler recipes, class inventory, actual Code operands,
fixed traces and source/toolchain/runtime/Git provenance at that implementation
commit, not an arbitrary later runtime.

The pre-fix native/Node diagnostic at `ac5b61f79` recorded six passing native
cells and six failed Node cells; Chromium was not run in that diagnostic. Its
raw failed ledger remains preserved (SHA-256
`795086b307890c76bc2012a1af3bf6593f01b426525f815302a68e712a6d64ce`).
Three runtime differences were corrected without relaxing the original case,
trace, throwable or timeout expectations:

- `MethodHandle.withVarargs(boolean)` now has a parsed public, non-native,
  non-final delegate. Same-mode calls preserve identity; switching to fixed
  arity uses `asFixedArity`, and switching to variable arity uses the exact
  trailing array type with `asVarargsCollector`.
- The stock spread validator redirects only its positive-length null branch
  to `NullPointerException`. Null/zero behavior and all non-null instructions
  remain unchanged, including the existing length-mismatch exception paths.
- Explicit counted ranges now evaluate `end`, state initialization and `start`
  in the pinned native order. The three order-sensitive cases remain explicitly
  classified as `pinned-native-regression` because of the API documentation
  conflict described above.

The same frozen implementation also passes:

- A fresh C1 full-host run: all 60 cases, 24 cells and 360 outcomes, with ledger
  SHA-256 `ccf6d171fbf3f5ae4f772dc34cf5b205cfd1ea2f34fb901b06a80734040a67fe`.
- Strict release CLI/browser builds, ES5 type checking, the actual workflow
  checker and its mutation tests.
- 875 unit/contract tests; one existing optional JDK error-category diagnostic
  is skipped (876 total, zero failures).
- All 15 B1–B8 and separate retained-language/launcher/evolved-switch host
  gates, including the previously selected explicit Java 21 oracle difference.
- The original 323 fixtures (77 legacy and 246 modern), with sources, class
  files and goldens unchanged, zero failures/timeouts and four identical input
  snapshots (SHA-256
  `3aa53f9f71542b5ea9fb2780d84e552f7ea025f8eda39cdbbb1235b2d15f4cda`).
- The selected Kotlin 2.4.0 and Scala 2.13.18 MethodHandle compiler smokes,
  compiled inside Doppio and checked on Node against native Java 17 with
  lock-verified compiler inputs. These do not claim Chromium or complete
  compiler-language conformance.

The overlay verifier checks 116 generated/rewritten bodies and 1,344 unchanged
stock Code attributes: all 1,460 Code methods across 37 transformed classes,
including 12 branchful bodies with 48 explicit full frames. Historical generated
body identities, all stock MethodHandle methods and the other 73 MethodHandleImpl
methods are retained. The compiler-only bootstrap JAR separately contains 41
exact class-only entries.

C1 and C2 retain separate inventories and ledgers while sharing the immutable
evidence protocol. At that C2 exit, C3–C7 remained pending; the later selected
C3 exit is recorded below.
Full Phase C, JVM-003, source-unit/API conformance, general bootstrap dispatch,
VarHandle execution and named-module runtime conformance remain unclaimed.
All broader completion flags stay false and indexed source ownership is
unchanged. That historical C2 result did not establish executable VarHandles;
memory ordering still requires D's separate execution-model evidence.

## C3 verified batch exit

At clean implementation commit `15bbeab5b`, the selected C3 gate passes on the
pinned Java 21/25 toolchains and both guest hosts:

- 48 fixed cases: 16 field/static, 16 array and 16 interoperation cases, with
  72 selected ordered trace events.
- Six genuine compilations, 16 untouched class files (majors 65/69, minor 0)
  and 186 case-linked actual Code probes. Repeated helper probes are not
  distinct-method, dynamic-branch or JIT-coverage counts.
- All 18 native/Node/Chromium cells and 288 outcomes pass, with no failed,
  missing, skipped or timed-out required executions.

The 2026-10-12 UTC verified C3 ledger SHA-256 is
`a7b1e090a299c623f58d01fac0d9d25edb420ae160f388b7d52e40afe80828b4`.
It binds original sources/compiler recipes, class inventories, decoded Code
operands, fixed traces and unchanged toolchain/runtime/Git provenance at that
implementation, not an arbitrary later runtime.

Three failed native/Node diagnostics remain archived: the native map registrar
ABI (`b466ce4fbc476a409f33d71084641bfb27cb11059f610f820560339e6435bc71`),
illegal bootstrap helper lookup (`d493835420fd9cd5180d65d5ff43446db89e745d314712d601339839fff80a39`)
and field factory error taxonomy (`e33189e56c112bf77f46accac95d342bd56e1788f0ba852e59831e3af32bf2cf`).
Chromium was deliberately not run in those diagnostics. Corrections retained
all final expectations: ordinary native method maps, two fixed private
bootstrap member bridges and independent exact Field/type/staticness
validation with checked factory errors. Caller field authorization remains on
the supplied Lookup; the broader retained getter/Unsafe paths were not rewritten.

The same frozen implementation also passes:

- Fresh C1 and C2 full-host gates: 360 and 288 outcomes respectively. Their
  separate ledger SHA-256 values are
  `1e9199da9dcefad13d6bfa641898c7b821fa6f6fc71c8250b810721571f7d034`
  and `734d3452aac5e171e9850d4d658d895044414aa57113bcb842ddc0761ef671b6`.
- Strict release CLI/browser builds, ES5 type checking, the actual workflow
  checker and complete mutation tests.
- 982 unit/contract tests; one existing optional pinned-JDK error-category
  diagnostic is skipped (983 total, zero failures). No required C3 test skips.
- All 15 B1–B8 and separate retained-language/launcher/evolved-switch host gates.
- The original 323 fixtures (77 legacy, 246 modern), with source/class/golden
  bytes unchanged and zero failures/timeouts. All four supervisor input
  snapshots plus the launch snapshot are identical (SHA-256
  `a2372a93ad9668c844eafa35caaa8e50ff0aea36500834d11ef534fc276421d5`).
- Selected Kotlin 2.4.0 and Scala 2.13.18 MethodHandle compiler smokes, compiled
  inside Doppio and checked on Node against native Java 17 with lock-verified
  inputs. These do not establish Chromium or complete language conformance.

The overlay verifier checks 123 generated/rewritten bodies plus 1,344 unchanged
stock Code attributes: all 1,467 Code methods across 37 transformed classes,
including the unchanged 12 branchful bodies/48 full frames. Historical 113/112
generated-body hashes remain identical; the original complete Lookup
`findVirtual` body is retained under a private alias. The compiler-only
bootstrap JAR remains a separate exact 41-class inventory.

The Pro consultation failed before chat creation because the model picker was
unavailable; no Pro review exists. Independent local architecture/API/native
reviews and original native/guest executions supplied the actual review and
verification evidence. No persistent login or shared broker state was changed.

At that C3 exit, C4–C7 remained pending and no broader owner/API, module or
memory-model claim was made. The later selected C4/C5 exits follow; indexed
source ownership remains unchanged.

## C4 verified batch exit

At frozen implementation `8d38c63e2`, all 48 selected C4 cases pass in all 18
pinned Java 21/25 native/Node/Chromium cells: 288 outcomes, zero failed,
missing, skipped or timed-out required executions.

Six isolated release/group directories retain original-generation and
genuine-javac recipes for 24 class-file artifacts (65/69, minor 0): six original
generated Calls inputs and 18 untouched
javac driver/support outputs. Shared support artifacts repeat, so these are
not 24 distinct binary names. Independent proofs bind 200 actual-Code probes
and 108 constrained dynamic instruction locations to bootstrap handles/ordered
nested arguments, including distinct lexical sites sharing one CP index.
Neither repeated probes nor payload decoding is dynamic branch/JIT coverage.

The official ledger SHA-256 is
`e79f4979c2925fa688d578ac9c8945f38ec646aea0578a6fbc6d1f78b1e0032e`.
It binds original recipes, bytes, fixed traces and source/toolchain/runtime/Git
provenance at this implementation, not an arbitrary later runtime.

The first native/Node diagnostic at `1ad64afa3` retained passing native and
condy/error cells but failed the volatile target-update cases with the missing
setCallSiteTargetVolatile native. Its raw failure is archived as SHA-256
`d2f0145ca3e2b472f0dc684be2021923b1e57b2caca80d22f34bbe2af23419c1`;
Chromium was not run. The fixed exact-site target hook preserves the public
stock type/null validation and one-bootstrap policy. Runtime/registration
units and the fresh full-host gate pass without changing C4 expectations.

Native-first unwrapped-Error retry and repeated-wrapper/cause boundaries remain
the explicit exclusions above. Specified guest Error caching is independently
unit-tested, not inferred from conflicting native retries. Concurrent linkage,
maximal arity, cross-thread visibility and complete JVM-004 remain unclaimed.

## C5 verified batch exit

At the same frozen implementation, all 48 independent C5 cases pass in all 18
pinned Java 21/25 native/Node/Chromium cells: 288 outcomes with no failed,
missing, skipped or timed-out required executions.

Six genuine compilations retain 26 untouched class-file artifacts (65/69,
minor 0), 234 case-linked Code probes and separate raw-byte/resource proofs
for 14 payload artifacts and all 34 payload Code methods. Shared support
outputs repeat; payload inventory is not a count of successful hidden
definitions or dynamic branch coverage. No valid payload headers, descriptors
or instructions are rewritten to obtain the comparison results.

The official C5 ledger SHA-256 is
`b70fe55c26a76e16f6cd1ab7f39dcbc9239583d640f3eb59085177b07245b6dd`.
It binds original payload/compiler/resource recipes, fixed traces and unchanged
source/toolchain/runtime/Git inputs.

The first native/Node diagnostic at `1ad64afa3` failed hidden final-field reads
and an over-specific negative-index exception assertion. The raw failure is
archived as SHA-256
`5ba3e43d250e14f57ca6e30e2f613f681d612963f90758a960c1894d560f2b48`;
Chromium was not run. Hidden Field storage keys are now rebound to the actual
declaring identity before constructor generation, retaining original self-type
descriptors. The shared alias guard also accepts ordinary partial VM method
declarations, restoring the unchanged retained reflection unit.

A separate original native/Node bounds diagnostic establishes the specified
IndexOutOfBoundsException family: native negative ArrayList access throws that
class, while the retained guest throws its ArrayIndexOutOfBoundsException
subtype. Only this concrete-subtype overconstraint was corrected; exact other
error checks remain. No List implementation rewrite, exception reallocation,
allowlist or host waiver was added. The final full-host gate checks the fixed
family trace and the underlying failing operation.

Full-privilege definition and ORIGINAL data access, exact stored identities,
initialization, arrays/non-discovery, selected NESTMATE/STRONG and hidden-final
reflection/MethodHandle/VarHandle restrictions are verified in the bounded
matrix. GC/unloading, named modules, SecurityManager, arbitrary raw InnerClasses
reflection fidelity, mixed-invalid-input priority and complete JVM-005 remain
unclaimed. Empty hidden Class constables are a C5 restriction, not C6 resolution.

## C4/C5 shared verification and remaining work

At the historical C4/C5 exit, clean implementation `8d38c63e2` also passes:

- Fresh C1/C2/C3 full-host gates: 360/288/288 outcomes, with separate ledgers
  SHA-256 `6bd1bbe6d7049c991218c52e3e531f4701be645a17b28e0d71c73dfcc6f47196`,
  `4149a7769c6d378af38d1947b9e234f9c33dbc1741d2c5c0d956005d2a5234b5` and `38db036259e94724a5bde2230dc397bdd7c4d5cdb80c9b8a5e3bccfca928ac88`.
  C1–C5 total 252 distinct selected cases, 96 cells and 1,512 outcomes; these
  are finite-case counts, not API/spec coverage percentages.
- Strict release CLI/browser builds, ES5 type checking, the actual workflow
  checker and complete workflow mutation tests.
- 1,118 unit/contract tests, zero failures; one existing optional pinned-JDK
  error-category diagnostic is skipped (1,119 total). No mandatory C4/C5 skip.
- All 15 B1–B8 and separate retained-language/launcher/evolved-switch host gates;
  their existing explicit native-oracle/launcher boundaries are unchanged.
- All original 323 fixtures (77 legacy, 246 modern), with unchanged source,
  class and golden bytes and zero failures/timeouts. All four supervisor
  snapshots plus launch are identical, SHA-256 `1374743371c3d5e2af3bab49f9446b28e4ea7ea9553a61bc848785fec82ab92f`.
- Selected Kotlin 2.4.0 and Scala 2.13.18 MethodHandle compiler smokes, compiled
  inside Doppio and checked on Node against native Java 17 with lock-verified
  inputs (389/268 seconds). These do not claim Chromium/full language support.
- Two forced deterministic compiler-JAR generations with 43 exact class-only
  entries and SHA-256
  `0db0822f6f71bb10a9102c40ccf5c87fc785d1b2c7e24d4772f7afc6ffc28bd5`.

The overlay verifier independently checks 138 generated/rewritten Code bodies
and 1,387 byte-identical stock bodies: 1,525 total across 38 selected stock
classes. Eleven C5 aliases retain complete original Code/StackMapTable bytes.
Historical 113/112-body hashes and twelve branchful bodies/all 48 frames remain
unchanged. This scoped metadata inventory is separate from the 43-entry
compiler-facing projection and from semantic outcome counts.

The private fail-closed final verification receipt has exit code 0 and SHA-256
`af95b7205ab1bcc2b969dab62e5cf7af795012cc18218d9295670cf78cbd9af8`;
it verifies fully exited supervisors, exact frozen HEAD,
all five official ledgers, the unchanged retained inputs and final runtime bytes
before documentation-only commits. Runtime snapshot SHA-256 is
`47c694675afb5a9aff80f8e40725592a5123d3df3bc7675581f12a729464900e`.
The Pro consultation failed at the model picker before chat creation, so no Pro
review exists. Independent local reviews and genuine native/guest execution
are the review evidence; shared login/broker state was not changed.

At that historical exit, selected C1–C5 were verified and C6/C7 remained
pending. The following C6 exit supersedes that scheduling status, not those
dated hashes or counts.

## C6 selected nominal constants

C6 belongs to `LIB-007`; the existing spec-source ownership and JVM-003/004/005
boundaries are unchanged. Its catalogue contains four independent 16-case
groups compiled from original sources with genuine javac 21/25 (major 65/69,
minor 0). No carrier class or version-header rewrite substitutes for execution.

- Types: ClassDesc internal/binary/array/nested factories, selected rank and
  validation families, MethodTypeDesc no-argument/List factories and immutable
  transformations, covariant/erased resolution, reduced caller-Lookup access
  and actual hidden-class/array/MethodType non-nominality.
- Handles: all eleven direct-kind metadata entries, selected constructor,
  field/static/virtual/special/interface resolution and wide execution, asType,
  covariant/erased bridges and actual MethodHandle constable round trips.
  Private/access failures and hidden/bound non-nominal capabilities are
  checked without substituting a name-only lookup.
- Dynamic constants: selected canonical null/primitive/enum values and genuine
  user bootstrap handles, supplied Lookup/name/type identities, ordered nested
  arguments, repeated uncached API resolution, wide varargs/null results,
  Error identity, checked-exception causes and ORIGINAL hidden-class data.
- VarHandles: genuine nested VarHandleDesc metadata and executable instance,
  static and array resolution, wide/reference storage, selected access/type/
  staticness/final failures, describeConstable and canonical round trips,
  passive resolution, exact/loose invocation-behavior views and hidden
  non-nominal held capabilities.

Resolution uses the actual supplied Lookup and captured member/type/loader
identities. Private metadata projections do not grant IMPL_LOOKUP or let guest
names acquire arbitrary VM declarations. Covariant public resolvers and their
genuine javac Object bridges are independently checked. MethodType descriptor
strings use held ClassData identity, preserving hidden descriptor syntax;
the entire original stock Code remains under an exact private synthetic alias.

DynamicConstantDesc's user-bootstrap fallback resolves and invokes real handles
in argument order. Existing selected ConstantBootstraps fast paths remain
separate; they have not been replaced wholesale or proven generally conformant.
Repeated API resolution intentionally has no cache, unlike C4's constant-pool
entry linkage. The erased declared-String/returned-Integer result case records
pinned-native API behavior, not CP-ldc conversion or a general type contract.

The type/dynamic/VarHandle drivers explicitly initialize canonical
`ConstantDescs.CD_int` before their cases. Native 25 primitive-first cold
initialization can fail during a ConstantDescs/PrimitiveClassDesc cycle;
that order is not claimed. Empty method
descriptor and missing MethodType member-type exception categories differ
between the pinned 21/25 JDKs and are excluded from the shared exact-error
matrix. Shared malformed method descriptors use `(I)Q`; there is no exception
whitelist, oracle normalization or hidden-name-suffix comparison.

### Reproduce C6

```sh
yarn ci:nominal-constant:test
yarn ci:nominal-constant
# Equivalent mandatory host command:
node ci/java_methodhandle_nominal_constant_test.mjs --browser
```

The official ledger is `build/java-methodhandle-nominal-constant-results.json`.
All eight release/group recipes and 24 native/Node/Chromium cells are mandatory;
the Chromium gate also exercises its worker path. Native-only/diagnostic
ledgers cannot replace it. CI requires the exact five C6 unit files and full-
host command, and retains raw evidence after either success or failure.

## C6 verified batch exit

At clean implementation `0aa57359396af0121bd82a017a162a217297075f`:

- All 64 C6 cases pass in 24 cells: 384 mandatory semantic outcomes, zero
  failures/not-run cells. The official C6 ledger SHA-256 is
  `a32e513badc46afd94080ce62c6662e1b6c67a192df163ce4886deb4db156a14`.
- Eight original javac compilations retain 42 class-file artifacts and 248
  case-linked Code probes. Independent original-byte proofs bind eight hidden
  payload artifacts/all 20 payload Code methods, eight resource drivers and
  eighteen companion artifacts/76 selected companion Code methods. Repeated
  outputs are artifacts, not distinct binary names or hidden definitions.
  These proofs do not establish opaque static reachability or dynamic branch
  coverage; the dynamic main companion inventories selected bootstrap methods,
  not its entire member table.
- Fresh C1–C6 official gates share the same implementation/runtime: 316 distinct
  selected cases, 120 release/host cells and 1,896 mandatory outcomes. These are
  finite-case counts, not API/spec coverage percentages.
- Strict release CLI/browser builds, ES5 checking, the actual workflow checker
  and complete workflow mutation tests pass. Full boundary units report 1,200
  passes, zero failures and one existing optional pinned-JDK diagnostic skip
  (1,201 total); no mandatory test is skipped.
- All 15 B1–B8 and separate retained-language/launcher/evolved-switch host gates
  pass, without changing their explicit native-oracle boundaries.
- All original 323 fixtures (77 legacy, 246 modern) pass with unchanged source,
  class and golden bytes and no failure/timeout. The five retained inventory
  snapshots are identical, SHA-256
  `34eac0e0f791ebfcaa644cf4e225f6952fb6a1765c56e62231ae338e9ea28120`.
- Lock-verified Kotlin 2.4.0 and Scala 2.13.18 MethodHandle compiler smokes pass
  inside Doppio and match native Java 17 on Node (544/387 seconds). The initial
  Kotlin 900-second compile timeout with concurrent retained controls remains
  recorded as exit 124; an isolated same-source/input/limit rerun passes. No
  failure is waived and no particular cause, descriptor String cache/identity,
  Chromium compiler support or full language conformance is inferred.
- Two forced compiler-JAR generations agree: 44 exact class-only entries,
  SHA-256 `caa9598e266120414c393b6b03a1158988fe42d12a626a1482685f3d33434daa`.
  The independent stock verifier checks 39 classes and 1,601 Code bodies:
  141 generated/rewritten, 1,460 byte-identical retained. Eleven C5 aliases plus
  the new MethodType alias preserve original Code; historical 113/112-body
  hashes and all 48 frames in twelve branchful bodies are unchanged.

The private fail-closed final verification receipt has exit code 0 and SHA-256
`e153c8877c69d0eb5b36df7e03366a177794ff20f587d79110146a9c71a0e484`.
It binds fully exited supervisors, exact frozen HEAD,
all six official ledgers, retained inputs and final runtime bytes before any
documentation-only commit. Its local path is
`/home/seorii/logs/doppio-phase-b-c1regressions-F2Ald9/verification-summary.json`.
Runtime snapshot SHA-256 is
`10f2112056a431039b1074e36c86b8131886ab12653500f08f60dfe7485193ed`.
The C6 Pro consultation failed at the model picker before chat creation;
no Pro review exists and shared login/broker state was not changed.

At that historical C6 exit, C7's public class-file library was next. The
selected C7a exit below supersedes that scheduling status, not the historical
proof. Full Phase C/LIB-007/JVM-003/004/005/source-unit/API conformance,
arbitrary nominal bootstrap/loader/access/conversion families, maximal arity,
memory ordering, concurrency, named modules and hidden-class GC remain
unclaimed. All broader completion/conformance flags stay false.

## C7a selected public class-file pipeline

C7a belongs to `LIB-007`; API/source ownership remains unchanged. It implements
a real Java class library under `java.lang.classfile`, not the VM's internal
parser, an ASM adapter or a test-side decoder. The final
[ClassFile API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html)
is available since Java 24. This selected gate uses original javac 25 inputs
and native Java 25, Node and Chromium; Java 21 is explicitly non-applicable,
not a skipped or passing cell. No Java 24 execution claim is inferred.

Four independent original-source recipes contain eight cases each:

- Parse/model: class version/name/flags, superclass/interfaces, field and method
  metadata, bodies and iteration, SourceFile/parent identity, pool indices and
  wide two-slot holes.
- Build: empty-class definition and executable int, long, double, String and
  constructor/field bodies; explicit pool construction and SourceFile last-wins.
- Transform: accept-all/drop-method/selected rename/SourceFile replacement,
  targeted constants, end-of-stream method insertion, composed forwarding and
  original callback exception propagation without an output artifact.
- Verify/errors: valid original Code and a real typed-invalid body, byte/model
  verification, malformed magic/prefix, exact invalid pool indices/types,
  primitive build rejection before callbacks and null parsing.

The Java reader checks framing, modified UTF-8, constant-pool tags/indices and
two-slot entries, retaining immutable bound models and defensive source bytes.
The writer emits actual pools/members/Code and category-2 slots. Shared-pool
raw copies require the exact held source pool: byte-equal independent pools
and divergent sibling builders cannot acquire raw-copy authority. Regenerated
Code drops stale offset/frame/debug attributes. Transform composition forwards
produced compound elements through downstream callbacks.

At the historical C7a implementation `bed25a30e`, the pure-Java verifier checked
selected straight-line stack/local types, category-2 overlap,
return/bounds/fall-through and constructor initialization identity. It never
used class definition or initialization as its verdict. Unsupported
control-flow, handler/frame and hierarchy families failed explicitly; an empty
error list was not a silent unsupported result. Forced `GENERATE_STACK_MAPS`
build/transform rejected with `UnsupportedOperationException` before callbacks;
`NEW_POOL` transformation rejected with `IllegalArgumentException`.
The selected C7b and C7c exits below supersede the control-flow/forced-generation
and fresh-pool restrictions, not this historical C7a evidence.

| Historical C7a follow-up | Selected work remaining at that exit |
| --- | --- |
| C7b | [Selected labels/control-flow/handlers/stack-map exit verified below](#c7b-verified-batch-exit); broader CFG/frame families remain unclaimed |
| C7c | [Selected extended/custom attributes, bootstrap/indy/condy and fresh-pool exit verified below](#c7c-verified-batch-exit); unselected attributes/mapper families remain open |
| C7d | Hierarchy/resolvers, general verifier breadth and remaining public ABI/reflective topology |

At that exit the remaining ABI included `ConstantInstruction.ofIntrinsic`/`ofArgument`
and their nested public types, subsequently verified in C7d1 below.
Java 9-compatible interfaces do not reproduce the
native API's full sealed/non-sealed reflective topology. Those selected factories,
constant-entry loading and CodeBuilder execution alone did not prove the then-omitted ABI.
Full API/source-unit, all attributes/opcodes/versions, general verification,
stack maps/hierarchy and byte-for-byte native class/pool parity remain unclaimed.

### Reproduce C7a

After the release CLI/browser build and locked JDK/browser preparation used by
the modern-java workflow:

```sh
yarn ci:classfile-api:test
yarn ci:classfile-api
```

The official ledger is `build/java-classfile-api-results.json`. Its contract
requires all four groups and all three hosts, original compiler artifacts,
callback Code and returned-array routes, and independently produced per-host
output bytes. Diagnostic subsets cannot replace the official ledger. CI
requires the exact two unit files and full-host command and retains evidence
after success or failure. All broader completion/conformance flags stay false.

## C7a verified batch exit

At clean implementation `bed25a30eef4501c039aca6d550011141d9cda83`:

- All 32 cases pass in 12 mandatory cells: 96 outcomes, zero failed/not-run
  cells. Official ledger SHA-256:
  `b58e7c4c1687d007b84f724a23941c29adce5655f786da6e6e209ffdc12df136`.
- Four original compilations retain 11 class-file artifacts, 28 named callback
  Code proofs and 16 returned-array routes. Each host independently produces
  16 outputs (48 total): 15 valid definitions, including one define-only empty
  class, and one typed-invalid artifact that is never defined. Legal selected
  instruction-encoding equivalence is checked, not native byte/CP equality,
  general callback data flow or dynamic branch coverage.
- Fresh C1–C7a gates share the same frozen implementation/runtime: 348 selected
  cases, 132 release/host cells and 1,992 outcomes. These are finite-case counts,
  not API/spec coverage percentages.
- Strict release CLI/browser builds, ES5 checking, the actual workflow checker
  and full workflow mutation tests pass. Boundary units report 1,262 passes,
  zero failures and one existing optional native-JDK diagnostic skip (1,263
  total); no mandatory test is skipped. The 62 dedicated C7a tests include
  source-fresh release-9 API/body/bridge metadata and actual guest diagnostics
  for 15 verifier and 10 public-pool assertions.
- All 15 B/retained-language/launcher/evolved-switch commands pass across the
  original first 13 successes and two same-command recovery runs. The initial
  compact25 native compiler SIGKILL is retained; no particular cause is proven.
  The initial C6 Java25 Node nominal-handle timeout is also retained; an isolated
  complete 24-cell rerun passes without changing sources, inputs or limits.
- The original 323-fixture run records 307 successes and 16 60-second timeouts.
  Only those exact 16 cases are replayed, all passing with unchanged commands,
  four workers and original limits. The combined 323-case evidence is not a
  full 323-case rerun and does not relabel the original failed producer. All
  original/replay full-inventory snapshots are byte-identical, SHA-256
  `6dd78ae22947db8158d9348d69f4201a5d5963ba5807b640300f341a49a1189f`.
  All 969 source/class/golden files also remain byte-identical to C6, fixture
  digest `594a68cd39861a76ce4f7b54fb005ad4cc2ded5993f260472d26121269aeaf32`.
- Lock-verified Kotlin 2.4.0 and Scala 2.13.18 MethodHandle compiler smokes pass
  in Doppio and match native Java 17 on Node (321/327 seconds). The initial
  Scala 420-second compile timeout is retained; its same-source/input/limit
  Scala-only rerun passes. The first compiler-
  consumer supervisor ended without a final receipt/status and remains recorded
  as incomplete, not successful. No Chromium compiler or full-language
  conformance is inferred.
- Two forced compiler-JAR generations retain 44 exact class-only entries,
  SHA-256 `caa9598e266120414c393b6b03a1158988fe42d12a626a1482685f3d33434daa`.
  The independent stock verifier checks 39 classes/1,601 Code bodies (141
  generated/rewritten, 1,460 retained); C5/MethodType aliases, historical body
  hashes and all 48 frames in twelve branchful bodies remain unchanged.

The private fail-closed final receipt has exit code 0 and SHA-256
`b0cab6dc56016eb08c435f2b4202829abdf23b90451126aa946575323080ff59`, at
`/home/seorii/logs/doppio-c7a-final-proof-aTBY12/verification-summary.json`.
It binds fully exited supervisors, all seven official ledgers, preserved failed
and incomplete attempts, exact retained replay and compiler consumers before
any documentation-only commit. Runtime snapshot SHA-256:
`c8b3c986919fbcc38ecf0e68cd3c85eb55404d3a775404f6bc63194f0265dfd3`.
The C7a Pro consultation failed at the model-picker UI before chat creation;
no Pro review exists and shared login/broker state was not changed.

C7a is a selected exit, not full C7, Phase C or LIB-007 completion. C7b–C7d
were the follow-ups at that historical exit. C7b's selected expansion follows;
broader JVM/API/source-unit contracts, named modules, concurrency/memory ordering
and hidden-class GC remain open, and all broader flags stay false.

## C7b selected control flow and stack maps

C7b expands the same real Java class library under `LIB-007`. Its separate
original Java 25 corpus has two eight-case groups; C7a's 32-case inventory is
unchanged. Native Java 25, Node and Chromium each consume the original javac25
driver/resource bytes and independently produce their own returned arrays.
Java 21 remains explicitly non-applicable to the final public API.

- Control flow: all six zero and integer comparison predicates, null/reference
  identity predicates, explicit `goto_w`, a backward loop, dense `tableswitch`,
  sorted sparse `lookupswitch` with padding, ordered typed/catch-all dispatch
  and exact unbound/duplicate/foreign-builder label failures.
- Stack maps: typed parsing of an unchanged branchful javac25 resource,
  default and forced generation, LONG stack and wide-slot DOUBLE local joins,
  explicit DROP rejection, branchful identity transform, inserted-instruction
  offset/frame regeneration and retained invalid primitive/reference output.

Checked parsing validates instruction starts, switch counts/keys/padding,
relative targets, exception ranges and compressed StackMapTable frames.
Canonical labels belong to their Code model, including frame/allocation
targets. Expanded public locals/stack use one entry per LONG/DOUBLE value;
internal local analysis expands those entries to two JVM slots.
StackMapTable remains in `attributes()`/`findAttribute()` and is not emitted
as a traversed Code element, matching the native API.

The two-pass assembler rebinds source labels by identity, lays out real switch
padding and ordered exception tables, and regenerates offsets and full frames.
Exact source-pool raw copies still require held provenance. Regeneration drops
stale frame/debug metadata; a forced straight-line body with no frame targets
does not emit an empty StackMapTable. DROP calculates CFG slot heights without
silently performing typed verification, so the deliberate invalid outputs can
be built, retained and separately rejected without class definition.

The pure-Java CFG verifier uses a worklist across both branch edges, loop
backedges and before-instruction exception states. Declared frames are checked
against incoming states **and applied before downstream instruction checks**:
an inferred String cannot authorize String operations after a frame declares
Object. Wide-slot overlap, stack heights/types, frame targets, constructor
initialization and allocation tokens are checked without loading/defining a
class. An independent review found and corrected the special initialized
receiver of `Object.<init>`; the native-aligned diagnostic includes that case.

These remain selected policies, not full native behavior:

- Short branch overflow rejects with IAE; native automatic widening is not
  implemented. Explicit `goto_w` is supported.
- Duplicate table keys reject with IAE rather than native first-entry handling.
  Empty/reversed protected ranges reject rather than native default dropping;
  the checked reader's nonempty-range test is separate from native-comparable
  verifier diagnostics.
- Arbitrary hierarchy/resolver contracts, array/monitor/dynamic instruction
  families, jsr/ret, unreachable-code rewriting, protected constructor invokes
  and general allocation/frame lattices remain unsupported, not successful.
  Source-owned handler/frame metadata is not a full dynamic branch-coverage
  or byte-for-byte native class/pool parity claim.

### Reproduce C7b

After the locked toolchain/Chromium preparation and release CLI/browser build:

```sh
yarn ci:classfile-api:test
yarn ci:classfile-controlflow:test
yarn ci:classfile-api
yarn ci:classfile-controlflow
```

The independent official ledger is
`build/java-classfile-controlflow-results.json`; native-only/diagnostic outputs
cannot replace it or C7a's ledger. CI requires exact bounded, unique ordered
commands and retains the ledger after success or failure. Mutation tests reject
filters, host waivers, swallowed failures, duplicate/renamed steps, scheduling
changes and cross-wired or discarded artifacts.

## C7b verified batch exit

At clean implementation `2e7cbf57bab18f730cb7aa389b5ca82ee12db4cc`:

- C7b: 16 cases, six mandatory native25/Node/Chromium cells and 48 outcomes all
  pass; failed/not-run cells are zero. Five original class-artifact rows have
  four distinct names. Original Code proves 45 functions (44 actual named
  bootstrap callbacks plus one shared predicate helper) and 14 returned-array
  routes, without rewritten headers, generated compiler carriers or adapters.
- Each host retains 14 outputs: 12 valid arrays defined/invoked on that same
  host and two invalid arrays never defined. All 42 outputs have independent
  complete Code/CFG/handler/expanded-frame proofs. Native bytes never substitute
  for Node/Chromium products.
- C7a's unchanged 32 cases/12 cells/96 outcomes also pass on this implementation.
  Together the two public-library gates have 48 cases/18 cells/144 outcomes.
- Full selected B/C unit inventory: 1,312 pass, zero failures and one existing
  optional native-JDK diagnostic skip (1,313 total). Dedicated public-library
  tests total 112. Guest diagnostics retain 15 straight-line, 10 pool, 24 typed
  CFG, 40 reader, 25 stricter reader-bound and 10 writer cases; diagnostic
  inventories are separate from the 16 original C7b cases.
- Strict CLI/browser builds, ES5 typecheck, workflow checker and its complete
  mutation suite pass. Compiler bootstrap smoke retains the deterministic
  44-entry class-only JAR SHA-256
  `caa9598e266120414c393b6b03a1158988fe42d12a626a1482685f3d33434daa`.
- The first clean C7b gate recorded four passed/two failed cells because forced
  regeneration emitted an extra empty StackMapTable. Its failed ledger is
  preserved (SHA-256
  `c58b709c71c25933e339adf03d390f79a26db591b15bcefcb3abe53e2f337412`);
  the same full six-cell gate passes after the output fix. Initial compile,
  exact diagnostic-error expectation, dirty-input rejection and CI-uniqueness
  failures remain recorded rather than rewritten as passes.
- C1–C6 host gates, the full retained 323-case process gate and Kotlin/Scala
  compiler consumers were not rerun in this C7b turn. Their historical C7a
  receipts above remain historical evidence, not new uniform-current runs.

The private final consumer verifies fully exited producers and preserved
attempts, with exit code 0. Receipt:
`/home/seorii/logs/doppio-c7b-final-proof-mx1Ys3/verification-summary.json`,
SHA-256 `7cb3e97bb0906cef323f1e050566737aa919eac7baec6585dcdd7abf764ef273`.
Runtime snapshot SHA-256:
`96b4122cefc43b3eb2aa8d0c62593569d7db60ef90d47640df7f2ade1f3e13b4`.
No Pro review is claimed; the independent review here was a peer code review.

At that historical C7b exit, next were C7c (extended/custom attributes,
bootstrap/indy/condy models and real fresh-pool remapping) and C7d
(hierarchy/resolvers, general verification and remaining public ABI).
Full C7/Phase C/LIB-007/source-unit/API conformance,
modules, concurrency and GC remain unclaimed; all broader flags stay false.

## C7c selected attributes, bootstrap models and fresh pools

C7c expands the same real Java public library under `LIB-007`. Three
independent original Java25 recipes contain eight cases each; Java21 remains
non-applicable to the final API, and Java24 native execution is not inferred.

- Attributes: typed ConstantValue, raw UTF8 Signature, ordered Exceptions,
  NestHost/NestMembers and InnerClasses, plus Deprecated/Synthetic markers.
  Actual CustomAttribute/AttributeMapperOption/ClassReader/BufWriter paths
  read and write full headers and payloads. STATELESS and CP_REFS custom
  codecs preserve their real scalar/StringEntry contents. Built-in names
  take precedence over custom lookup; selected processing options retain
  custom objects, drop raw unknown/unstable attributes as appropriate and
  apply mapper multiplicity. Signature tree APIs remain unimplemented.
- Bootstrap models: genuine typed CP17/CP18 entries, MethodHandle/MethodType
  factories, ordered heterogeneous/nested arguments, semantic interning and
  nominal DynamicCallSiteDesc. BootstrapMethods is a derived read-only
  attribute, not a ClassElement or direct builder factory. Category-two condy
  values use one CP slot and two operand slots. Pooled condy symbols cache
  shared DAG nodes; cycles and graphs deeper than the selected finite bound
  reject explicitly without bootstrap execution.
- Fresh pools: NEW_POOL rebuilds selected bound fields/methods, CP references
  and recursive bootstrap graphs by meaning, never by stale source indexes.
  Code reassembly selects actual LDC/LDC_W/LDC2_W widths and rebinds branches,
  switches, handlers and regenerated frames. Unused source constants/bootstrap
  entries are omitted. Prefilling 300 strings actually widens Code and frame
  offsets; prefilling a bootstrap changes the real CP18 bootstrap index.
  Semantic imports do not confer foreign raw-copy authority.

The verifier checks declared dynamic result/invocation types and selected
bootstrap metadata without resolving/defining/initializing classes or executing
bootstraps. Invalid bootstrap kind-8 interface/non-constructor/non-void
references and kind-6 initializer references reject. The pinned native verifier
reports errors for the non-void constructor but accepts the other three
metadata forms; the separate diagnostic explicitly records Doppio's stricter
fail-closed policy, not native-verifier parity.

Opaque CP_REFS/LABELS/UNKNOWN bound payloads cannot safely survive NEW_POOL
without a selected codec/custom writer and reject when retained by policy;
STATELESS raw payloads can be copied. Bound LocalVariableTable and
LocalVariableTypeTable also reject rather than disappearing during fresh
Code reconstruction. Native supports remapping these debug tables and retains
raw unknown payloads under PASS_ALL; those differences are explicit boundaries,
not successful parity cases. Custom LABELS semantics, arbitrary attribute
codecs, signature trees and general debug-attribute relocation remain open.

Custom readers receive the real reader, CP/bootstrap metadata, owner header and
absolute payload offsets. Parsing is eager: native-style lazy cross-model or
reentrant traversal from mapper callbacks is not established. Configured
byte-verification callback IAE normalization and original non-IAE propagation
have separate native diagnostics. Native configured custom-attribute verification
can itself throw ClassCastException after reading attributes; the original
24-case parity gate does not claim that broader path.

### Reproduce C7c

```sh
yarn ci:classfile-extended:test
yarn ci:classfile-extended
# Equivalent mandatory host command:
node ci/java_classfile_extended_test.mjs --browser
```

The official ledger is `build/java-classfile-extended-results.json`. All nine
native25/Node/Chromium cells are mandatory.
Native-only/diagnostic receipts cannot replace it. CI checks exact commands,
unique ordered steps, timeout/failure propagation and an always-retained
matching ledger; the complete workflow mutation suite verifies those guards.

## C7c verified batch exit

At clean implementation `21439e0d740085dee195703a1a6906b44657440a`
(2026-10-13 Asia/Seoul):

- C7c's 24 original cases pass all nine mandatory cells and 72 outcomes, with
  zero failed/not-run cells. Three genuine javac25 compilations retain 12
  original class-artifact rows, 51 named Code functions (49 bootstrap-bound
  callbacks and two direct helpers), four custom codec methods and 22
  returned-array routes. No compiler carrier, version-header rewrite or test
  adapter substitutes for the original callers.
- Each host independently produces 22 valid arrays and defines/invokes them on
  that same host: 66 complete output proofs. Two API-only cases return no
  arrays. Typed attribute payloads, complete Code/CFG/handler/frame vectors,
  CP17/18/bootstrap operands and actual widening/reindexing are checked;
  native bytes never replace guest outputs. This does not prove byte-for-byte
  native class/pool parity or arbitrary dynamic callback coverage.
- Unchanged C7a/C7b full-host gates also pass: 32/16 cases, 12/6 cells and
  96/48 outcomes. Together C7a–C7c have 72 cases/27 cells/216 outcomes, not a
  compatibility percentage. Ledger SHA-256 values are C7a
  `a406d52284314fa8feb5106c362e4ca1ef4f1d8b0d8a16ef9a144722f12b2b27`,
  C7b `2d853d3f71b1afbeab54a59a607629c60b2da26209f4b1f81399990457a0c96a`
  and C7c `6bbf3ab82a8039cd735e582b6c43e37e61ad66a138d9d4371a325028a9ed58a9`.
- Full selected B/C units: 1,357 pass, zero failures, one existing optional
  native-JDK diagnostic skip (1,358 total). Dedicated public-library tests
  total 157. New public guest/native-mode diagnostics have 12 attribute,
  31 bootstrap/pool and 23 remap checks; intentional policy differences above
  are separate from the 24 original parity cases. A private three-check
  pre-freeze cycle diagnostic also passes without defining/executing classes.
- Strict CLI/browser builds, ES5 type checking, workflow checker and complete
  mutation suite pass. Two forced compiler-overlay generations retain 44
  class-only entries and SHA-256
  `caa9598e266120414c393b6b03a1158988fe42d12a626a1482685f3d33434daa`.
- An initial frozen C7b regression run overlapped compiler-JAR regeneration;
  its input guard rejected the transient missing JAR, not a semantic case
  result. The aborted failed ledger is preserved (SHA-256
  `70310644eff907ed13e51da2c5782fd93fb6079c9cc32a23dc97c2e268cbcd86`).
  After regeneration fully exited and the identical final runtime was checked,
  the same full gate passes at unchanged sources/limits. Initial diagnostic
  compile/setup failures remain preserved, not relabeled as successes.
- C1–C6 host gates, the retained 323-case process gate and Kotlin/Scala compiler
  consumers were not rerun in this C7c turn; historical receipts remain dated
  evidence, not new uniform-current runs.

The final fail-closed consumer verifies all fully exited producers, clean
frozen HEAD, three complete official ledgers, unchanged runtime and preserved
attempts. Exit code 0; receipt
`/home/seorii/logs/doppio-c7c-final-proof-7LEqvj/verification-summary.json`,
SHA-256 `a3e9aae40e9d8e8d2988a925453d6d7cd467b234cbc72d868189b0d53cea2464`.
Runtime snapshot SHA-256:
`73ba1dee7c5e6738c8c4b401f542afd3534fd3eab6c2df64ec43c7d7d3e08c59`.
Independent peer review was performed; no Pro review is claimed.

At the C7c exit, next was C7d: explicit hierarchy/resolvers, general verifier/frame breadth and
remaining public ABI/reflective topology, including the omitted intrinsic/
argument constant-instruction types/factories. Unselected attributes/debug
relocation/mapper reentrancy remain open. Full C7/Phase C/LIB-007/API/source-unit,
modules, memory-order/concurrency and GC conformance remain unclaimed; all 15
broader C7c completion flags stay false.

## C7 selected execution order

The request to finish C7 is tracked across the selected profiles below. The
first C7d hierarchy/constant ABI gate is an initial subgate, not the end of C7.
The selected C7d1–C7d5 worklist is now closed. Full public-library and
Java SE/JVM/source-unit conformance is separate from closing this worklist.

| Order | Selected profile | Current status |
| --- | --- | --- |
| C7d1 | Explicit hierarchy resolvers, reference/array joins and native constant-instruction factories/covariance | Verified below |
| C7d2 | Modern instruction models/aliases, stack/array/type/monitor flow, long jumps and dead-code/frame policies | Verified below; 209 modern opcode entries in 24 families, four discontinued entries tracked separately |
| C7d3 | Debug/label attributes and actual relocation, legal deferred mapper/reader lifecycle and supplied frames | Verified below; native forbids owner attribute traversal inside the mapper read callback |
| C7d4 | Signature trees, annotation/record/module attributes and remaining public builder/transform/ABI topology | Verified below; at that exit all217 nonlegacy native public type declarations matched and three legacy types were deferred to C7d5; native195-type sealing remains independently unproved |
| C7d5 | Structural verifier/legacy applicability and final aggregate regression/ABI reconciliation | Verified below; all220 nominal public types, 466 units, 3 VM tests and eight host gates pass at one clean implementation/runtime. No broad completion flag is inferred from this finite exit |

## C7d1 verified hierarchy and constant ABI profile

At implementation `c422b6cd4b16924d09b72248b0ffc85d08bfdb91`, with the
test-only configured-verifier descriptor correction at
`ad05805c5fe4bac2112d54a50ba0ae515818c818`:

- Real ClassHierarchyResolver factories, nullable roots, resource-header
  parsing, non-initializing reflection, chaining and caching feed configured
  frame generation and byte/model verification. JVM verification interface
  rules are intentionally distinct from Java runtime cast/source assignability.
  Missing/cyclic metadata has explicit errors; current owner metadata does not
  require defining the class under construction.
- Intrinsic/Argument/LoadConstantInstruction factories and nested types now
  have their native descriptors. Argument values return Integer and have
  genuine javac-generated ConstantDesc bridges. Exactly two source files use
  system javac's source/target9 boxed covariance first; all remaining normal
  classlib sources keep --release9. Headers are naturally53, not rewritten;
  no fake Integer stub or modified SDK/runtime image is used.
- Two untouched original Java25 recipes pass 16 cases/six mandatory
  native25/Node/Chromium cells/48 outcomes. Four original artifact rows bind
  37 named methods (35 bootstrap-bound), 13 static returned-array routes and
  complete independently checked output vectors. Each host produces 13 arrays:
  12 valid defined/invoked there and one invalid never defined (39 outputs).
- Dedicated C7 units total221, all pass with no failure/skip. Fresh compiled
  source execution checks the actual successful-definition package provider,
  not Class.getResource's separate lookup order. Native diagnostics have39
  hierarchy and55 constant checks; guest has41 hierarchy checks including two
  explicit cycle guards, plus the same55 constant checks.
- Strict CLI/browser builds, ES5 checking, workflow checker and complete
  mutation suite pass. The compiler bootstrap JAR retains its44-entry hash.
  The initial unit run's old internal verifier-descriptor expectation failed;
  its record is preserved and the corrected exact resolver-context test passes
  at unchanged product sources/runtime/limits. C1–C6/B host gates, retained323
  and compiler consumers were not rerun in this profile.

Reproduce with `yarn ci:classfile-hierarchy:test` and
`yarn ci:classfile-hierarchy`; the mandatory runner is
`node ci/java_classfile_hierarchy_test.mjs --browser` and ledger
`build/java-classfile-hierarchy-results.json`. Java21 is non-applicable, not a
passing or skipped final-API cell. Original recipes are not adapters/carriers,
and neither native outputs nor prior C7a–C7c gates substitute for this gate.

Final initial-profile consumer: exit0,
`/home/seorii/logs/doppio-c7d-step1-close-7BTZls/verification-summary.json`,
SHA-256 `83b75fa610f92d4cc62b3f042765c930d7598005605721101fedca4d52e6c8ed`.
Official ledger SHA-256:
`1e568d8481d93cc5a54346e54b6641997a4eb97393a1bd6ffc10cb08ca2477d1`;
runtime SHA-256:
`952043df1ad787ecfb4ffabfd645f825ade2a7930cad4174ca5c09eaf25ed000`.
This receipt explicitly binds the test-only HEAD delta rather than pretending
all producers used one HEAD. At that initial exit C7d2–C7d5 remained open; all17 initial-gate broader
flags, including c7Complete/c7dComplete, are false.

### Historical C7d2 pre-approval failure (2026-10-13)

The following records the pre-approval failure. At that point implementation
was committed locally on `modern`, but the profile was not closed or pushed.
The approved correction and successful exit below supersede that status.

- Seven typed memory instruction families, 73 CodeBuilder methods, genuine
  unbound nominal constant-pool entries, complete modern opcode family
  reading/writing, typed stack/array/type/monitor flow, short-jump widening,
  and PATCH/KEEP dead-code policies are implemented. PATCH also removes or
  splits exception ranges as required by the native output contract.
- Native diagnostics pass95 memory,82 flow and14 writer checks. Fresh-source
  guest diagnostics pass the same checks. All14 writer checks remain required;
  their layout/policy processes retain the60s cap. Indexed opcode dispatch,
  immutable flow snapshots with copy-on-change joins, and private NOP byte
  encoding reduce long-Code overhead without changing public value identity.
- Frozen implementation HEAD is
  `52a92908710be83ff62a0d24d80f0321bc977c0b`. Strict CLI/browser builds,
  ES5 type checking, complete workflow mutations and all307 C7 unit tests pass
  with no failure, cancellation or skip. The prior aggregate writer timeout
  attempts remain preserved; no timeout was raised and no case was waived.
- Four unchanged Java25 original callers supply32 cases,9 class rows,
  97 named helper/callback methods,32 returned-array routes and61 output
  method bodies. Independent contracts66 pass; the complete native byte proof
  passes. The mandatory native25/Node/Chromium gate has10 passed cells and
  two failed cells out of12: arrays pass native, but both guests fail while
  executing a valid partial reference `multianewarray` (`String[][][]`, one
  allocated dimension). Emitted bytes already passed pure ClassFile verification;
  the exception is in the existing VM array-constructor path, not a successful
  library or host outcome. No recipe, expected output or artifact is replaced.
- The failed ledger is retained at
  `/home/seorii/logs/doppio-c7d-step2-frozen-instructions-foxoKq/failed-ledger.json`
  (producer exit1). Unit producer exit0:
  `/home/seorii/logs/doppio-c7d-step2-frozen-units-koVj5n/run.log`.
  Build/workflow exit0 logs are respectively
  `/home/seorii/logs/doppio-c7d-step2-frozen-build-0p5bjP/run.log` and
  `/home/seorii/logs/doppio-c7d-step2-frozen-workflow-SqTjav/run.log`.

At that point fixing the VM defect required approval to expand the LIB-007
work into VM execution. C7d2 stayed open, with C7d3–C7d5 not started and all17
broader flags false. The earlier C7 host gates had not yet been rerun;
C1–C6/B gates, retained323 and compiler consumers were also not rerun.

### C7d2 approved correction and verified exit (2026-10-13)

The user approved the partial-array VM correction and continuation through
C7d3–C7d5. At clean implementation
`33ed0c564c4928c8df7f0a6e66ca47131724f243`:

- Array constructors normalize a one-element `multianewarray` dimensions
  vector before either allocation branch. The existing scalar branch leaves
  unallocated reference components null and gives rank-one primitive arrays
  the correct scalar length. Full allocations and negative/zero controls
  remain covered, without changing original caller recipes or expected bytes.
- The genuine Java25 allocation regression passes all3 tests:82 native and82
  guest checks. It independently decodes actual allocation operands and runs
  the identical native-generated class bytes in the VM; this separate regression
  does not substitute for the original gate's host-produced output artifacts.
  Before/after generated-class SHA-256 is unchanged:
  `e8031c46a22c01298ee2ae100ed6fce74bd96fae1e0535ab73810439a0792ca7`.
- All32 original instruction cases pass all12 native25/Node/Chromium cells
  and96 outcomes. Each host independently produces32 artifacts:31 valid
  outputs defined/invoked there and one explicitly invalid output never defined.
  All96 complete returned-array proofs and97 original named method proofs replay.
- Decoded non-finite and negative-zero proof numbers use explicit lossless
  JSON values. Original bytes and digests still bind their exact bits; NaN is
  never substituted with null. The earlier persisted-receipt failure remains
  preserved. All10 older CFG writer checks are required in three actual Java
  entry profiles with unchanged60s limits and verified completion counts2/4/4.
- Strict CLI/browser builds, ES5 checking, full workflow checker/mutations,
  all310 C7 unit tests and the separate3 VM tests pass, with no failure,
  cancellation or skip. The unchanged C7a32/C7b16/C7c24/C7d1-16 gates also
  pass on the same committed sources and runtime. Together with C7d2-32,
  the aggregate is120 cases/45 execution cells/360 outcomes.

Final consumer exit0:
`/home/seorii/logs/doppio-c7d-step2-verified-close-jX067l/verification-summary.json`,
SHA-256 `2e66b134966b453ca0e9cdfe3f05bd467c10afe3f33f653ff15cb4c7b3e2722e`;
runtime SHA-256
`4c1aa23df772257a20b7cd50bef4b3ae3c06af0367f661cc3f52a5c7eba31f8c`.
All nine producer receipts require that exact clean HEAD and runtime; the
consumer checks their actual exit status, termination, unit summaries and
all five official ledgers. Earlier failures are retained, including the
307-unit305-pass/2-fail run at
`/home/seorii/logs/doppio-c7d-step2-approved-frozen-units-YA7ygt/run.log`
and the first consumer's incorrect per-gate distribution at
`/home/seorii/logs/doppio-c7d-step2-final-close-jFCd3j/run.log`.

Reproduce with `yarn ci:classfile-instructions:test`,
`yarn ci:classfile-instructions` and `yarn ci:partial-multianewarray:test`.
The mandatory instruction runner is
`node ci/java_classfile_instructions_test.mjs --browser`, ledger
`build/java-classfile-instructions-results.json`.

C7d2 is closed, not C7, Phase C or full LIB-007/Java SE/JVM conformance.
C7d3–C7d5 remained ordered pending exits at that point, and all17 broader completion flags
remain false. C1–C6/B gates, retained323 and compiler consumers were not
rerun in this profile.

## C7d3 verified debug relocation and mapper lifecycle (2026-10-13)

At clean implementation `53f14a5a46db82b602226556cdb6afe4963c62db`:

- Typed field signatures, all four debug pseudo-instruction factories and six
  CodeBuilder aliases execute real Java implementations. Field signatures
  include nested class/type-variable/array/wildcard trees; complete class and
  method signatures remained C7d4 work at that exit.
- LineNumberTable, LocalVariableTable, LocalVariableTypeTable,
  CharacterRangeTable and SourceDebugExtension have native-shaped typed
  models and codecs. Debug and line-number reader options are independent.
  Raw attributes remain available when pseudo traversal is dropped. Native
  line-zero suppression, same-BCI replacement, inclusive character-range end
  positions and explicit-builder line behavior are covered separately.
- NEW_POOL imports actual UTF operands and rebases debug scopes after CP
  operand widening and instruction insertion. Original bound inputs remain
  unchanged; no stale indexes, labels or native output arrays substitute for
  host-generated outputs. The retained C7c debug diagnostic now checks typed
  scope/name/descriptor preservation and real pool pruning for all six
  table/policy combinations instead of expecting the former unsupported error.
  Its opaque CP-dependent payload boundary is still explicit.
- Manual StackMapTable entries serialize from final target labels and logical
  initial locals, including wide parameters, uninitialized allocation labels
  and constructors. A private sorted copy preserves caller list order;
  duplicate target BCIs are rejected. DROP_STACK_MAPS preserves explicitly
  supplied frames as native does; generation does not silently reuse them.
- Legal mapper lifecycle includes retaining the supplied owner/reader for
  access after parsing, exact read/write exception identity and real fresh-pool
  custom-reference imports. Native mapper documentation forbids traversing
  owner attributes during readAttribute; this exit does not claim forbidden
  callback reentrancy or a native-style lazy parser redesign.
- Separate native/fresh-source guest diagnostics cover161 signature/factory,
  65 reader/lifecycle and3 manual-frame checks. The pinned native25 verifier
  casts a configured custom mapper's returned attribute to its internal bound
  type; that native ClassCastException is preserved as a boundary. The65-check
  diagnostic verifies the same remapped bytes with the default mapper instead,
  not a patched SDK or an invented successful custom-mapper verdict.

The new fixed24-case debug catalogue passes all9 native25/Node/Chromium cells
and72 outcomes. Each host independently returns21 class arrays:20 valid outputs
defined/invoked from those same bytes and one explicitly invalid output never
defined. Three API-only cases return no artifact. Independent replay covers all
63 complete output arrays, genuine original69/0 callers and their named
bootstrap/direct helpers; actual payload mutation checks reject all six selected
debug/custom families. Compilation uses the untouched SDK25 public API, no
substitute source types, byte-header rewriting or fixture adapters.

Strict CLI/browser builds, ES5 checking, the full workflow checker/mutation
suite, all362 C7 unit tests and3 separate VM tests pass with zero failure,
cancellation or skip. All six unchanged-or-expanded catalogues run at the same
clean HEAD and runtime: C7a32, C7b16, C7c24, C7d1-16, C7d2-32 and C7d3-24;
aggregate144 cases/54 mandatory execution cells/432 outcomes. The final unit
run also replays the persisted passed host ledgers, including the new debug
ledger, rather than substituting synthetic positive records.

Final consumer exit0:
`/home/seorii/logs/doppio-c7d-step3-verified-close-PrDT5g/verification-summary.json`,
SHA-256 `4434bb44e4114fc17df9e961a3a27146b421678cba45ab0e0f17331eb84421ab`;
runtime SHA-256
`fd21ab7fe7ff107c7bedabf38714f08e1f39a94c6ede4b3e064284d0078f8e2c`.
All ten producer receipts bind that exact clean implementation and runtime;
the consumer checks actual termination, exit codes, unit summaries and all six
official ledgers. Earlier failures remain preserved: the362-test360-pass run
with two obsolete diagnostic expectations at
`/home/seorii/logs/doppio-c7d-step3-frozen-units-3S2vuP/` also retains the prior
six passed ledgers. The later parallel instruction-frame60s timeout is at
`/home/seorii/logs/doppio-c7d-step3-verified-instructions-OvmAfe/failed-ledger.json`;
the unchanged gate passes when run alone, without any timeout/fixture waiver.

Reproduce with `yarn ci:classfile-debug:test` and `yarn ci:classfile-debug`.
The mandatory runner is `node ci/java_classfile_debug_test.mjs --browser`,
ledger `build/java-classfile-debug-results.json`.

C7d3 is closed, not C7, Phase C or full LIB-007/Java SE/JVM conformance. All17
broader completion flags remain false. C1–C6/B gates, retained323 and compiler
consumers were not rerun in this profile. At that exit, C7d4 retained complete signature trees,
declaration/parameter/type annotations, record/other/module metadata and public
builder/transform topology. The pinned SDK inventory has220 public types:
150 then-current facades had matching direct nominal parents, while70 types and45
declared methods across nine existing owners remained. ModuleDesc/PackageDesc are
real dependencies; native sealing on195 types is a separate source/classfile/
reflection axis, not proved by target9 facades or parent equality. At that exit C7d5 retained
structural verifier/legacy applicability and final aggregate reconciliation,
including malformed debug coordinates/slots and invokespecial constraints.

## C7d4 verified declarations, metadata and nominal ABI profile

At clean implementation `5024a0337247e0a54269609daf50182bbeb6e69b`, complete
class/method signature trees, declaration/parameter/default annotations, all22
type-annotation target kinds and paths, record/other metadata and six module
attribute families use actual public models and recursive wire codecs. NEW_POOL
imports semantic CP references; Code type targets rebase real final labels.
Shared-pool bound type/module packets preserve native raw-copy behavior, while
new-pool reconstruction observes the native mutable ModuleHashInfo array view.
Unbound type targets preserve native lower16bits65535 and are not silently
removed by dead-label policy. Explicit unbound type attributes remain under
DROP_UNSTABLE; original bound policy is applied before reconstruction.

ModuleDesc/PackageDesc and CP19/20 have actual native nominal topology,
lazy raw-name validation, semantic import and retained shared-source ownership.
The separately approved UTF/numeric and ClassEntry equality/hash corrections
have dedicated native/fresh-source tests. ClassEntry uses descriptor-content
hashing; CP19/20 retain native child-index-dependent hashing. The newly
implemented permitted-subclass nominal factory now creates genuine temporary
entries rather than writable-pool lookalikes.

Scoped block/catch/if combinators isolate nested local cursors and real labels.
Stateful transform factories resolve per traversal before callbacks, including
native downstream-first factory/start and upstream-first end ordering. Reused
and nested transforms do not share traversal state. ClassEntry/pool buildTo and
all four module build/file APIs write actual owned files, preserve explicit
superclass metadata and native failure ordering; implicit module superclass is0.

The fixed original32-case declarations catalogue passes12 native25/Node/Chromium
cells and96 outcomes. Each host independently emits32 arrays:28 defined/invoked
from those same bytes and four never defined (annotation-default interface,
sealed copy and two module-info outputs). Two API-only cases emit no array and
two cases emit two. Independent recursive proofs bind110 output methods/107 Code
bodies,91 callbacks,15 lifecycle and seven compiler-resource routes. Four genuine
javac25 groups have32 compiler rows/29 unique classes; --release25 -g -parameters
and empty source/classpath roots are retained, without source adapters or header
rewriting. Actual CAST/NEW/INSTANCEOF BCIs and both local/resource range edges
move in the original relocation caller; catch0->1 is explicitly caller-written.

Binary comparison against the untouched locked SDK25 jmod matches direct
parents, declared public descriptors/bridges/varargs/static/abstract flags,
fields and constant bits for all217 nonlegacy public types out of native220.
At that exit three DiscontinuedInstruction types remained C7d5 work. Native sealing on195 types
is separately inventoried: naturally target9 facades do not establish sealed
source/classfile/reflection parity. The four exact boxed-covariance sources use
genuine source9/target9 compilation against the real SDK; all other classlib
sources retain --release9. No synthetic SDK type or rewritten class header is
used to force the ABI.

Native/fresh semantic profiles pass unchanged: signature127, annotation224,
scalar CP93, annotation attributes86, type models367, type attributes225,
record/other metadata57, scoped builders19, stateful transforms31, file output7,
module pool291, module attributes/file output170 and ClassEntry281 checks.
Strict CLI/browser builds, ES5 checking, the full workflow mutation suite,
all443 C7 unit tests across30 files and3 separate VM tests pass with zero failure,
cancellation or skip. The full unit inventory runs with serial file scheduling;
no case selector, per-process timeout change or fixture waiver is used. Final
replay validates all seven official ledgers at the same clean implementation
and runtime: aggregate176 cases/66 execution cells/528 outcomes, including96
independently produced declarations artifacts.

Final consumer exit0:
`/home/seorii/logs/doppio-c7d-step4-verified-close-kfCJA2/verification-summary.json`,
SHA-256 `bc82bfed4073c21baa869c2dce972d4880991327e0dce46e2f851e9fa0930ef2`;
runtime SHA-256
`932cc68e801ad8e3423f3a789d782d15728942fea9dd45d22798a545893399e0`.
All eleven producer receipts bind that exact clean implementation and runtime;
the consumer checks full process termination, exits, unit summaries and each
official ledger. Earlier failures are preserved: the obsolete Signature-tree
absence assertion produced443 tests/442 passes at
`/home/seorii/logs/doppio-c7d-step4-frozen-units-KMusf8/`, including the seven
then-passed ledgers. The corrected exact six-method test passes with the native
tree profile. The later three unchanged60s unit timeouts are retained at
`/home/seorii/logs/doppio-c7d-step4-reconciled-units-Pj0Gpw/`; two instruction-host
timeouts are at
`/home/seorii/logs/doppio-c7d-step4-reconciled-instructions-40JKh9/failed-ledger.json`.
The same instruction gate passes alone and the complete443-unit inventory passes
with serial scheduling, retaining the original individual caps.

Reproduce the new gate with `yarn ci:classfile-declarations:test` and
`yarn ci:classfile-declarations`. Mandatory runner:
`node ci/java_classfile_declarations_test.mjs --browser`; ledger:
`build/java-classfile-declarations-results.json`.

C7d4 is closed, not C7, Phase C or full LIB-007/Java SE/JVM conformance.
All18 new-gate broader completion flags remain false, including the separate
sealing axis; older17-flag inventories are unchanged. Named-module runtime
resolution/access and full inference verification are not inferred from module
metadata or generated-class execution. C1–C6/B gates, retained323 and compiler
consumers were not rerun in this profile. At that exit C7d5 retained selected malformed debug
coordinates/slots, invokespecial constraints, the three discontinued types/four
legacy opcodes and final aggregate/ABI reconciliation.

## C7d5 verified structural, legacy and final selected exit (2026-10-13)

At clean implementation `a3f946decf70ad46f840417c8457fafce0e42bdc`, the
three final structural groups each retain eight original Java25 cases:

| Selected profile | Actual implementation and native boundary |
| --- | --- |
| Discontinued instructions | All three public discontinued types and typed JSR/JSR_W/RET/RET_W models, widths, branch targets, original-label remapping and selected old-major counters. Genuine NEW_POOL insertion of 33,000 NOPs promotes JSR to JSR_W and moves the target and Code length by 33,002. Each host defines and invokes its own six eligible outputs, returning42; two version-policy packets are never defined. Native major49 and selected major50 byte-verification fallback report inference unsupported, separately from successful JVM execution. |
| Nonconstructor special invocation | Verification receives the actual owner flags and classfile major version, checks selected current/direct-super/ancestor/direct-interface owners, current-class receiver assignability and the CP11 major51/52 boundary. Generation retains native permissive owner/receiver handling. Four valid outputs return17/23/31/41 through their own held Lookup/MethodHandle routes; four invalid packets are never defined. |
| Structural debug verification | Byte verification uses the configured instance parser; existing models retain their own reader options. FIRST LocalVariableTable start/end checks use actual instruction boundaries and nonwrapping wide range addition. Terminal starts fail; zero-length ranges at real instructions remain valid. LocalVariableTypeTable, CharacterRangeTable and line coordinates retain their separate native range/permissiveness rules. No new slot/maxLocals/descriptor-width or eager type-signature restrictions are invented. Unsafe metadata stays explicitly never-defined even when library verification returns an empty list. |

These three unchanged originals provide24 cases/nine native25/Node/Chromium
cells/72 outcomes. Genuine stock javac25 uses `--release 25 -g -parameters -proc:none`,
empty source/classpath roots and original compiler headers69;
facades naturally compile to53. There are13 compiler rows/11 unique classes,
68 main-class helpers and eight nested Code helpers. No source/header adapter,
synthetic SDK type or native-byte substitution is used.

Each host independently emits37 arrays covering46 methods:13 eligible arrays
are actually defined and invoked on the producing host;24 malformed or unsafe
packets are never defined. Across three hosts this is111 independently checked
arrays, not111 distinct cases. Fixed raw profiles consume Code lengths,
maxima, CP tags/symbols, instruction widths/locals/branch targets and actual
LVT/LVTT/LNT/character-range words, without normalizing invalid coordinates.
Frozen semantic Code digests bind original helpers/cases, held array/class/
handle locals and actual adapter/receiver routes. The bounded debug mutator
retains its two clones, two byte stores and exact u2 guards. Consistently
rehashed compiler-byte mutations must still fail those independent guards;
general dataflow or branch coverage is not inferred.

Separate native/fresh diagnostics cover24 legacy factory checks,14 special
invocation profiles and92 debug checks, with the original eight-case entry
points preserved. Verification-only traversal avoids materializing operandless
raw NOP models in a temporary list, while keeping all label/line/metadata and
non-NOP factory validation. It never installs that list as the public Code
element cache: full public traversal and repeated object identities remain
unchanged. The additional public native-confirmed TraversalProbe passes53
checks, including invalid NEWARRAY/LDC/unreachable controls and debug failure
ordering before old-major inference rejection. No VM code or original
fixture/cap was changed for this optimization.

Binary ABI comparison with the untouched pinned SDK25 jmod now reconciles all
220 public nominal types, including the three discontinued types: exact direct
parents, declared public descriptors/bridges/varargs/static/abstract flags,
fields and constant bits. There are no deferred legacy types or nominal
waivers. Native sealing on195 types remains a separate source/classfile/
reflection axis unproved by naturally target9 facade output.

### Final aggregate verification and remaining boundaries

All12 producers fully exited0 at the same clean implementation above and
runtime: strict CLI/browser builds, ES5 checking, the complete workflow
mutation suite, all466 C7 unit tests across34 files and3 separate VM tests.
The full unit suite ran alone with serial file scheduling; failure,
cancellation, skip and TODO counts are all0. The eight official ledgers replay
200 cases/75 execution cells/600 outcomes. The independent consumer checks
the exact nonempty command plans, initial/final clean HEAD, stable before/after
runtime snapshots for nonbuild consumers and the final build/workflow runtime,
full process termination, exits, unit summaries and every ledger.

Final consumer exit0:
`/home/seorii/logs/doppio-c7d-step5-verified-close-cE4cnz/verification-summary.json`,
SHA-256 `3d136aeeaba860ca6556655c132223eac10417491c2ca354c60284d7770ea692`;
runtime SHA-256
`f77090a349abc9f44e8702cdb6be08108c634dac65f5e7e5a1d4bd326b7e7152`.

Earlier isolated instruction/frame timeouts at the pre-compact implementation
are preserved at
`/home/seorii/logs/doppio-c7d-step5-final-instructions-isolated-FtpTaf/failed-ledger.json`
and
`/home/seorii/logs/doppio-c7d-step5-instructions-unchanged-retry-ySOtMW/failed-ledger.json`.
A separate six-case timing diagnostic does not by itself prove the sole cause.
The unchanged final instruction gate passes alone; its frame group takes
427ms native,34,912ms Node and30,921ms Chromium under the original30s/60s caps.
The compact implementation's first whole-suite run had466 tests/464 passes:
two older metadata guards still expected direct byte-verifier dispatch.
That failure is retained at
`/home/seorii/logs/doppio-c7d-step5-compact-final-units-serial-H6UT8O/run.log`,
with all eight then-passed raw ledgers preserved at
`/home/seorii/logs/doppio-c7d-step5-pre-guard-ledger-archive-75uhMY/`.
The corrected guards assert configured parser ordering, actual custom/debug/
line option and resolver fields, exact model dispatch and absence of the old
byte bypass; their full21-test two-file suite passes before the final freeze.
The new final466-test run is
`/home/seorii/logs/doppio-c7d-step5-reconciled-final-units-serial-fEVz6D/run.log`.
Prior compile/diagnostic failures are also retained; no case selector, timeout
increase, unsupported-family waiver or failed receipt is counted as passing.

Reproduce the new gate with `yarn ci:classfile-structural:test` and
`yarn ci:classfile-structural`. The mandatory runner is
`node ci/java_classfile_structural_test.mjs --browser`, ledger
`build/java-classfile-structural-results.json`. CI requires the contract step
and all three hosts, and publishes the raw ledger on failure as well as success.
The final full466-unit inventory is the unique union of all eight
`ci:classfile-*:test` commands, with `--test-concurrency=1` and no case selector.

The selected C7d1–C7d5 worklist is closed, not full C7/Phase C/LIB-007/Java SE/JVM
conformance. All18 new-gate broader completion flags remain false; older17-flag
inventories are unchanged. General native bridge-method skipping, other
major50 fallback/full inference behavior, lazy parser/all-attribute/version/
opcode and byte-for-byte pool parity remain unproved. Old-major unreachable
high-slot counter/maxLocals behavior outside the finite legacy profile is not
generalized. Sealing and named-module runtime resolution/access remain separate.
C1–C6/B gates, retained323 and compiler consumers were not rerun in this final
selected C7 reconciliation.
