# Changelog

## 0.6.0 - Unreleased

This release candidate will become the first release of the modern Doppio fork
after all release gates pass on the same commit.

### Added

- Partial Java 9–26 class-file and class-library compatibility, with focused
  native-oracle fixtures for every supported surface.
- Kotlin/JVM 2.4.0 and Scala 2.13.18 compiler-on-Doppio smoke inventories,
  backed by a deterministic compiler-only bootstrap overlay.
- A Vite-built documentation site and Chromium-gated Java, Kotlin, and Scala
  playground for GitHub Pages.
- A verified npm package artifact with four CLI entry points, a browser bundle,
  and TypeScript 6 public declarations.
- A checked-in release profile and explicit compatibility boundaries in
  [`docs/support.md`](docs/support.md).

### Changed

- The supported build toolchain is Node.js 24, Yarn 1.22, TypeScript 6, and a
  Java 17 JDK. TypeScript 7 RC compatibility is checked separately.
- The browser release library is built with Vite, while the CLI and legacy
  bootstrap build remain compatible with the original Grunt task graph.
- Native Java runouts are fingerprinted by the exact Java executable and
  version, and the bundled Nashorn fixture has a Doppio-owned golden output.
- The exact 50 Kotlin and 23 Scala compiler smokes run in eight balanced,
  isolated shards. Compiler inputs are hash-locked, each script has independent
  compile/runtime deadlines and forced process-tree termination, and a stable
  terminal gate requires every completion ledger.
- The npm installer verifies the pinned JDK archive and its classpath files,
  validates archive paths and entry types, and replaces an existing runtime
  transactionally with rollback on failure.

### Fixed

- Default-provider `Files` APIs, channel open flags, copy/move metadata,
  owner access modes, scatter/gather progress, append placement, and provider
  exception boundaries.
- File-descriptor lifetime safety across asynchronous completion, close, reuse,
  mapping, transfer, interrupted/would-block status returns, duplicate
  callbacks, and interruptible copy cancellation.
- Modern reflection, method-handle, invokedynamic, class-loading, collection,
  stream, time, I/O, and language-runtime compatibility covered by the modern
  Java matrix.

The supported profile is intentionally narrower than a complete Java 26 or
POSIX implementation. See [`docs/support.md`](docs/support.md) before treating
an unlisted API or host platform as supported.
