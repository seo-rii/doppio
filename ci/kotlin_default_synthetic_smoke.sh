#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${KOTLIN_COMPILER_VERSION:-2.4.0}"
cache_dir="${KOTLIN_SMOKE_CACHE_DIR:-"$repo_root/build/kotlin-smoke-cache"}"
work_dir="${KOTLIN_DEFAULT_SYNTHETIC_SMOKE_WORK_DIR:-"$repo_root/build/kotlin-default-synthetic-smoke"}"
compiler_jar="${KOTLIN_COMPILER_JAR:-}"
stdlib_jar="${KOTLIN_STDLIB_JAR:-}"

if [ -z "$compiler_jar" ]; then
  dist_dir="$cache_dir/kotlin-compiler-$version"
  compiler_jar="$dist_dir/package/lib/kotlin-compiler.jar"

  if [ ! -f "$compiler_jar" ]; then
    rm -rf "$dist_dir"
    mkdir -p "$dist_dir"
    tarball="$cache_dir/kotlin-compiler-$version.tgz"
    if [ ! -f "$tarball" ]; then
      mkdir -p "$cache_dir"
      curl -fsSL "https://registry.npmjs.org/kotlin-compiler/-/kotlin-compiler-$version.tgz" -o "$tarball"
    fi
    tar -xzf "$tarball" -C "$dist_dir"
  fi
fi

if [ ! -f "$compiler_jar" ]; then
  echo "Kotlin compiler jar not found: $compiler_jar" >&2
  exit 1
fi

if [ -z "$stdlib_jar" ]; then
  candidate_stdlib_jar="$(dirname "$compiler_jar")/kotlin-stdlib.jar"
  if [ -f "$candidate_stdlib_jar" ]; then
    stdlib_jar="$candidate_stdlib_jar"
  fi
fi
if [ -z "$stdlib_jar" ] || [ ! -f "$stdlib_jar" ]; then
  echo "Kotlin stdlib jar not found; set KOTLIN_STDLIB_JAR or use the kotlin-compiler package layout." >&2
  exit 1
fi

runner="$repo_root/build/release-cli/console/runner.js"
source_dir="$repo_root/classes/kotlin_default_synthetic_smoke"
out_dir="$work_dir/out"

rm -rf "$out_dir"
mkdir -p "$out_dir"

compile_timeout="${KOTLIN_DEFAULT_SYNTHETIC_SMOKE_COMPILE_TIMEOUT_SECONDS:-360}"
run_timeout="${KOTLIN_DEFAULT_SYNTHETIC_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
responsiveness="${DOPPIO_KOTLIN_RESPONSIVENESS:-100000}"

compile_start="$(date +%s)"
timeout -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_jar" \
  org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \
  -no-reflect \
  -d "$out_dir" \
  "$source_dir"/*.kt
compile_end="$(date +%s)"

test -f "$out_dir/KotlinDefaultSyntheticHelloKt.class"
test -f "$out_dir/DefaultBox.class"
test -f "$out_dir/DefaultConfig.class"
test -f "$out_dir/DefaultFormatter.class"
test -f "$out_dir/DefaultFormatter\$DefaultImpls.class"
test -f "$out_dir/DefaultFormatterImpl.class"
test -f "$out_dir/DefaultSyntheticSmokeKt.class"
test -f "$out_dir/LeftPath.class"
test -f "$out_dir/LeftPath\$DefaultImpls.class"
test -f "$out_dir/QualifiedSuperOwner.class"
test -f "$out_dir/QualifiedSuperSmokeKt.class"
test -f "$out_dir/RightPath.class"
test -f "$out_dir/RightPath\$DefaultImpls.class"
test -f "$out_dir/META-INF/main.kotlin_module"

qualified_javap="$(javap -c -p "$out_dir/QualifiedSuperOwner.class")"
qualified_targets=(
  'InterfaceMethod LeftPath.getWeight:()I'
  'InterfaceMethod RightPath.getWeight:()I'
  'InterfaceMethod LeftPath.tag:(I)Ljava/lang/String;'
  'InterfaceMethod RightPath.tag:(I)Ljava/lang/String;'
)
for target in "${qualified_targets[@]}"; do
  if ! grep -Fq "$target" <<<"$qualified_javap"; then
    echo "Missing qualified interface-super target: $target" >&2
    exit 1
  fi
done

runtime_cp="$out_dir:$stdlib_jar"
expected_output="${KOTLIN_DEFAULT_SYNTHETIC_SMOKE_EXPECTED_OUTPUT:-"p-box:6!:p-wide:6?:[CORE]:cfg23ab:p-box:6!|p-named:6!|p-full:9!:p-r:3!|q-r:3!|q-r:3?:L4R6:7:2816"}"

native_output="$(java -cp "$runtime_cp" KotlinDefaultSyntheticHelloKt)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" KotlinDefaultSyntheticHelloKt)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Kotlin default/synthetic smoke passed in $((compile_end - compile_start))s."
