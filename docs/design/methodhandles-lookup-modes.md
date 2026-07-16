# MethodHandles Lookup Mode Design

`MethodHandles.Lookup` is loaded from Doppio's Java 8 bootstrap image. Java 9
added module-aware mode bits and Java 14 added `ORIGINAL`; replacing the legacy
`allowedModes` field directly would change Java 8 member-access bytecode that
still interprets only the low four bits. This slice therefore keeps access
enforcement and modern API reporting as two explicit representations.

## Selected Scope

- Expose exact public static final `MODULE`, `UNCONDITIONAL`, and `ORIGINAL`
  fields with values 16, 32, and 64.
- Report Java 17-compatible `lookupModes()` values for local unnamed-module
  lookups, same-class and selected nested-class `in` results,
  `privateLookupIn`, `publicLookup`, and each valid single-mode drop.
- Keep `hasFullPrivilegeAccess()`, deprecated `hasPrivateAccess()`, and selected
  `toString()` suffixes consistent with the reported modes.
- Preserve the Java 8 low-bit `allowedModes` value used by existing lookup and
  access-check bytecode.

Named-module teleporting lookups, non-null `previousLookupClass()`, qualified
exports/opens, SecurityManager checks, and every cross-module `Lookup.in`
transition remain outside this slice.

## HotSpot 17 Oracle

The focused fixture records these values:

| Lookup shape | Raw modes | String suffix | Full privilege |
| --- | ---: | --- | --- |
| Original caller lookup | 95 | none | yes |
| Same-class `in` | 95 | none | yes |
| Nested-class `in` | 31 | none | yes |
| Same-module `privateLookupIn` | 31 | none | yes |
| Public lookup singleton | 32 | `/publicLookup` | no |
| Drop `PRIVATE` | 25 | `/package` | no |
| Drop `PROTECTED` | 27 | `/private` | yes |
| Drop `PACKAGE` | 17 | `/module` | no |
| Drop `PUBLIC` | 0 | `/noaccess` | no |
| Drop `MODULE` | 1 | `/public` | no |
| Drop `UNCONDITIONAL` | 27 | `/private` | yes |
| Drop `ORIGINAL` | 27 | `/private` | yes |

## Runtime Representation

The Java object retains its existing `allowedModes` field. The VM may attach a
non-classfile sidecar integer for the modern mode set:

1. `MethodHandles.lookup()` objects without a sidecar infer 95 from legacy
   full modes.
2. The public singleton is identified before inference and reports 32.
3. Unmarked Java 8 `Lookup.in` results infer 31 from private/package modes, 25
   from package modes, 17 from public-only modes, and 0 from no access. This is
   valid for the tested same unnamed-module shapes.
4. `privateLookupIn` explicitly records 31 on the new lookup.
5. `dropLookupMode` computes the modern transition first, stores it on the new
   lookup, and writes only its low four bits to `allowedModes` for Java 8 access
   bytecode.

The parsed `lookupModes()` method delegates to a narrow native helper that
reads this representation. It remains public, concrete, non-native, and keeps
the Java 8 method slot and reflection metadata. `Lookup.toString()` consumes
the public method and maps the selected modern values without reading the
sidecar directly.

## Classfile Metadata

The three modern fields are appended as ordinary field-info entries with
`ACC_PUBLIC | ACC_STATIC | ACC_FINAL`, descriptor `I`, and exact
`ConstantValue` attributes. The fixture uses reflection rather than only
source references because javac inlines integer constants and would otherwise
hide missing runtime fields.

## Validation Gates

1. Compile and run `Java17MethodHandlesLookupModes` on HotSpot 17 to establish
   field/method metadata, raw values, transitions, privilege probes, and
   strings.
2. Confirm the same fixture fails on the unmodified Doppio runtime.
3. Run all focused Lookup fixtures, including class definition/access,
   initialization, private lookup, and unreflect paths.
4. Run the full Java 9-26 runtime suite and Kotlin/Scala MethodHandles compiler
   smokes before claiming the selected scope.

The 2026-07-17 validation completed the full Java 9-26 runtime suite in 5
minutes 36 seconds, Kotlin 2.4.0 MethodHandles compiler smoke in 211 seconds,
and Scala 2.13.18 MethodHandles compiler smoke in 93 seconds.
