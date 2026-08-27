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
| Browser | Chromium through Playwright 1.57.0 |
| Browser filesystem | BrowserFS 1.3.0, with read-only XHR runtime data and InMemory writable mounts |
| Java runtime surface | Java 8 bootstrap image plus the Java 9–26 classfile and class-library surfaces listed in the compatibility matrix |
| Module model | Class path and unnamed modules |
| Kotlin | Kotlin/JVM compiler 2.4.0 smoke inventory |
| Scala | Scala compiler 2.13.18 smoke inventory |
| TypeScript | TypeScript 6 plus the repository's TypeScript 7 RC compatibility check |

Linux is the release-gated CLI platform. macOS and Windows may continue to
work, but they are not part of the fork's release promise until equivalent CI
jobs exist. Chromium is the release-gated browser; the historical Karma
configurations for other browsers are not release gates.

The detailed supported Java methods, classfile attributes, language features,
and compiler probes are recorded in [the compatibility matrix](modern-java.md).
An unlisted Java 9+ API must pass a focused native-oracle fixture before it is
counted as supported.

## Explicit boundaries

The following are intentional platform boundaries rather than incomplete
release work:

- Doppio does not model named-module exports, opens, readability edges, or
  strong encapsulation. Reflection and method-handle access are supported only
  for the documented class-path/unnamed-module shapes.
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
Kotlin/Scala compiler inputs, execute the complete 73-script inventory with
per-script and outer timeouts, and upload raw completion ledgers. A stable
terminal job fails unless both the producer and every shard succeed.

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
type-checks the public API with TypeScript 6. The workflow uses an offline JDK
fixture so release certification does not depend on the download host. A normal
first install still requires network access; the downloader pins the archive
digest, validates its contents, and replaces an existing runtime
transactionally.

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

The compiler manifest enumerates the full Kotlin and Scala script set; use it
rather than a hand-maintained partial list when certifying a release.
