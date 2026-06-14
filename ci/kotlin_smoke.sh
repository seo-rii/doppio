#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${KOTLIN_COMPILER_VERSION:-2.4.0}"
cache_dir="${KOTLIN_SMOKE_CACHE_DIR:-"$repo_root/build/kotlin-smoke-cache"}"
work_dir="${KOTLIN_SMOKE_WORK_DIR:-"$repo_root/build/kotlin-smoke"}"
compiler_jar="${KOTLIN_COMPILER_JAR:-}"

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

runner="$repo_root/build/release-cli/console/runner.js"
source_file="$repo_root/classes/kotlin_smoke/Hello.kt"
out_dir="$work_dir/out-hello"

rm -rf "$out_dir"
mkdir -p "$out_dir"

compile_timeout="${KOTLIN_SMOKE_COMPILE_TIMEOUT_SECONDS:-600}"
run_timeout="${KOTLIN_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
responsiveness="${DOPPIO_KOTLIN_RESPONSIVENESS:-100000}"

compile_start="$(date +%s)"
timeout -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_jar" \
  org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \
  -no-reflect \
  -d "$out_dir" \
  "$source_file"
compile_end="$(date +%s)"

test -f "$out_dir/HelloKt.class"
test -f "$out_dir/META-INF/main.kotlin_module"

native_output="$(java -cp "$out_dir" HelloKt)"
if [ "$native_output" != "hi" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$out_dir" HelloKt)"
if [ "$doppio_output" != "hi" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Kotlin compiler smoke passed in $((compile_end - compile_start))s."
