# Doppio Modern support policy

This fork has a deliberately bounded release profile. “Supported” means that a
surface is exercised by the repository's release gates on the versions below;
it does not mean that every API introduced by the named Java release is
implemented.

## Release profile

| Area | Release-gated profile |
| --- | --- |
| CLI host | Ubuntu Linux with Node.js 24.x |
| Source build and native oracle | Java 17 JDK |
| Newer native-oracle seed | Locked Corretto 21.0.11 and 25.0.3 on Linux x64 for twenty selected fixtures plus a launcher gate, separate from full Java 21/25 support |
| Browser | Chromium through Playwright 1.57.0 |
| Browser filesystem | BrowserFS 1.3.0, with read-only XHR runtime data and InMemory writable mounts |
| Java runtime surface | Java 8 bootstrap image plus the Java 9–26 classfile and class-library surfaces listed in the compatibility matrix |
| Module model | Class path and unnamed modules |
| Kotlin | Kotlin/JVM compiler 2.4.0 smoke inventory |
| Scala | Scala compiler 2.13.18 smoke inventory |
| Groovy | Apache Groovy 4.0.33 focused Doppio compiler and runtime smoke |
| Clojure | Clojure 1.12.6 host AOT output running on Doppio, focused smoke only |
| TypeScript | TypeScript 6 plus the repository's TypeScript 7 RC compatibility check |

Linux is the release-gated CLI platform. macOS and Windows may continue to
work, but they are not part of the fork's release promise until equivalent CI
jobs exist. Chromium is the release-gated browser; the historical Karma
configurations for other browsers are not release gates.

The detailed supported Java methods, classfile attributes, language features,
and compiler probes are recorded in [the compatibility matrix](modern-java.md).
An unlisted Java 9+ API must pass a focused native-oracle fixture before it is
counted as supported.

