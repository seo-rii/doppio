# Java SE 21/25 API census component

`node ci/check_java_se_api_census.mjs` verifies a reproducible structural
catalogue against the pinned Corretto 21/25 toolchains and the official Oracle
[Java SE 21](https://docs.oracle.com/en/java/javase/21/docs/api/index.html) and
[Java SE 25](https://docs.oracle.com/en/java/javase/25/docs/api/index.html)
API indexes. The explicit 22-module set includes `java.smartcardio`; it is not
derived from the `java.se` aggregator alone.

The helper reads module descriptors and compiler-model elements from each
verified JDK image. For every unqualified exported package it records class-file
provenance, visible public/protected top-level and nested types, and visible
declared/inherited members. It also records module `requires`, exports, opens,
uses and provides directives, plus excluded `jdk.*` modules. The raw sorted TSV
has one record per line. `classFile` rows are image provenance, **not** claims
that every such class is part of the public Java SE API. Qualified exports are
module directives, not generally exported Java SE package APIs.

The gate compares *every* catalogued public type to Oracle's
`type-search-index.js` and resolves *every* Java SE entry in
`member-search-index.js` to a matching type, member kind, name and normalized
overload parameter list in the compiler-model inventory. It cross-checks
edition-specific `@PreviewFeature` membership with `preview-list.html`. Nine
Java 25 reflective-preview visitor classes omitted from that summary page are
an explicit exception only after their own Oracle type pages identify them as
reflective preview APIs. Their type and member catalogue rows are excluded from
the final-only applicability profile. An unexpected difference fails the gate.

Generated artifacts under `build/java-se-api-census/` are:

| Path | Contents |
| --- | --- |
| `jdk21.tsv.gz`, `jdk25.tsv.gz` | Complete sorted structural rows |
| `jdk21.catalogue.jsonl.gz`, `jdk25.catalogue.jsonl.gz` | One projected inventory item per structural row |
| `jdk*.oracle-{type,member,preview}.gz` | Raw official search indexes/preview page used for the comparison |
| `jdk*.oracle-reflective.json.gz` | Raw reflective-preview pages, when applicable |
| `summary.json` | Per-edition counts, digests, official-source identities and projection totals |

Each JSONL item has a stable `id`, edition, module, declaration, owner package,
applicability classification, official specification URL, contract scope,
implementation state, verification state, and a stable test-plan ID and
description. Member items also retain the declaring owner and erased overload
parameters. Where the Oracle member index has a matching detail anchor, the
URL points directly to it; otherwise the containing official type page and
member locator are retained. `ci/java_se_api_owner_rules.json` is the reviewed
primary-owner mapping. These mappings are **not** assertions that a member is
implemented or tested: currently applicable rows remain `unassessed` and
`pending-specification-derived-test`.

`ci/java_se_api_census.lock.json` pins the toolchain/source/rule hashes,
official index hashes, module digests and catalogue digest. A deliberate source
or toolchain update can run
`node ci/check_java_se_api_census.mjs --propose-baseline` and review the proposal
written under `build/java-se-api-census/`; normal verification never updates
the checked-in lock. The focused verifier tests run with
`node --test ci/check_java_se_api_census_test.mjs`.

This is the API declaration/source component of PLAN-001, not a claim that
PLAN-001 is complete by itself. JLS/JVMS behavioral clauses, inherited Java 8
semantics, incorporated specifications, serialized-form/doc-files and
service-provider prose require the other PLAN-001 inventories and their own
classification and test plans. A passing structural gate does not claim runtime
Java SE compatibility.
