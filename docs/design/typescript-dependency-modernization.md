# TypeScript and Dependency Modernization

This document tracks the Doppio build-tool upgrade path separately from Java
runtime compatibility work. The build currently relies on a legacy Grunt and
TypeScript pipeline, with Vite handling the release browser library bundle and
Webpack 1 still handling dev/test/benchmark browser bundles. Compiler upgrades
should stay staged and verified by the existing Java/Kotlin/Scala smokes.

## Baseline

- Previous compiler: `typescript@2.2.1` from the lockfile, despite
  `package.json` allowing `^2.0.3`.
- First upgraded compiler: `typescript@2.9.2`, pinned in `package.json` and
  `yarn.lock`.
- Current default compiler: `typescript@6.0.3`, pinned in `package.json` and
  `yarn.lock`.
- Compatibility compiler: `typescript@7.0.1-rc`, exercised through no-emit CI
  checks.
- Grunt TypeScript task: upgraded from `grunt-ts@6.0.0-beta.3` to
  `grunt-ts@6.0.0-beta.22`.
- Release browser bundler: `vite@4.5.14` library-mode UMD build, with
  BrowserFS kept as an external `BrowserFS` global.
- Remaining browser bundlers: Webpack 1 is still used for dev, fast-dev,
  browser-test, and benchmark bundles.
- Dependency installation must allow optional dependencies because esbuild's
  platform binary is delivered that way.
- Host CI runtime: Node 24 through `.github/workflows/modern-java.yml`.
- Current TypeScript npm tags observed during the upgrade audit: `latest` is
  `6.0.3`; `rc` is `7.0.1-rc`.

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
- `uglify-js@2` cannot parse ES2015 output, and the remaining Webpack 1
  dev/test/benchmark paths still use their legacy loader/plugin surface.

The current compromise is deliberate:

- Grunt emit uses `typescript@6.0.3` with `target=es5` and
  `--ignoreDeprecations 6.0` so the remaining Webpack 1 dev/test/benchmark
  paths keep working.
- `grunt release` now builds `build/release/doppio.js` through Vite library
  mode. The config preserves the existing `Doppio` UMD global, BrowserFS
  external/global behavior, BrowserFS-backed Node shims, and legacy JSON
  include remapping for `jdk.json`, `package.json`, and `benchmarks.json`.
  The release bundle also aliases `crypto` to a small browser shim so Vite does
  not replace the `NodePRNG` import with a browser-external placeholder.
- Project and Grunt bootstrap no-emit checks use `target=ES2015`; these pass
  under both `typescript@6.0.3` and `typescript@7.0.1-rc`.
- The first Grunt bootstrap compile may run before `includes/JVMTypes.d.ts` and
  `vendor/java_home/jdk.json.d.ts` exist. It now writes temporary declaration
  stubs and disables `noImplicitAny` for that first emit-only pass, then
  restores normal type-error behavior after real declarations are generated.
  This keeps GitHub Actions from reporting known bootstrap-only TypeScript
  annotations while preserving the later strict project and bootstrap
  typechecks.
- `grunt-contrib-uglify` is upgraded to `5.2.2` / `uglify-js@3.19.3` for CLI
  minification, with `compress.arrows=false` so Webpack 1's later Uglify pass
  still receives ES5-compatible input.
- `types/legacy-globals.d.ts` carries the smallest legacy compatibility surface
  for old Grunt task code (`AsyncFunction`, `NodeBuffer`, no-arg
  `this.options()`, and older `child_process.exec` callback typing).

## Upgrade Plan

1. Keep TypeScript 6.0.3 green under the current Grunt pipeline.
2. Keep TypeScript 7.0.1-rc no-emit checks green in CI.
3. Replace the Grunt TypeScript task with a direct `tsc --project` invocation,
   keeping Grunt only as orchestration while Java compatibility work continues.
4. Replace the remaining Webpack 1 dev/test/benchmark bundles with Vite/Rollup
   or a direct Rollup pipeline.
5. Move actual emitted JavaScript from ES5 to ES2015 and verify CLI, browser
   bundle, modern Java, Kotlin compiler, and Scala compiler smokes.
6. Upgrade DefinitelyTyped packages after the compiler target and bundler
   surface are modernized. Updating types first creates noise without changing
   runtime behavior.

## Verification Requirements

Every compiler/dependency batch should run at least:

```sh
./node_modules/.bin/tsc --project tsconfig.json --noEmit
npm run typecheck:bootstrap
npm run typecheck:typescript-7-rc
npm run typecheck:typescript-7-rc-bootstrap
./node_modules/.bin/grunt --stack ts:dev-cli
./node_modules/.bin/grunt --stack release --grunt-ignore-compile-errors
./node_modules/.bin/grunt --stack test-modern-java --grunt-ignore-compile-errors
```

For larger build-tool changes, also run the Kotlin and Scala compiler smokes:

```sh
ci/kotlin_smoke.sh
ci/kotlin_reflect_smoke.sh
ci/scala_smoke.sh
```
