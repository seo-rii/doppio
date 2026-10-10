# Phase A: requirements and execution evidence

Phase A combines `PLAN-001` (the Java SE 21/25 requirements inventory) and
`JVM-001` (genuine compiler output and class-file admission evidence). It gives
the later work bundles a reproducible work list. Completing this phase does
not mean that all those requirements are implemented or that Java SE
conformance has been established.

## Inventory units

The inventory uses complete specification sections and API contracts as work
units. A unit includes all its applicable guarantees, failures, side effects,
tables and incorporated references. The inventory does not split every sentence
into a separate task. This keeps related behavior together without dropping
requirements that do not appear in a method signature.

The implementation assessment and semantic review are deliberately separate
from this inventory classification. A pending test plan is a concrete method
for testing the whole contract, not a passing test or a claim that every
sentence has already been analyzed.

The sources are:

- The complete JLS and JVMS editions for Java 21 and 25, including chapter
  preambles, nested sections and instruction entries. The
  [source index](../ci/plan_spec_source_index.json) pins their identifiers and
  source hashes.
- All 22 Java SE `java.*` modules, their exported packages, and public/protected
  types and members. Module, package and type descriptions are contracts too.
  `java.smartcardio` is included explicitly; the `java.se` aggregate alone is
  not the module inventory.
- Supplementary contracts, including serialized forms, referenced `doc-files`,
  incorporated specifications, and service/provider behavior. Concrete provider
  classes in the pinned Corretto image are implementation evidence unless a
  Java SE contract requires the identity.

Every unit must resolve applicability and a planning-package owner, reference
its source, record the implementation assessment, and have an executable test
link or an explicit pending test plan. `unassessed` implementation and pending
tests are valid inventory states. Missing applicability or ownership is not.
Source snapshots and generated projections retain stable identifiers, reject
duplicates and omissions, and record edition differences for later assessment.
A changed source hash identifies review work; it does not prove a semantic
change.

Current-edition contracts include the behavior retained from Java 8. The
inventory therefore covers the entire target surface, not only APIs added
after Java 8. The existing Java 8-derived runtime profile and its tests remain
part of the approved workload. Preview, incubator and JDK-specific surfaces
have edition-specific boundary records; exclusions do not count as supported
final Java SE behavior.

## Reproducing the inventory

After installing repository dependencies and preparing the pinned toolchains:

```sh
yarn ci:java-compatibility:prepare
yarn ci:phase-a:test
yarn ci:phase-a:inventory
```

The source index has an offline pin. The API census independently reconciles
the pinned JDK symbols with the official type, overload and preview indexes.
The supplementary generator retains public documentation from the pinned
source archives plus referenced documentation. A changed baseline requires
review; normal verification never rewrites a checked-in lock.

The pinned component counts are:

| Inventory item | Java 21 | Java 25 |
| --- | ---: | ---: |
| Java SE modules | 22 | 22 |
| Official public/protected types | 4,055 | 4,306 |
| Official member-index entries | 46,034 | 47,924 |
| Source documentation units | 48,858 | 51,036 |
| Supplementary contract units | 2,124 | 2,176 |

The API catalogue additionally retains inherited member views and explicit
boundary/provenance records. These counts are coverage checks, not a runtime
completion percentage. See the [API census](java-se-api-census.md) and
[supplementary source inventory](java-se-contract-sources.md) for their exact
units and exclusions.

Generated evidence is retained under `build/java-se-api-census/` and
`build/java-se-contract-sources/`. Each API catalogue row carries a stable ID,
source locator, full-contract scope, applicability, owner and concrete test
plan. The combined result is `build/phase-a-inventory.json`; added, removed and
changed API/prose/dependency units are in
`build/phase-a-edition-deltas.json.gz`. JLS/JVMS edition differences remain in
the pinned source index. Every executable seed requirement resolves to one of
the full source units, without claiming that the slice covers the whole unit.

## Execution evidence

The [executable seed manifest](../ci/java_compatibility_manifest.json) remains
a selected set of implemented slices. It is linked to planning packages and
the Java 21/25 workloads, and each fixture is mandatory for its listed releases.
The full inventory can contain pending work without pretending that the seed
tests cover it.

The [admission corpus](../ci/java_class_version_test.mjs) contains 27 cases:
four untouched javac controls, four historical header controls and 19 negative
admission cases. Both compiler editions emit a simple control and a modern
shape control containing records, sealed types, lambda/string-concatenation
bootstraps, annotations and a record-pattern switch. The harness checks the
emitted `Record`, `PermittedSubclasses` and `BootstrapMethods` attributes and
records every emitted class hash. Mutated headers retain their original hash
and explicit mutation; they remain separate controls.

Native Java, Node and Chromium results are retained independently. A failed
case keeps its raw host result and the preceding evidence. Timeouts and host
errors fail the gate. The result artifact is
`build/java-class-version-results.json`.

The [execution evidence checker](../ci/check_phase_a_evidence.mjs) requires the
complete seed and admission case sets, both guest hosts, matching source hashes,
and results from the current commit with committed inputs. It rejects stale,
partial, skipped or version-patched evidence. Its success closes the execution
evidence requirement of A; `W-JAVA21`, `W-JAVA25` and broader Java SE support
still require the later bundles.

After running both complete browser-enabled seed and admission harnesses on
the same committed inputs, run `yarn ci:phase-a:evidence`. The Modern Java
workflow runs both inventory and execution checks and uploads the source
catalogues and host-result ledgers. Phase A requires both gates to pass; an
inventory-only or native-only run does not complete it.

## Planning the next bundles

Select work by owner package, dependency and test-plan family. For example,
loading/verification/linkage and initialization form a coherent B batch;
invocation and bootstrap contracts form C batches; I/O and host capabilities
form F batches. Use the inventory's pending test assignments to define each
batch's acceptance cases. A passing slice may update the linked evidence while
the rest of its complete source contract remains unassessed.

The [compatibility roadmap](compatibility-roadmap.md#work-bundles) defines the
bundle order. The [support policy](support.md) remains authoritative for support
claims.
