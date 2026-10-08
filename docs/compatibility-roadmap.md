# Java compatibility roadmap

This roadmap separates today's tested release profile from the work needed for
modern Java applications and, eventually, broad Java SE compatibility. It is a
planning inventory, not a new support claim or a test-result report.

The inventory was checked on 2026-10-08 against implementation baseline
`a944e52fd`. The [support policy](support.md) remains authoritative for releases;
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
| [Compiler manifest](../ci/modern_java_smoke_shards.json) and [input lock](../ci/modern_java_compiler_inputs.lock.json) | 73 distinct scripts in 8 shards: 50 Kotlin 2.4.0 and 23 Scala 2.13.18 scripts | A count of Java SE features, or a fresh passing run in this planning change |
| [Class parser](../src/ClassData.ts) and [fixture generator](../tasks/modern_java.ts) | Accepted major-version range ends at 70; generated Java 20–26 print probes exercise basic execution | Arbitrary javac output, preview semantics or all APIs from those releases |
| [Core-language fixture notes](modern-java.md#known-core-lang-gaps) | Recent repeat, bounded indexOf and delimiter-preserving split fixtures include local Corretto 25.0.3 comparisons of genuine `--release 21` output | Reproducible native Java 21/25 release gates or broad modern language coverage |
| [Playground launcher](../website/src/playground.mjs) and [browser suite](../ci/pages_browser_smoke.mjs) | Java 8 tools.jar javac and pinned Kotlin/Scala compile and execute in Doppio | Running modern javac or a modern JDK module image inside Doppio |
| [Package smoke](../ci/package_artifact_smoke.mjs) | Isolated installation/rebuild, CLI help contracts, API types and bundle import | Java application compatibility; the isolated consumer uses an offline dummy runtime fixture |
| [Seed manifest](../ci/java_compatibility_manifest.json), [toolchain lock](../ci/java_compatibility_toolchains.lock.json) and [comparison runner](../ci/run_java_compatibility.mjs) | Sixteen fixtures are compared on matching Java 21 and 25 toolchains, Node and Chromium, including selected final-language/launcher behavior, Java 25 IO and one explicitly generated bootstrap-contract companion, with input/runtime hashes | A complete requirement inventory or full final Java 22–25 feature conformance |

The version matrix currently labels every Java 9–26 row partial. Its rows and
the 73 compiler scripts are not a valid denominator for an overall completion
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
| W-BROWSER | Chromium/Playwright 1.57.0, BrowserFS 1.3.0; `./ci/build_pages.sh` and `./ci/run_pages_browser_smoke.sh` | Three languages compile/run; source persistence, documentation/mobile layout, provider mutations and descriptor-close checks pass, without browser/request errors. Preserve the existing local and deployed release checks. |
| W-PACKAGE | `yarn ci:check-package-artifact` and the [package workflow](../.github/workflows/package-artifact.yml) | Clean pack and isolated consumer checks pass, including repeated rebuild, all four CLI entry points, types and bundle execution. Keep this distribution gate separate from guest-Java results. |
| W-JAVA21 | New genuine javac 21 `--release 21` corpus and native Java 21 oracle | A pinned manifest covers selected language/runtime/library requirements, including records, sealed types, patterns, linkage, reflection, collections and threads; compare exit status, specified output/errors and side effects on Node and Chromium. Missing features remain failures or explicit blockers. |
| W-JAVA25 | New genuine javac 25 `--release 25` corpus and native Java 25 oracle | Extend the agreed Java 21 profile with final Java 22–25 requirements; verify emitted class major 69 and behavior on each required host. Do not substitute Java 17 bytecode with rewritten version bytes. |

W-KOTLIN and W-SCALA must consume the manifest rather than a hand-picked subset.
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

The seed manifest maps eight string API overloads, four language/runtime
requirements, two unnamed-variable/pattern requirements, module imports,
flexible constructors, compact sources/instance mains and five Java 25 IO methods
to sixteen fixtures (twenty-three requirements). The original five
drivers cover repeat, delimiter-preserving split, bounded indexOf, final pattern
switches/record patterns and bootstrap contracts on matching javac `--release 21`
and `--release 25`. Six isolated IO modes and five final-source/launcher drivers
use `--release 25` only. Together they produce twenty-one cases and forty-two
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
compiler-generated fast path, not the public `SwitchBootstraps` API, full
language conformance, preview primitive conversions or evolved-binary coverage.

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

The separate class-version admission gate adds twenty-five cases and fifty
Node/Chromium checks: two untouched javac 21/25 controls, four labeled historical
header controls and nineteen failures for out-of-range majors, invalid modern
minors, disabled previews, bad magic and all header truncations of zero through
seven bytes. Header mutations and their original/final hashes are explicit;
they are not genuine-source compatibility evidence. General loader and
`Lookup.defineClass` use typed classification for version errors, preserve
structural `ClassFormatError`, and admit the historical arbitrary minor values.
The accepted major range remains 45–70, not full Java 26 compatibility. A
57-scenario check also covers definition recovery, application-loader error
propagation and normal shutdown after the pending launch diagnostic. General VM
verification and opt-in preview execution remain separate work.

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
yarn ci:class-file-version:test
yarn ci:class-file-version
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
records Chromium as not run. These seeds do not complete PLAN-001, M0, W-JAVA21
or W-JAVA25; the full language/VM/library census and additional source-feature
probes remain open.

## Remaining work inventory

These **23 planning packages** are an initial decomposition, not an exhaustive
API list, equal-sized tasks or an estimate of implementation effort. Do not sum
their statuses into a completion percentage. PLAN-001 expands them into the
actual requirement/test inventory before a denominator is frozen.

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

### Scope and measurement

| ID | Priority and current state | Required work and exit evidence |
| --- | --- | --- |
| PLAN-001 | P0; target/workload scope approved and 23-requirement seed manifest checked in; complete requirements inventory absent | Expand the versioned manifest beyond the selected seed requirements. Enumerate applicable JLS/JVMS requirements and all target Java SE modules, exported public/protected types and members, service/provider contracts and behavioral changes, including inherited Java 8 behavior. Map each to an owner package, specification, status and tests, with no unclassified entries. Classify preview/incubator/JDK-specific features separately; preserve exclusions in the ledger. |

### JVM and language execution

| ID | Priority and current evidence | Exit evidence and main dependencies |
| --- | --- | --- |
| JVM-001 | P0; pinned true-javac 21/25 Node/Chromium seed plus twenty-five admission cases with explicit header mutations and disabled-preview rejection | Expand the selected corpus and retained provenance beyond version admission. Preserve the distinction between untouched compiler output and deliberate invalid/header controls. Foundation for W-JAVA21/25 remains partial; preview execution is outside the final-only profile. |
| JVM-002 | P1; verifier coverage unassessed; default-method superinterface initialization excluded in [invoke design](design/java-lang-invoke.md#lookup-class-initialization) | Spec-mapped valid/malformed corpus for format, stack maps, operand/local types, branches, linking/default resolution and initialization order/failure caching, including exact specified errors. Depends on JVM-001; module access also needs JVM-011. |
| JVM-003 | P1; selected handles/lookups, but full conversions and executable VarHandles unclaimed in [implemented invoke slices](design/java-lang-invoke.md#implemented-slices) | Matrices for lookup/access, invocation/adaptation/combinators and field/array VarHandle read/write/CAS/update semantics. Verify memory-order requirements separately. Depends on JVM-001/002; module cases on JVM-011. |
| JVM-004 | P1; selected indy/condy paths, with unsupported general bootstraps in [constant pool](../src/ConstantPool.ts) and [open questions](design/java-lang-invoke.md#open-design-questions) | User bootstrap handles, nested dynamic arguments, adaptation/access, success/failure caching and specified exceptions; retain lambda, concat, record and compiler probes. Depends on JVM-003. |
| JVM-005 | P2; hidden definition/discovery explicitly missing in [core gaps](modern-java.md#known-core-lang-gaps) | Hidden class and class-data definitions, initialization, lookup privileges, nestmate options, names/descriptors and discovery restrictions match native contracts. Depends on JVM-002/003; module cases on JVM-011. |
| JVM-006 | P1; [record gaps](modern-java.md#known-record-gaps): raw generic fallbacks, nested annotation gaps and restricted ObjectMethods fast path | Genuine javac records with generic/annotated components, constructors/accessors, object methods and reflection/handles pass; general bootstrap forms have explicit tests. Depends on JVM-001/003/004. |
| JVM-007 | P1; [sealed-class gaps](modern-java.md#known-sealed-class-gaps): direct enforcement exists, reflective error fidelity remains partial | Direct and reflective custom-loader cases cover permitted parents, invalid metadata, package/module constraints and exact errors. Depends on JVM-002; module cases on JVM-011. |
| JVM-008 | P1; selected genuine 21/25 patterns/switches/bootstrap contracts, final unnamed forms, module imports, flexible constructors and compact/instance-main startup covered on Node/Chromium; three pinned launcher differences remain explicit | Expand the selected corpus, including separately evolved sealed/enum binaries and public bootstrap access. Resolve oracle differences without equating native behavior with specification requirements. Distinguish compile-time syntax from runtime/launcher obligations. Depends on JVM-001/004/006/007. |
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

PLAN-001 must also cover the remaining standard modules: desktop/data transfer,
compiler APIs/annotation processing, instrumentation, naming, preferences, RMI,
scripting, SQL/rowsets/transactions, XML/XML cryptography, authentication and
logging, among others. Assign implementation packages after the census; neither
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
| M3: broader Java SE conformance | Resolve the remaining spec/module inventory and host boundaries beyond the workload profiles | No required entry is partial, missing or unassessed; applicable conformance evidence is recorded. Any permitted platform exclusions need specification justification. Certification is a separate claim. |

The next coherent implementation units should be:

1. Expand the approved target/workload seed manifest into the full requirement
   inventory. Keep unknowns visible instead of inventing a coverage denominator.
2. Expand the pinned native Java 21/25 Node and Chromium corpus beyond the
   version-admission gate, retaining separate host results and explicit
   generated/mutated inputs for each requirement.
3. Expand the selected final-language/launcher corpus into remaining positive,
   negative and evolved-binary cases. Preserve the three pinned launcher
   differences; classify observed failures before choosing fixes.
4. Define module, scheduler/virtual-thread and host-native feasibility decisions
   in parallel with independent library work. They can change the critical path
   and cannot be estimated as a series of small API overlays.
5. Fix one measured requirement at a time, retain native and host regressions,
   and commit each independently reviewable unit.

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
