# Supplementary Java SE contract sources

`node ci/java_se_contract_sources.mjs` verifies the versioned supplementary
contract inventory for the Java 21 and 25 target editions. Prepare the pinned
toolchains first with `node ci/prepare_java_compatibility_toolchains.mjs`.
The checked-in lock pins the extractor, toolchain source archives, captured
documentation, classified inventory and coverage counts. It is an inventory
gate; its requirements remain unassessed and its contract tests remain planned.

The binary API census identifies the API surface. This complementary inventory
retains the public/protected declaration Javadoc from the same locked JDKs,
including module, package and type prose. The extractor parses source with the
matching javac and `DocTrees`; it neither executes nor attributes JDK source.
Private declarations and `@hidden` documentation do not enter API dependency
discovery. Public/protected nested declarations and implicit public interface
members are included. Preview annotations propagate from enclosing types and
their dependency records remain excluded from the final-only target edition.
Java 21 still has 16 exported management/naming packages whose `package.html`
prose is absent from `src.zip`; their official package-summary pages are captured
and indexed explicitly. Every exported source package has either source Javadoc
or such a published package contract.

Supplementary units account for the serialized forms published by the target
API, referenced `doc-files` and their linked resources, incorporated external
specifications, `ServiceLoader` and service/SPI contracts, platform specification
documents, and observed module provider identities. The generated Java 25
external-specifications index provides another reference-discovery source.
Java 21 does not publish that index at the corresponding URL: it redirects to
another edition. The Java 21 inventory instead uses its pinned public API
source documentation; another edition's landing page is never accepted as a
Java 21 source.

Source corrections are explicit and retained in the per-edition summary. The
Java 21 `InetAddressResolver.LookupPolicy` type documentation has a broken
relative networking-properties link; its `of(int)` documentation identifies
the canonical document. The inventory retains both that original link and the
verified target instead of accepting the unrelated edition landing-page redirect.
Legacy FTP specification references retain their original URI as dependencies;
they are not fetched as source captures.

Each unit has a stable source-based ID, specification URL, explicit applicability,
planning owner, implementation state and test-plan ID. Whole document/section
contracts retain their normative guarantees, including exceptions, effects,
serialization and incorporated references. A referenced document applies only
as incorporated by its citing API. Bibliographic references, examples and JDK
implementation notes do not independently become Java SE requirements. Current
edition contracts include retained Java 8 behavior; discovery does not filter
to newly introduced APIs. Corretto provider class identities are retained as
implementation evidence, while required provider capabilities remain part of
the public API contract.

Owners follow the existing roadmap package families: module/service mechanics
use JVM-011; networking/naming/RMI use LIB-006; host desktop/data-transfer/card
and preferences contracts use LIB-005; instrumentation/management use LIB-009;
compiler/scripting standard APIs and remaining standard-library contracts use
LIB-008 with finer java.base family mappings. TOOL-001 is used only for
JDK-specific tool exclusions. Ownership assigns subsequent
assessment work; it does not establish implementation or host feasibility.

The generated artifacts are:

- `build/java-se-contract-sources/contracts.json.gz`: all classified units,
  origins and planned tests.
- `build/java-se-contract-sources/jdk21-source-docs.tsv.gz` and
  `jdk25-source-docs.tsv.gz`: source files, module directives and declaration
  Javadoc. A documentation row stores the source path/offset, identity,
  SHA-256, Base64 UTF-8 comment and final/preview status. The decoder verifies
  every comment hash before producing the inventory.
- `build/java-se-contract-sources/summary.json`: source and inventory hashes,
  per-edition counts and captured document hashes.
- `build/java-se-contract-sources/documents/`: compressed official source
  captures, addressed by URL hash and verified against the lock on reuse.

To review source changes, run the generator with `--propose-baseline`, inspect
the full ledger and summary, and update the lock as a reviewed change. Unknown
modules, missing source coverage, malformed index rows, changed document bytes,
redirected URLs, missing source hashes and unclassified records fail the gate.
Run `node --test ci/java_se_contract_sources_test.mjs` for focused regressions.

Inventory completion does not establish passing behavior on Node or Chromium,
complete Java SE compatibility, or certification. API and JLS/JVMS inventory
gates supply the rest of PLAN-001; later bundles implement and test these
recorded contracts.
