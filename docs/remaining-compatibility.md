# Remaining compatibility execution plan

The maintainer approved this order after the selected C7d5 exit:
public Class-File verifier and sealing reconciliation, then bundles D, E, F
and G from the [roadmap](compatibility-roadmap.md). Stay on `modern`; preserve
the existing native, Node, Chromium and language-consumer evidence. Implement,
verify, document and commit independently reviewable units in this order.

This is an execution backlog, not a completion claim or percentage. A profile
is complete only after its actual required inputs, implementation and host
results are checked. A finite profile does not discharge a broader package
or source contract. Earlier passing receipts are historical when sources or
runtime inputs change; failed runs remain available and are not waived.

## Scope and retained decisions

- Java25 final features remain the target, with Java21 as the intermediate
  workload profile. Preview/incubator features are not added to this baseline.
- Node and Chromium are separate required hosts. Keep genuine compiler input,
  runtime hashes, failure outcomes and effect/identity assertions.
- Hosted javac21/25, additional server applications, other operating systems
  and browsers are still outside the separately approved workload.
- Repository implementation and CI changes are in scope. This approval does
  not deploy or replace shared production infrastructure.
- An unavailable host capability is an explicit unresolved requirement, not
  a successful implementation or automatic specification exemption.

## Ordered worklist

| Order | Work unit | Required exit and dependencies | Status |
| --- | --- | --- | --- |
| C7e1 | Public verifier phase ordering | Native parser errors versus bytecode errors; bridge-method applicability; major49 inference limitation and major50 failover; core-class exemptions; byte/model/context and multi-error controls. Never use successful class definition as a library verification verdict. | Implemented: stock25 original65-case oracle,2 fresh-source phase checks,15 gate contracts,52 retained seam tests and exact workflow mutations passed; final clean-HEAD build/nine-host-gate aggregate pending |
| C7e2 | Public parser and legacy counter breadth | Assess native CP/member/attribute framing, names, duplicates, version and lazy inflation boundaries systematically. Reconcile old-major unreachable/high-slot counters against the native writer. Keep parser laziness, structural rejection and bytecode verification distinct. | Pending C7e1 |
| C7e3 | Public sealed topology | Reconcile all195 native sealed public types as a separate source, permitted-subclass, reflection and actual implementation-derivation contract. Matching220 nominal binary declarations or changing reflection flags alone is insufficient. | Pending C7e2; design assessment may proceed read-only |
| D1 | Execution and memory model | Document and test scheduling, synchronization, visibility/atomics, cancellation and completion on both hosts. Tests must not demand one arbitrary nondeterministic order. Owns JVM-010; preserve C3/C4's memory-order boundaries until discharged. | Pending C7e3 |
| D2 | Thread lifecycle and virtual threads | Builders/start, join/interrupt, sleep/park, thread-local state, monitor and executor interactions. Genuine virtual-thread lifecycle must not be replaced by an `isVirtual` flag. Depends on D1; blocking-I/O integration requires F. | Pending D1 |
| D3 | Concurrent libraries and ScopedValue | Executors/futures/publisher demand and cancellation; nested binding/carrier composition, success/failure restoration and per-thread isolation. Owns LIB-003, without recounting D1/D2 mechanics. | Pending D2 |
| D4 | Reachability and cleaner lifecycle | Reference processing, cleanup ownership, cancellation and resource lifetime. Owns LIB-004; resolve host reachability and F's I/O dependencies before claiming completion. | Pending D1–D3; host dependencies explicit |
| E1 | Sequenced collections | Related List/Set/Map and reversed/view/update contracts with values, identities and exceptions. Owns LIB-001. | Pending D work |
| E2 | Streams and collectors | Sequential pipelines, short-circuiting, stateful operations, resource closure and collector contracts. Parallel execution requires D's model and its own evidence. Owns LIB-002. | Pending E1 |
| E3 | Core and data libraries | Group math, time, formatting, random, charset/Unicode/locale and security families by actual shared contracts. Specify data-version and serialized/seeded-vector policies; arbitrary random-byte equality is not evidence. Owns LIB-008. | Pending E2 |
| F1 | Host capability and file/channel contracts | Separate Node/Chromium capability inventory; providers, attributes, links, walking/globs, secure operations, channels and resource lifetime. Owns LIB-005; resolve any D blocking-I/O dependency. | Pending E work |
| F2 | Networking and transport | Protocol/transport, asynchronous lifetime and specified errors, with per-host feasibility and D's scheduling/cancellation model. Owns LIB-006. | Pending F1 |
| F3 | Processes and management | Process, management and diagnostics contracts with explicit platform capabilities and lifecycle/error evidence. Owns LIB-009. | Pending F2 |
| F4 | Foreign-interface feasibility and implementation | Decide supported Node/browser arenas/segments, lifetime/confinement, layouts and controlled downcall/upcall ABI. Existing JS native bindings are not general JNI/foreign-linkage evidence. Owns LIB-010. | Pending F3; feasibility decision required |
| G1 | Module resolution and ownership | Define module image/loading, resolution/layers, ownership and services using genuine named-module inputs. Metadata-only module-info and source module imports do not implement this runtime. Owns JVM-011. | Pending F work |
| G2 | Module access enforcement and integration | Readability and qualified exports/opens; positive/negative reflection and Lookup access, service/layer and loader identities. Depends on G1 and B/C access foundations. | Pending G1 |
| Exit | Whole approved workload reconciliation | Run the applicable retained release/compiler/runtime/browser gates on the final implementation and reconcile package/source obligations. No full Java SE claim while required contracts remain partial, missing, unassessed or host-blocked. | Pending all preceding work |

Implementation proceeds in the order above. Read-only planning and independent
test preparation may overlap, but shared runtime/source changes and producer
inputs stay frozen during acceptance runs. D/F dependencies must remain
visible rather than being silently skipped to advance the table.

## Starting evidence

The selected C7d1–C7d5 worklist is closed at implementation
`a3f946decf70ad46f840417c8457fafce0e42bdc`, documented and pushed by
`78b559c6b4cafabecedb45397eb3d0ab70168df9`. Its independent consumer checked
all466 C7 units,3 VM tests and eight native25/Node/Chromium gates:
200 cases/75 cells/600 outcomes,220 nominal public types. See the
[C7d5 receipt and boundaries](phase-c-invocation.md#c7d5-verified-structural-legacy-and-final-selected-exit-2026-10-13).
The195-type sealed axis, remaining general verifier/parser families and named
modules were explicitly unproved; this new plan does not retroactively change
those old flags or receipts. C1–C6/B, retained323 and compiler consumers were
not rerun by that final C7d5 exit.
