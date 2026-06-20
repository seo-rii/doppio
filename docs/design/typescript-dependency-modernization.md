# TypeScript and Dependency Modernization

This document tracks the Doppio build-tool upgrade path separately from Java
runtime compatibility work. The build currently relies on a legacy Grunt,
Webpack 1, and TypeScript pipeline, so compiler upgrades should stay staged and
verified by the existing Java/Kotlin/Scala smokes.

## Baseline

- Previous compiler: `typescript@2.2.1` from the lockfile, despite
  `package.json` allowing `^2.0.3`.
- First upgraded compiler: `typescript@2.9.2`, pinned in `package.json` and
  `yarn.lock`.
- Grunt TypeScript task: upgraded from `grunt-ts@6.0.0-beta.3` to
  `grunt-ts@6.0.0-beta.22`.
- Host CI runtime: Node 24 through `.github/workflows/modern-java.yml`.
- Current TypeScript npm latest observed during the upgrade audit:
  `typescript@6.0.3`.

## Audit Results

`typescript@2.9.2` is the highest TypeScript 2.x release and is the smallest
safe compiler step. It initially exposed only two post-bootstrap type issues:

- Node 6 `https.get` typings do not model the string URL overload used by
  `console/download_jdk.ts`.
- The `sun_nio` `fs.stat`/`fs.access` runtime branch collapsed into a union of
  incompatible callback signatures.

Both are type-only fixes; runtime behavior is unchanged.

`typescript@6.0.3` is not a package-only upgrade from this codebase state:

- `target=ES3` is removed.
- `target=ES5` is deprecated in TS 6 and marked for removal in TS 7.
- `target=ES2015` reveals broad legacy typing issues across generated
  declarations, DefinitelyTyped packages, Grunt task context typing,
  callback nullability, `module` namespace declarations, BrowserFS typings,
  and old CommonJS callable imports.

## Upgrade Plan

1. Keep TypeScript 2.9.2 green under the current Grunt pipeline.
2. Add a no-emit TypeScript check target to CI once the current generated
   declaration bootstrap is stable enough to run without hidden generated-file
   dependencies.
3. Replace the Grunt TypeScript task with a direct `tsc --project` invocation,
   keeping Grunt only as orchestration while Java compatibility work continues.
4. Move the JavaScript output target from ES3 to ES2015, then verify CLI,
   browser bundle, modern Java, Kotlin compiler, and Scala compiler smokes.
5. Replace Webpack 1 and UglifyJS 2 in a separate batch. The current Webpack
   type surface is tightly coupled to `@types/webpack@1.x`.
6. Upgrade DefinitelyTyped packages after the compiler target and bundler
   surface are modernized. Updating types first creates noise without changing
   runtime behavior.

## Verification Requirements

Every compiler/dependency batch should run at least:

```sh
./node_modules/.bin/grunt --stack ts:dev-cli
./node_modules/.bin/grunt --stack test-modern-java --grunt-ignore-compile-errors
```

For larger build-tool changes, also run the Kotlin and Scala compiler smokes:

```sh
ci/kotlin_smoke.sh
ci/kotlin_reflect_smoke.sh
ci/scala_smoke.sh
```