The [repository compatibility roadmap](https://github.com/seo-rii/doppio/blob/modern/docs/compatibility-roadmap.md)
records the approved Java 21/25 development targets and remaining work with
completion criteria. Those targets do not expand this release profile until
their required gates pass.

## Explicit boundaries

The following are intentional platform boundaries rather than incomplete
release work:

- Doppio does not model named-module exports, opens, readability edges, or
  strong encapsulation. Reflection and method-handle access are supported only
  for the documented class-path/unnamed-module shapes. Java 25 module-import
  source lowering does not expand this runtime module model.
- BrowserFS is a single-user filesystem. Doppio evaluates its stored owner
  permission bits, but does not model multiple users or groups.
- BrowserFS 1.3 cannot provide Linux-compatible read handles for directories,
  shared live inode state across separately opened handles, rename-aware dirty
  handles, or an atomic no-follow open. The browser bridge therefore promises
  the single-handle file operations covered by the Chromium acceptance suite,
  not concurrent POSIX inode semantics.
- BrowserFS scatter/gather fallbacks use sequential operations. They preserve
  committed progress, but do not claim a single atomic host-operation boundary.
- Extended attributes are not copied because Node core and BrowserFS expose no
  descriptor xattr API. The default provider treats the xattr list as empty
  while preserving supported basic and POSIX metadata.
- `ExtendedOpenOption.DIRECT` cache-bypass I/O and native file locks are not
  supported. Neither Node core nor BrowserFS supplies the required portable
  primitive, and Doppio does not silently claim aligned direct-I/O or
  cross-process lock semantics.
- Mapped buffers retain the correct descriptor generation after channel close,
  but prompt GC-triggered cleaner execution is not guaranteed. Explicit
  cleaner/unmap execution or VM teardown releases the copied mapping storage.

Because module access and filesystem permissions are compatibility models,
Doppio must not be used as a security sandbox for untrusted code.

## Release gates

The `Modern Java` workflow owns the Node/Java runtime gate. Its producer job
runs both TypeScript checks, builds a fresh release CLI, runs the Java 17 legacy
and modern runtime fixtures, and emits a deterministic, source-verified runtime
artifact. Eight compiler shards consume that exact artifact and the locked
Kotlin/Scala compiler inputs. They also verify pinned Groovy/Clojure JAR hashes
and execute the complete 75-script inventory with
per-script and outer timeouts, and upload raw completion ledgers. A stable
terminal job fails unless both the producer and every shard succeed.

The producer also runs twenty selected string API, binary32 instruction, final-language,
public switch API, bootstrap-contract and Java 25 `java.lang.IO` fixtures with pinned javac 21 and 25
drivers, comparing each against its matching native runtime and the same Doppio
release CLI and Chromium browser bundle. The
contract fixture's companion is explicitly generated after javac with its
generator hash and execution recorded. Twenty-seven cases produce fifty-four host
comparisons that verify class versions, identical finite UTF-8 standard input and
unchanged execution-input byte hashes, retaining a provenance/result ledger on
failure. These selected fixtures are the initial verification corpus for Java
21/25. The repository roadmap describes the seed manifest and local
`yarn ci:java-compatibility:*` commands.

The Java 25-only public primitive-switch fixture adds 651 assertions for eight
selector types and corresponding primitive/wrapper Class labels, including typed
handles, restarts, snapshots and Boolean restrictions. This is selected pinned
native behavior. A separate Java 25-only exact-conversion fixture adds 2,926
assertions for all 49 numeric primitive selector/Class-label pairs, including
range, precision, signed-zero and saturation boundaries. Declared reference/boxed selectors with
cross-numeric conversions, preview constant labels and primitive source patterns
remain outside the corpus; this is not complete public API conformance.

The binary32 fixture adds 471 assertions per release for selected float numeric
instructions on Java 21/25, including midpoint rounding, signed zeros,
subnormal/overflow boundaries and float-to-long saturation. Widened values
expose excess intermediate precision. Hot loops and separate 48-case rounding
and 17-case float-to-long contracts cover selected interpreter/JIT behavior.
Explicit bootstrap/constant long-to-double-to-float adapters, native math
libraries and complete floating-point conformance remain outside this slice.

An additional `yarn ci:java25-main` gate exercises twelve successful Java 25
launches, six failure cases and two legacy Java 21 launches on Node and Chromium.
Three additional inherited-main cases follow JLS 25 section 12.1.4 in separate
guest assertions: pinned Corretto 25.0.3 instead invokes private or non-inherited
package-access superclass methods in those cases. They are explicitly reported
as oracle differences, not native-equality passes. The total is twenty-three
launcher cases and forty-six guest checks. Compact sources are compiled
externally; this does not add hosted javac 25 or Java source-file launching.

The independent `yarn ci:java-uncaught-exit` gate compares sixteen cases against
pinned native Java 21/25 on Node and Chromium: thirty-two native executions and
sixty-four guest checks. Uncaught main exceptions, errors and linkage failures
exit with status 1; caught failures and uncaught child-thread failures leave a
successful main at status 0. Custom/default handlers, initialization failures,
non-daemon child completion and explicit `System.exit(0/7)` are covered, including
an exit from the main thread's handler overriding its failure status. The gate
retains exact status/stream comparisons and unchanged-input hashes on failure.
Selected throwables have cleared stacks for deterministic comparison; this does
not establish general stack-trace formatting or thread-scheduling equivalence.
A separate 26-scenario check covers main completion and shutdown for class-file
majors 52, 65 and 69, including failure recording before handler dispatch.

The class-file admission gate (`yarn ci:class-file-version`) compares twenty-five
cases against pinned native Java and both hosts: two untouched javac 21/25
controls, four labeled historical header controls and nineteen negative cases.
Unsupported majors/minors and disabled previews produce
`UnsupportedClassVersionError`; malformed magic and truncated headers retain
`ClassFormatError`. Every rejected input must fail before initialization or main
execution. Fifty guest checks preserve identical input hashes. A separate
57-scenario check covers parser/loader/Lookup classification, recovery after
failed definitions, application-loader propagation and deferred launch shutdown.
Historical header mutations are structural probes, not language compatibility
claims; the existing major range 45–70 remains partial.

The `yarn ci:java-pattern-evolution` gate separately recompiles enum and sealed
declarations without changing their javac 21/25 callers or synthetic helpers.
Fourteen native-compared cases on Node and Chromium (twenty-eight guest checks)
cover added/reordered enum constants, new permitted sealed-class/interface
implementations, known values, nulls, guards and selected exhaustive-switch
`MatchException` behavior. Its ledger preserves compilation and replacement
hashes. This is a selected evolved-binary corpus, not full binary compatibility.

The `Pages` workflow owns the browser gate. It builds the deployable artifact,
runs the complete Chromium acceptance suite locally before upload, deploys only
after that succeeds, and repeats the acceptance suite against the deployed URL.
The browser suite covers documentation and mobile layout, Java/Kotlin/Scala
compilation and execution, provider file mutations, and a descriptor-close
canary that uses a real BrowserFS read result with controlled next-event-loop
callback deferral. The pinned InMemory backend normally completes that operation
synchronously; the deferral deliberately exercises the completion boundary.

The `Package artifact` workflow owns the npm distribution gate. It performs a
clean prepack, verifies the tarball allowlist and package-local runtime links, and
installs the result in an isolated consumer. It then rebuilds twice, invokes all
four command-line entry points, executes the browser bundle through Vite, and
type-checks the public API with TypeScript 6. The isolated installed-consumer
phase uses an offline JDK fixture, so its repeated install, rebuild, and runtime
checks do not depend on the download host. Building the tarball from a fresh
checkout still obtains the pinned JDK archive during prepack, and a normal first
install also requires network access. The downloader pins the archive digest,
validates its contents, and replaces an existing runtime transactionally.

A release candidate is complete only when all three workflows pass on the same
commit. The principal local equivalents are:

```sh
yarn typecheck
yarn typecheck:bootstrap
yarn ci:check-modern-java-workflow:test
yarn ci:check-modern-java-workflow
yarn ci:check-compiler-bootstrap-consumers:test
yarn ci:check-compiler-bootstrap-consumers
node ci/check_package_artifact_contract_test.mjs
node ci/check_package_artifact_contract.mjs
node ci/download_jdk_transaction_test.cjs
yarn ci:check-package-artifact
grunt --stack test --grunt-ignore-compile-errors
grunt --stack test-modern-java17 --grunt-ignore-compile-errors
./ci/build_pages.sh
./ci/run_pages_browser_smoke.sh
```

The compiler manifest enumerates the full Kotlin, Scala, Groovy, and Clojure
script set; use it rather than a hand-maintained partial list when certifying
a release.
