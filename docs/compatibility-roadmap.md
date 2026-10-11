# Java compatibility roadmap

This roadmap separates today's tested release profile from the work needed for
modern Java applications and, eventually, broad Java SE compatibility. It is a
planning inventory, not a new support claim or a test-result report.

The initial implementation survey was checked on 2026-10-08 against baseline
`a944e52fd`. The Phase A source inventory now separately covers whole Java SE
21/25 contracts; it does not turn unassessed implementation into support.
Compiler-gate counts below reflect the current checked-in manifest.
The [support policy](support.md) remains authoritative for releases;
the [compatibility matrix](modern-java.md) records individual implemented
surfaces. The seed harness below extends the verification baseline without
claiming broader runtime implementation.

## Approved target and decisions

The approved destination is **Java 25 LTS**, with **Java 21** as the intermediate
workload milestone. The maintainer accepted the recommended scope on 2026-10-08.
Both are LTS releases in the
[Java support roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html).
These are development targets, not claims that their requirements already pass.

| Decision | Approved scope | Boundary |
| --- | --- | --- |
| Target Java version | Final Java 25 features, through an intermediate Java 21 profile | Preview/incubator features are not part of the baseline |
| Required applications | Existing Java, Kotlin 2.4.0 and Scala 2.13.18 compiler/runtime workloads, plus the editable browser playground | No additional CLI application or server framework is selected |
| Execution hosts | Ubuntu/Node 24 and Chromium, with separate results | Other operating systems and browsers are outside the initial workload profile |
| Java compiler inside Doppio | Preserve the current Java 8 javac workload | Hosted javac 21/25 is deferred; executing its externally compiled output remains required |
| Platform-dependent facilities | Record limitations separately for each host | Native calls, processes, sockets, filesystem guarantees and desktop facilities need feasibility decisions; they remain open against broader Java SE compatibility |

There are three different completion claims:

1. **Existing release profile preserved:** the currently documented compiler,
   runtime, browser and package gates pass on the same commit.
2. **Java 21/25 workload profile complete:** every fixture and named application
   in an agreed, versioned manifest passes on its required hosts. Deliberate
   exclusions remain visible. This is not full Java SE compatibility.
3. **Java SE target complete:** the applicable language, VM and standard-library
   requirements have a complete inventory and conformance evidence. Existing
   Java 8-era deficits count too. Unimplemented or unassessed requirements do
   not disappear because they are outside the current release profile.

Preview and incubator features are a separate opt-in inventory. JDK-specific
tools/modules and HotSpot performance mechanisms are separate from Java SE
functional semantics. This roadmap does not claim certification or HotSpot
implementation parity. Platform allowances must be checked against the relevant
specification, not assumed from a successful native example.

## Measured starting point

| Evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| [Release profile](support.md#release-profile) | Java 8 bootstrap plus individually tested modern overlays; Java 17 is the build/native-oracle host | Complete guest Java 17, 21 or 25 support |
| [Compiler manifest](../ci/modern_java_smoke_shards.json) and [input lock](../ci/modern_java_compiler_inputs.lock.json) | 76 distinct scripts in 8 shards: 50 Kotlin 2.4.0, 23 Scala 2.13.18, and one each for Groovy 4.0.33, Clojure 1.12.6 and JRuby 9.4.15.0. Kotlin/Scala inputs use the lock; the other scripts pin their JAR hashes. | A count of Java SE features, full language conformance, or a fresh passing run in this planning change |
| [Class parser](../src/ClassData.ts) and [fixture generator](../tasks/modern_java.ts) | Accepted major-version range ends at 70; generated Java 20–26 print probes exercise basic execution | Arbitrary javac output, preview semantics or all APIs from those releases |
| [Core-language fixture notes](modern-java.md#known-core-lang-gaps) | Recent repeat, bounded indexOf and delimiter-preserving split fixtures include local Corretto 25.0.3 comparisons of genuine `--release 21` output | Reproducible native Java 21/25 release gates or broad modern language coverage |
| [Playground launcher](../website/src/playground.mjs) and [browser suite](../ci/pages_browser_smoke.mjs) | Java 8 tools.jar javac and pinned Kotlin/Scala compile and execute in Doppio | Running modern javac or a modern JDK module image inside Doppio |
| [Package smoke](../ci/package_artifact_smoke.mjs) | Isolated installation/rebuild, CLI help contracts, API types and bundle import | Java application compatibility; the isolated consumer uses an offline dummy runtime fixture |
| [Seed manifest](../ci/java_compatibility_manifest.json), [toolchain lock](../ci/java_compatibility_toolchains.lock.json) and [comparison runner](../ci/run_java_compatibility.mjs) | Twenty-one fixtures are compared on matching Java 21 and 25 toolchains, Node and Chromium, including selected public switch APIs, final-language/launcher behavior, Java 25 IO, `Duration.isPositive()`, and one explicitly generated bootstrap-contract companion, with input/runtime hashes | A complete requirement inventory or full final Java 22–25 feature conformance |

The version matrix currently labels every Java 9–26 row partial. Its rows and
the 76 language smoke scripts are not a valid denominator for an overall completion
percentage. A small string overload and a module system are not equal work.

## Required workload gates

The following seven IDs define the approved acceptance structure. The first
five map existing gates; the last two have Node and Chromium seed gates but still
need broader manifests. A gate is not marked passed here without a
result tied to a commit.

| ID | Workload and entry point | Completion condition |
| --- | --- | --- |
| W-JAVA-BASE | Current legacy and modern runtime suites; [Modern Java workflow](../.github/workflows/modern-java.yml) | All required fixtures pass with the existing source/build checks and no unexplained output, exception or side-effect changes. |
| W-KOTLIN | Kotlin 2.4.0 compiler inside Doppio; all Kotlin scripts from the locked manifest | All 50 current scripts report passed using the same producer artifact and pinned inputs; no missing, duplicate, skipped or timed-out entries. Retain runtime, reflection, coroutine and interop probes. |
| W-SCALA | Scala 2.13.18 compiler inside Doppio; all Scala scripts from the locked manifest | All 23 current scripts report passed under the same artifact/input rules, including library, reflection, macro, interop and diagnostic probes. |
| W-BROWSER | Chromium/Playwright 1.57.0, BrowserFS 1.3.0; `./ci/build_pages.sh` and `./ci/run_pages_browser_smoke.sh` | Java, Kotlin and Scala compile/run; source persistence, documentation/mobile layout, provider mutations and descriptor-close checks pass, without browser/request errors. Preserve the existing local and deployed release checks. |
| W-PACKAGE | `yarn ci:check-package-artifact` and the [package workflow](../.github/workflows/package-artifact.yml) | Clean pack and isolated consumer checks pass, including repeated rebuild, all four CLI entry points, types and bundle execution. Keep this distribution gate separate from guest-Java results. |
| W-JAVA21 | New genuine javac 21 `--release 21` corpus and native Java 21 oracle | A pinned manifest covers selected language/runtime/library requirements, including records, sealed types, patterns, linkage, reflection, collections and threads; compare exit status, specified output/errors and side effects on Node and Chromium. Missing features remain failures or explicit blockers. |
| W-JAVA25 | New genuine javac 25 `--release 25` corpus and native Java 25 oracle | Extend the agreed Java 21 profile with final Java 22–25 requirements; verify emitted class major 69 and behavior on each required host. Do not substitute Java 17 bytecode with rewritten version bytes. |

W-KOTLIN and W-SCALA must consume the manifest rather than a hand-picked subset.
The focused Groovy, Clojure and JRuby CLI smokes are part of the existing
release gate, not additional Java 21/25 application workloads or browser
playground languages.
For existing local commands and the same-commit release contract, see
[release gates](support.md#release-gates). The
[compiler shard runner](../ci/run_modern_java_smoke_shard.mjs) already records
per-script completion; extend that provenance model to new Java gates.

W-JAVA21/25 remain incomplete. Their initial seed runs in the `Modern Java`
runtime job using Corretto 21.0.11.10.1 and 25.0.3.9.1, with archive sizes,
SHA-256 digests and extracted-tree hashes pinned in the toolchain lock. A
passing seed run is not a passing workload profile. New external application
requirements need exact artifacts, inputs and expected behavior before entering
the manifest. No server framework is selected.

### Reproducible seed on Node and Chromium

The seed manifest maps eight string API overloads, one binary32 instruction
requirement, four language/runtime
requirements, two public switch bootstrap APIs, two unnamed-variable/pattern requirements, module imports,
flexible constructors, compact sources/instance mains, five Java 25 IO methods,
and `Duration.isPositive()` to twenty-one fixtures (twenty-seven requirements). Eight
drivers cover binary32 numeric instructions, repeat, delimiter-preserving split, bounded indexOf, final pattern
switches/record patterns, bootstrap contracts, public bootstrap calls, and duration sign on matching javac `--release 21`
and `--release 25`. Six isolated IO modes, five final-source/launcher drivers and
the identity and exact-conversion primitive-switch API fixtures use `--release 25` only.
Together they produce twenty-nine cases and fifty-eight
required host comparisons. The contract fixture explicitly
replaces only its companion with deterministic generated call sites that Java
source cannot express; generator source/hash and execution are recorded before
the final emitted-class inventory. Native Java and Doppio then execute the same class
bytes with matching stdout/stderr; only CRLF line endings are normalized.
Class versions must be 65.0 or 69.0 respectively, not version-patched Java 17
output. Existing implementation-sensitive assertions are identified in the
manifest rather than treated as universal specification requirements.

The genuine pattern fixture has 44 assertions for binding, guarded/null/type
switches, nested record deconstruction, enum/EnumDesc labels, sealed types and
accessor failures with `MatchException` cause identity. All eight primitive
record components are covered, including wide `long`/`double` arguments. Java
25's emitted `I`/`Z`/`J`/`D` primitive selectors and class labels are checked
separately from Java 21's boxed class-label lowering; the other primitive
bindings do not force individual switch selectors in this compiler corpus.
This does not add preview cross-primitive patterns.
The 31 bootstrap-contract assertions exercise string/integer labels, numeric
conversion failures, restart bounds before null handling and malformed inputs
with `BootstrapMethodError`/`IllegalArgumentException` causes. This is a selected
compiler-generated fast path, not full language conformance or preview primitive
conversions. The separate public API fixture directly calls `typeSwitch` and
`enumSwitch` with 169 selected common final API assertions: real `ConstantCallSite`
targets/dynamic invokers, handle adaptation and varargs metadata, label snapshots,
duplicates/restarts, numeric accessor effects/failures, lazy enum initialization,
enum descriptors and invalid arguments/names. It uses Object and concrete-enum
targets with a full-access caller lookup. Primitive selectors/class labels,
version-dependent narrow-reference target types and String equality direction,
reduced lookup/hidden-class behavior and cross-loader enum resolution remain
outside this common public API corpus.

The Java 25-only public primitive-switch fixture adds 651 assertions for all
eight selector descriptors and corresponding primitive/wrapper Class labels.
It checks exact/adapted handles, boxed Object selectors, wide argument slots,
snapshots, empty labels, restarts and declared-Boolean restrictions against the
pinned native implementation without preview flags. Its scope is identity
matching; the existing common Java 21/25 corpus is unchanged.

The separate Java 25-only exact-conversion fixture adds 2,926 assertions for all
49 numeric primitive selector/Class-label pairs across 140 static expected
matching-mask values with typed handles. Selected range/precision boundaries,
fractions, signed zeros, NaN, infinities, subnormals and integral saturation endpoints are native-compared,
along with snapshots, duplicate labels and restart selection. These primitive
Class-label calls need no preview flags in the pinned native implementation;
they do not establish a universal reference-oriented API contract. Cross-numeric
conversions for declared reference/boxed selectors, preview constant labels,
primitive source patterns and complete public API conformance remain outside
the selected slices.

The binary32 instruction fixture contributes 471 native-compared assertions
under both javac 21 and 25. Selected float arithmetic and conversion boundaries
cover rounding, underflow, overflow, signed zeros, NaN, infinities and direct
long-to-float midpoint controls. Float-to-long conversion saturates infinities
and out-of-range values. Raw bits and widened double values prevent a final
float conversion from hiding excess precision. The fixture exercises 4,096-call
hot paths; separate 48-case rounding and 17-case float-to-long contracts check
interpreter operand stacks and selected emitted JIT code. This opcode slice
does not establish native math library or universal floating-point conformance.
Explicit bootstrap/constant long-to-double-to-float adapters remain outside it.

The separate evolved-binary gate compiles enum, sealed-class and sealed-interface
callers with javac 21 and 25, then selectively recompiles the declarations for
added/reordered enum constants or newly permitted implementations. All callers
and synthetic helpers retain identical bytes. Fourteen native-compared cases
produce twenty-eight Node/Chromium checks for known values, nulls, guards and
`MatchException` on the selected new values; the legacy enum statement still
completes without a match. Compiler operations, replacement hashes, class
inventories and host results are recorded in `build/java-pattern-evolution-results.json`.
CI retains that ledger on success or failure. This selected slice does not
establish general binary compatibility.

The six IO modes cover all five `java.lang.IO` methods: current standard-output
delegation and print flushing, line terminators and EOF, a cached input decoder,
invalid or missing charset fallback with malformed-byte replacement, and
`IOException` wrapping with original cause identity. Native, Node and Chromium
receive the same finite UTF-8 stream; its byte length and SHA-256 are recorded.
Interactive console/TTY behavior is outside this corpus.

The unnamed-variable/pattern fixture adds 33 assertions for final Java 22 forms:
initializer effects, loop/catch/lambda/resource variables, close/finally order,
nested typed and match-all patterns, nulls and guards. Ignored record components
still evaluate accessors and preserve their `MatchException` causes. This gate
uses genuine javac 25 without preview; it does not add a separate Java 22 JDK.

The module-import fixture adds ten assertions over existing classes imported
from `java.base`, `java.desktop` and `java.sql`, including duplicate imports and
single-type/package-import precedence. This is a compiler-resolved source
feature: its class-path output does not implement JPMS runtime resolution,
readability, exports/opens or strong encapsulation.

The flexible-constructor fixture adds 50 assertions across computed super
arguments, rejected prologues/finally, this-constructor chains, early own-field
writes visible through super dispatch, subsequent field/instance initialization,
allowed local/lambda/anonymous captures, wide values and qualified outer-super
invocations. Existing VM execution handles this selected final javac 25 lowering;
the corpus is not general verifier or full language-conformance evidence.

The named instance-main and compact-source drivers verify non-private instance
startup, zero-argument construction, instance initialization, UTF-8 arguments,
implicit `java.base` imports and IO output. The separate launcher gate covers
twelve oracle-positive, six oracle-negative, two legacy and three JLS-only cases
on Node and Chromium (forty-six guest checks). It tests String-array precedence,
static/no-argument forms, inheritance, interface defaults, constructor failures,
main failures and version gating. Failure diagnostics are implementation-defined;
negative tests compare failure outcomes and relevant causes, not entire stacks.

The three JLS-only cases are explicit pinned-oracle differences: Corretto
25.0.3 invokes a private superclass main over a default-interface main, or a
package-access superclass main through a different-package inheritance chain.
The guest follows the non-private/inherited candidate rule in
[JLS 25 section 12.1.4](https://docs.oracle.com/javase/specs/jls/se25/html/jls-12.html#jls-12.1.4).
These checks are not counted as native-equality passes. Compact source files
are compiled by external javac; hosted javac 25 and source-file launch remain
outside this gate.

The uncaught-main exit gate separately compares sixteen cases per release
against pinned Java 21/25 on Node and Chromium (thirty-two native executions and
sixty-four guest checks). Legacy main exceptions and errors now record failure
status 1 before uncaught-handler dispatch, using the same completion path as
Java 25. Handler dispatch and normal shutdown still run: non-daemon children
finish, and explicit `System.exit(0/7)`, including from a handler, takes precedence.
Caught exceptions and uncaught child-thread failures do not change a successful
main's status. Initialization/linkage failures, custom/default handlers and an
invalid switch-bootstrap argument are also covered. The immutable-input ledger
retains exact exit/stdout/stderr comparisons, using cleared selected throwable
stacks rather than claiming general diagnostic or scheduling compatibility.
A 26-scenario completion/shutdown check also covers majors 52, 65 and 69.

The separate class-version admission gate adds twenty-seven cases and fifty-four
Node/Chromium checks: four untouched javac 21/25 controls, four labeled historical
header controls and nineteen failures for out-of-range majors, invalid modern
minors, disabled previews, bad magic and all header truncations of zero through
seven bytes. The genuine controls include records, sealed types, runtime
annotations, lambdas, string concatenation and a record-pattern switch. Emitted
class hashes and expected class attributes are verified. Header mutations and
their original/final hashes are explicit;
they are not genuine-source compatibility evidence. General loader and
`Lookup.defineClass` use typed classification for version errors, preserve
structural `ClassFormatError`, and admit the historical arbitrary minor values.
The accepted major range remains 45–70, not full Java 26 compatibility. A
57-scenario check also covers definition recovery, application-loader error
propagation and normal shutdown after the pending launch diagnostic. General VM
verification and opt-in preview execution remain separate work. Raw native and
guest outcomes, including a failing attempt, are retained in
`build/java-class-version-results.json`. The Phase A execution checker rejects
partial or stale evidence and requires both hosts on the current clean commit.

On Linux x64 with the existing Node 24/Java 17 build prerequisites:

```sh
yarn ci:java-compatibility:test
yarn ci:java-compatibility:prepare
./node_modules/.bin/grunt --stack modern-ci-release-cli --grunt-ignore-compile-errors
./node_modules/.bin/grunt --stack make_build_dir:release vite-release listings:release --grunt-ignore-compile-errors
./node_modules/.bin/playwright install --with-deps chromium
yarn ci:java-compatibility
yarn ci:java-compatibility:browser
yarn ci:java25-main
yarn ci:java-uncaught-exit:test
yarn ci:java-uncaught-exit
yarn ci:class-file-version:test
yarn ci:class-file-version
yarn ci:java-pattern-evolution:test
yarn ci:java-pattern-evolution
```

Preparation verifies official versioned archives before extraction, then checks
the full extracted tree and java/javac versions. Verified caches can be reused;
corrupt caches fail without being recursively replaced. The runner uses private
temporary class directories, bounded commands and a fail-closed per-case ledger
at `build/java-compatibility-results.json`. Results include source/manifest,
toolchain, emitted-class and CLI/browser runtime provenance. CI retains the ledger even
when a comparison fails. `--release 21` or `--release 25` can focus a local run;
the CI command always runs both releases and both hosts.

The browser adapter mounts the same guest bootstrap image through BrowserFS,
copies the compiled class bytes into a fresh context and captures each Java
stdout/stderr stream and exit result. Timeouts, browser errors and changed
browser inputs fail the run. A local invocation without `--browser` explicitly
records Chromium as not run. These seeds alone do not complete PLAN-001, M0,
W-JAVA21 or W-JAVA25. The full language/VM/library inventory is a separate
Phase A gate; broader source-feature and semantic probes belong to later bundles.

## Remaining work inventory

These **23 planning packages** are an initial decomposition, not an exhaustive
API list, equal-sized tasks or an estimate of implementation effort. Do not sum
their statuses into a completion percentage. The Phase A source catalogues
provide the detailed contract inventory; implementation and test evidence
remain separate, and the units do not have equal implementation cost.

Status vocabulary:

- **Partial:** implemented slices have evidence, with documented or unmeasured
  remaining behavior.
- **Missing:** the named behavior is explicitly documented as unimplemented.
- **Unassessed:** this bounded inventory does not establish support or absence.
- **Boundary:** deliberately excluded today; still unresolved for a broader
  target unless the target specification permits the limitation.

Priority indicates sequencing, not difficulty: **P0** establishes scope,
measurement or an architectural decision; **P1** completes selected workloads;
**P2** expands broader/platform-dependent compatibility. P0 design work can
precede P1 even when the eventual implementation belongs to P2. Package IDs are
stable; a split should retain links to its parent.

### Work bundles

Use the following seven bundles to plan related changes together. Every one of
the 23 packages below has exactly one primary bundle; cross-bundle dependencies
do not transfer ownership. A bundle is a workstream, not one giant PR or a new
support level. Select a bounded batch within it by shared runtime path, API
family or compiler output, with a reference contract and explicit outcomes
on each required host. Keep individual package/requirement statuses in the
manifest.

| Bundle | Primary package IDs | Batches to plan together | Dependency and acceptance boundary |
| --- | --- | --- | --- |
| A. Evidence and class admission | PLAN-001, JVM-001 | Requirement census, genuine javac 21/25 corpus, class-version/admission controls and result provenance | Establish the measured input for other bundles; a seed pass does not finish the inventory or W-JAVA21/25. |
| B. Loading and final language | JVM-002, JVM-006, JVM-007, JVM-008 | Verifier/linkage and initialization first; then related record, sealed, pattern, switch and launcher cases | JVM-002 precedes the dependent language batches; JVM-008 also needs the bootstrap work in C. Retain negative and evolved-binary cases. |
| C. Invocation and class metadata | JVM-003, JVM-004, JVM-005, LIB-007 | [Ordered C1–C7 batches](phase-c-invocation.md): selected lookup/invocation core and collection/control flow are verified; executable VarHandles, general bootstrap, hidden classes, constants and public class-file APIs remain C3–C7 | Depends on B's verifier/linkage foundation; module access also needs G. C1/C2 do not complete C or JVM-003. Do not treat class-file parsing inside the VM as the public API. |
| D. Scheduling and concurrency | JVM-009, JVM-010, LIB-003, LIB-004 | Execution/memory model before virtual-thread lifecycle and concurrent libraries; cleaner lifecycle separately after reachability and I/O decisions | JVM-010 is the foundation; F supplies host blocking-I/O capabilities. A flag-only virtual-thread shim does not close this bundle. |
| E. Collections and core libraries | LIB-001, LIB-002, LIB-008 | Sequenced collections, sequential streams/collectors, then independent core/math/time/format/random/charset families | Independent families can proceed alongside B/C; parallel streams depend on D. Group related API surfaces, not unrelated methods merely to enlarge a commit. |
| F. Host services | LIB-005, LIB-006, LIB-009, LIB-010 | Node/Chromium capability matrix; file/channel, transport, process/management and foreign-interface feasibility as separate host-focused batches | Keep host-specific limits explicit. Networking depends on D's concurrency model; foreign calls require a feasibility decision before an implementation claim. |
| G. Modules and hosted tools | JVM-011, TOOL-001 | Module resolution/access design, then implementation; hosted modern javac only if separately selected | Design can run in parallel, but access enforcement depends on B/C. TOOL-001 remains outside the approved initial workload. |

Within a bundle, add focused tests for each requirement, but build and run the
shared Node/Chromium and retained release gates at a batch boundary rather
than after every single method. A batch may use multiple commits when its
changes are independently reviewable or revertible. A bundle is complete only
when all of its package exit evidence below is met on the required hosts;
passing one batch never closes the others.

The [Phase B batch plan](phase-b-loading.md) separates initialization, structural
validation, verification, linking, retained execution, records, sealed types and
final-language work. Its initialization, class-file structure and bytecode
verification batches have dedicated genuine Java 21/25 host gates. Verification
and preparation guard linking and execution. Linking adds actual loader
constraints, exact symbolic member resolution and runtime-package/nest access
gates with separate genuine evolved-binary corpora. These selected gates do not
close JVM-002 or bundle B. Evolved receiver dispatch has a dedicated host gate;
B5 now adds a fixed 157-case core execution corpus across five related groups.
At clean `3d6728056`, its 30 Java 21/25 native/Node/Chromium cells and all original
323 retained fixtures pass with unchanged sources, goldens and class files.
B6 adds 77 selected record reflection, construction/object-method and lazy
signature cases. At clean `db5faa90c`, all 18 Java 21/25 native/Node/Chromium
cells and the original 323 retained fixtures pass unchanged; B5's 30 cells
remain green. B7 adds 62 selected sealed reflection, derivation/loader and
metadata cases. At clean `fb2fa583e`, all 18 Java 21/25 native/Node/Chromium
cells, B1–B6 host gates and the original 323 retained fixtures pass unchanged.
This selected integration evidence does not assess every source unit or
complete record/bootstrap, sealed-type or final-language conformance.
B8 adds a fixed 58-case final-language corpus in five groups with group-specific
21/25 applicability and actual per-case launcher startup. At clean `f8d41537b`,
all 21 mandatory native/Node/Chromium cells pass, alongside 33 retained language
host executions, the existing launcher/evolved-switch gates, B1–B7 and the
original 323 retained fixtures. All 834 mandatory compiled units/contracts pass
(one optional diagnostic is skipped). This completes the selected B1–B8 batch
plan, not full Phase B conformance. Launcher oracle differences remain explicit;
all 112 JVM-008 source units stay unassessed.

### Scope and measurement

| ID | Priority and current state | Required work and exit evidence |
| --- | --- | --- |
| PLAN-001 | P0; full-contract inventory and source reconciliation are enforced by the [Phase A gate](phase-a-inventory.md); the 27-requirement executable seed remains a selected subset | Preserve complete JLS/JVMS and Java SE module/package/type/member contracts, service/provider and supplemental sources, including retained Java 8 behavior. Every unit needs a source, applicability, owner, implementation assessment and concrete pending test plan or evidence. Implementation may remain unassessed; missing source coverage or classification fails the inventory gate. |

The [source-resolution map](../ci/plan_spec_obligations.json) indexes all
19 JLS chapters and seven JVMS chapters in both the [Java 21](https://docs.oracle.com/javase/specs/jls/se21/html/index.html)
and [Java 25](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)
editions, with the corresponding [JVMS 21](https://docs.oracle.com/javase/specs/jvms/se21/html/index.html)
and [JVMS 25](https://docs.oracle.com/javase/specs/jvms/se25/html/index.html)
sources. Its 52 edition/chapter cells and five cross-cutting entries resolve
to the pinned specification, API and supplementary contract inventories.
`node ci/check_plan_spec_obligations.mjs` validates the resolution map;
`--require-complete` delegates to the aggregate inventory checker and requires
all generated artifacts. The declaration alone cannot prove complete coverage.

The [pinned source-anchor index](../ci/plan_spec_source_index.json) expands
that map to 2,078 source units from all four official tables of contents,
including every chapter preamble and the JVMS instruction anchors. Each unit
has a URL, bounded source-text hash, compiler/guest/information/boundary route,
package owner, unassessed status and a unique pending-test assignment backed
by a concrete shared test-plan template. Its 21-versus-25 text hashes flag
1,520 edition-specific rows for review; a changed hash is not by itself a
semantic change. `node ci/plan_spec_source_index.mjs --check` validates the
pinned offline snapshot, and `--verify-official` refetches and compares the
official source pages. `sourceAnchorsComplete` means source coverage only;
`semanticAssessmentComplete` remains false. The aggregate checker combines this
index with all 22 Java SE modules, official type/member-index reconciliation,
public documentation, serialized forms and incorporated source dependencies.
It also links each executable seed requirement to a full source unit and emits
edition-difference work. See [Phase A](phase-a-inventory.md) for commands and the
distinction between inventory completion and runtime conformance.

### JVM and language execution

| ID | Priority and current evidence | Exit evidence and main dependencies |
| --- | --- | --- |
| JVM-001 | P0; pinned true-javac 21/25 corpus plus 27 admission cases, including four untouched controls and explicit negative/header mutations | Require the complete seed and admission corpus on native Java, Node and Chromium with current-commit, source/class/runtime hashes and retained raw results. The [execution evidence gate](../ci/check_phase_a_evidence.mjs) fails on stale, dirty, missing, skipped or timed-out evidence. Broader verification and linkage are B/C work; W-JAVA21/25 remain partial. |
| JVM-002 | P1; [Phase B foundations](phase-b-loading.md) enforce structural/type verification, preparation/loading constraints, exact symbolic member/access identities and selected initialization/failure rules. Genuine evolved-invocation controls add exact declaration/default selection, receiver-independent CP caching and static active-use cases, with one explicit Java 21 oracle difference. Dedicated native/Node/Chromium gates require evidence for those slices; retained-language and exhaustive verifier/linking contracts are not established | Spec-mapped valid/malformed corpus for format, stack maps, operand/local types, branches, linking/default resolution and initialization order/failure caching, including exact specified errors. Depends on JVM-001; module access also needs JVM-011. |
| JVM-003 | P1; [C1 selected evidence](phase-c-invocation.md#c1-verified-batch-exit) covers 60 lookup/invocation/adaptation/combinator cases; [C2 selected evidence](phase-c-invocation.md#c2-verified-batch-exit) adds 48 collection/varargs/routing/control-flow cases. Both pass on genuine 21/25 native/Node/Chromium inputs, with separate inventories and ledgers. Complete conversion/combinator matrices and executable VarHandles remain unclaimed; source ownership and full-unit claims are unchanged | Expand beyond C1/C2 for complete lookup/access, invocation/adaptation/combinator and field/array VarHandle read/write/CAS/update matrices. Verify memory-order requirements separately. Depends on JVM-001/002; module cases on JVM-011. |
| JVM-004 | P1; selected indy/condy paths, with unsupported general bootstraps in [constant pool](../src/ConstantPool.ts) and [open questions](design/java-lang-invoke.md#open-design-questions) | User bootstrap handles, nested dynamic arguments, adaptation/access, success/failure caching and specified exceptions; retain lambda, concat, record and compiler probes. Depends on JVM-003. |
| JVM-005 | P2; hidden definition/discovery explicitly missing in [core gaps](modern-java.md#known-core-lang-gaps) | Hidden class and class-data definitions, initialization, lookup privileges, nestmate options, names/descriptors and discovery restrictions match native contracts. Depends on JVM-002/003; module cases on JVM-011. |
| JVM-006 | P1; [B6 selected evidence](phase-b-loading.md#b6-selected-records): 77 genuine/mutated record cases cover lazy generic and nested type-use reflection, constructors/accessors and field-backed object methods across 21/25 native/Node/Chromium. General ObjectMethods/handle/bootstrap forms remain [partial](modern-java.md#known-record-gaps); source units stay unassessed | Genuine javac records with generic/annotated components, constructors/accessors, object methods and reflection/handles pass; general bootstrap forms have explicit tests. Depends on JVM-001/003/004. |
| JVM-007 | P1; [B7 selected evidence](phase-b-loading.md#b7-selected-sealed-types): 62 genuine/mutated cases cover direct derivation identities, passive reflection, bounded invalid metadata and original loader/VirtualMachineError boundaries across 21/25 native/Node/Chromium; source units remain unassessed and named-module runtime behavior unclaimed | Expand beyond the selected corpus for complete class-file, reflection and derivation contracts. Named-module access and ownership require JVM-011. Depends on JVM-002. |
| JVM-008 | P1; retained genuine patterns/switches/bootstrap APIs, evolved binaries, final unnamed/module-import/constructor and compact/instance-main slices have selected Node/Chromium evidence; [B8 expansion](phase-b-loading.md#b8-selected-final-language) passes 58 fixed cases in all 21 applicable native/Node/Chromium cells at clean `f8d41537b`, with separately passing retained, launcher and evolved-switch gates. Three existing pinned launcher differences remain explicit; all 112 source units stay unassessed | Expand beyond selected cases and resolve oracle differences without equating native behavior with specification requirements. Distinguish source acceptance, compiler lowering, runtime and actual launcher obligations. Depends on JVM-001/004/006/007. |
| JVM-009 | P0 scheduler design, then P1 selected profile; virtual threads explicitly missing in [core gaps](modern-java.md#known-core-lang-gaps) | Thread builders/start, lifecycle/join/interrupt, sleep/park, locals, executors, blocking-I/O and monitor interactions work on each required host. Do not replace virtual-thread semantics with an isVirtual flag. Depends on JVM-010 and host I/O. |
| JVM-010 | P0 execution/memory-model design; [concurrent gaps](modern-java.md#known-concurrent-gaps) explicitly exclude broader scheduling/backpressure/memory-safety | Defined execution model plus synchronization, visibility/atomics, cancellation/completion and scheduling contracts tested without timing-only assertions or demanding one nondeterministic ordering. Shared foundation for JVM-009 and LIB-002/003; depends on JVM-003. |
| JVM-011 | P0 design, P2 implementation; [boundary](support.md#explicit-boundaries): named modules and strong encapsulation absent | Module resolution/layers, ownership, services, readability and qualified exports/opens have positive and negative reflection/lookup fixtures. Publish expanded support only after those pass. Depends on JVM-002/003. |

For JVM-008, the source-feature manifest must include final features rather than
equating a version number with a language test. Java 21 finalized record
patterns and pattern switches; Java 22 added unnamed variables/patterns; Java
25 finalized module imports, compact source files/instance main methods and
flexible constructor bodies. Some need launcher or library changes as well as
bytecode execution. See the
[Java 25 language-change summary](https://docs.oracle.com/en/java/javase/25/language/java-language-changes-summary.html).

### Standard library and host integration

| ID | Priority and current evidence | Exit evidence and main dependencies |
| --- | --- | --- |
| LIB-001 | P1; sequenced hierarchy/reverse-view gaps in [core notes](modern-java.md#known-core-lang-gaps), plus [factory gaps](modern-java.md#known-collection-factory-gaps) | Complete selected collection hierarchies, first/last operations, live reverse mutations, iterators/spliterators, immutable wrappers and specified serialization/failure contracts. Compare semantics, not unspecified implementation class names. |
| LIB-002 | P1 sequential/P2 parallel; [stream](modern-java.md#known-stream-pipeline-gaps)/[collector](modern-java.md#known-stream-collector-gaps) gaps; gatherers unassessed | Ordered/unordered, short-circuit, close/exception and sequential/parallel contracts; gatherer lifecycle/composition and built-ins. Depends on JVM-010 for concurrency. |
| LIB-003 | P1 selected concurrency libraries; [concurrent utilities partial](modern-java.md#known-concurrent-gaps), ScopedValue unassessed | Executors, futures, publisher demand/order/cancellation, nested scoped rebinding, carrier composition, binding restoration on success/failure and per-thread isolation pass. Runtime thread mechanics belong to JVM-009/010 rather than being counted twice here. |
| LIB-004 | P2; [Cleaner lifecycle](modern-java.md#known-cleaner-gaps) lacks GC-triggered/reference-queue/background execution | Reachability/reference queues, explicit idempotent cleanup and lifecycle integration have specification-based tests. Do not require prompt GC or a fixed cleanup deadline the platform does not guarantee. Depends on reachability design, JVM-010 and mapped-resource integration. |
| LIB-005 | P1 workload I/O/P2 host breadth; [IO](modern-java.md#known-io-gaps), [NIO](modern-java.md#known-nio-file-gaps) and [filesystem boundaries](support.md#explicit-boundaries) | Host capability matrix and fixtures for providers, attributes, links, walking/globs, secure operations, channels and resource lifetime. Keep browser/Node limitations separate and resolve specification allowances explicitly. |
| LIB-006 | P0 transport feasibility/P1 selected networking; [real HTTP/WebSocket transport missing](modern-java.md#known-http-client-gaps); wider socket/TLS/security coverage unassessed | Controlled local HTTP/HTTPS/WebSocket tests for sync/async streaming, cancellation/timeouts, redirects, certificate validation, proxy/cookie/auth policy and lifecycle. Browser CORS/origin restrictions remain visible. Depends on JVM-010 and host transport design. |
| LIB-007 | P1 constants/P2 class-file library; [descriptor resolution partial](modern-java.md#known-constant-api-gaps), java.lang.classfile unassessed | Constant API signatures/resolution/errors and class-file parse/build/transform/verify round trips. Reflection/hidden-class runtime requirements remain owned by JVM-003/005/006/011. Parsing class files in the VM does not implement this public library. |
| LIB-008 | P1 selected utilities/P2 data and API breadth; [formatting](modern-java.md#known-compactnumberformat-gaps), [time](modern-java.md#known-instantsource-gaps), [hex](modern-java.md#known-hexformat-gaps) and [random](modern-java.md#known-randomgenerator-gaps) partial | Inventory remaining core/math/time/charset/Unicode/locale/security changes. Test values/errors, specified serialization, data-version policy, seeded vectors and suitable random bounds/distribution properties; do not compare arbitrary SecureRandom bytes. Depends on PLAN-001. |
| LIB-009 | P2; [process](modern-java.md#known-processhandle-gaps) and [management](modern-java.md#known-jvm-management-gaps) host behavior partial; instrumentation/JMX breadth unassessed | Controlled process lifecycle/metadata and management tests distinguish implementation-specific values from placeholders. Inventory instrumentation separately. Browser process restrictions remain explicit. Depends on JVM-010 and host capabilities. |
| LIB-010 | P0 architecture/P2 implementation; foreign API unassessed; legacy dynamic loading throws in [native bridge](../src/natives/java_lang.ts) | Decide Node/browser feasibility, then test arenas/segments, lifetime/confinement, layouts/handles and controlled upcall/downcall ABI behavior where available. Keep unavailable required native facilities open; existing JS natives are not evidence of general JNI/foreign linkage. |

The Java 25 inventory must not stop at Java 21 additions. Final APIs include
[foreign memory/functions since 22](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/foreign/package-summary.html),
[gatherers since 24](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/Gatherer.html),
[the class-file API since 24](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/package-summary.html),
and [ScopedValue since 25](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ScopedValue.html).
Unassessed means probes are still needed, not that a source search proved absence.

The full inventory also covers the remaining standard modules: desktop/data transfer,
compiler APIs/annotation processing, instrumentation, naming, preferences, RMI,
scripting, SQL/rowsets/transactions, XML/XML cryptography, authentication and
logging and smart-card I/O, among others. Explicit owner rules assign these to
the existing planning packages; neither
inheritance from Java 8 nor omission from the table demonstrates compatibility.
The [Java SE 25 API overview](https://docs.oracle.com/en/java/javase/25/docs/api/index.html)
is the module/API inventory source and distinguishes Java SE modules from
JDK-specific modules.

### Hosted development tools

| ID | Priority and current evidence | Exit evidence and main dependencies |
| --- | --- | --- |
| TOOL-001 | Deferred outside the initial workload profile; current [playground](../website/src/playground.mjs) runs Java 8 javac, not modern javac | If later selected, run pinned javac 21/25 inside Doppio with its required runtime image/module and compiler services, compile agreed source programs and execute their output. This is separate from W-JAVA21/25, which use external native compilers. Depends on workload-specific APIs and JVM-011 as required by the selected tool distribution. |

## Milestones and first implementation sequence

| Milestone | Deliverable | Exit rule |
| --- | --- | --- |
| M0: measurable baseline | Scope approved; complete PLAN-001 inventory; pin JVM-001 toolchains; check in manifests and host-separated result format | Every selected requirement is classified with provenance; required workload list and exclusions are explicit; baseline results are reproducible. An initial failing baseline is useful evidence, not milestone compatibility completion. |
| M1: Java 21 workload profile | Resolve failures for the agreed Java 21 applications/features, using JVM/LIB dependencies above | W-JAVA21 and all retained existing gates pass on one commit for every required host; no unaccounted skip or unsupported requirement in the selected profile. |
| M2: Java 25 workload profile | Add final Java 22–25 requirements and resolve their failures | W-JAVA25, W-JAVA21 and retained gates pass on one commit, with named applications and deviations published. Do not imply full Java SE from this result. |
| M3: broader Java SE conformance | Implement and verify the remaining spec/module contracts and host boundaries beyond the workload profiles | No required entry is partial, missing or unassessed; applicable conformance evidence is recorded. Any permitted platform exclusions need specification justification. Certification is a separate claim. |

Plan the next implementation batches through the work bundles above:

1. Keep A's requirement inventory and genuine javac 21/25 Node/Chromium
   corpus growing together. Record unknowns, input provenance and distinct
   host results; do not turn the seed into a completion percentage.
2. Start independent bounded batches in B, C, E and F in parallel where their
   dependencies permit. Within B/C, establish verifier/linkage before dependent
   invoke, bootstrap and final-language cases. Preserve the three pinned
   launcher differences and classify failures before choosing fixes.
3. Define G's module model and D/F's scheduler, virtual-thread and host-native
   feasibility while independent library batches progress. These decisions can
   change the critical path and are not a string of small API overlays.
4. For each batch, specify its related requirements and exit evidence up front;
   run focused native or specification-based checks while developing, then the
   shared host and retained gates at the batch boundary. Commit coherent,
   independently reviewable units and leave unfinished package/bundle statuses
   open.

Infrastructure deployment and new external application targets remain separate
decisions; the seed work does not authorize them.

## Result ledger and progress reporting

Each future requirement record needs a stable ID, package/workload IDs,
normative specification/API reference, final/preview status, target version,
fixture path and exact input/expected behavior. Each run needs the source
commit, reference-JDK vendor/version/digest, compiler flags and actual emitted
class version, runtime artifact digest, host/version, command, timeout, exit
status, observed output/exception/side effects and log/artifact location.

Record implementation state separately from verification state. A native match
for one example is not full semantic coverage. For nondeterministic or
implementation-dependent behavior, record the permitted contract and compare
that instead of byte-for-byte output. A test skipped because its API is absent
is not a pass. Required-host failures cannot be hidden by another host passing.

Future status reports should give:

- Required workload results by ID, host and commit, with passed/failed/blocked/
  unrun counts and links to evidence.
- Verified requirements versus the frozen manifest total, grouped by language,
  VM, library and host; report unassessed entries separately.
- Remaining P0 decisions and dependency blockers, the next coherent work unit,
  and any scope changes since the previous report.

Do not publish an overall percent or completion date from package/script counts.
Estimate effort only after M0 and the architectural decisions expose the actual
requirement count and critical path. The inventory is sufficient to identify
the next work, but not to claim that broad compatibility is near completion.

## Specification references

- [Java SE 25 language specification](https://docs.oracle.com/javase/specs/jls/se25/html/index.html): language requirements and memory model.
- [Java SE 25 VM specification](https://docs.oracle.com/javase/specs/jvms/se25/html/index.html), especially [class-file format and verification](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-4.html): version, format and verifier requirements.
- [Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html): standard modules and API contracts; use matching Java 21 references for the intermediate manifest.

Native-oracle tests complement these specifications; they do not replace them
or turn one vendor's undocumented behavior into a compatibility requirement.
