#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${KOTLIN_COMPILER_VERSION:-2.4.0}"
cache_dir="${KOTLIN_SMOKE_CACHE_DIR:-"$repo_root/build/kotlin-smoke-cache"}"
work_dir="${KOTLIN_SMOKE_WORK_DIR:-"$repo_root/build/kotlin-smoke"}"
compiler_jar="${KOTLIN_COMPILER_JAR:-}"
stdlib_jar="${KOTLIN_STDLIB_JAR:-}"
classpath_mode="${KOTLIN_SMOKE_CLASSPATH_MODE:-minimal}"
compiler_cp="${KOTLIN_COMPILER_CLASSPATH:-}"

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
if [ -z "$compiler_cp" ]; then
  case "$classpath_mode" in
    minimal)
      compiler_cp="$compiler_jar"
      ;;
    full)
      compiler_lib_dir="$(dirname "$compiler_jar")"
      compiler_cp="$(printf ':%s' "$compiler_lib_dir"/*.jar)"
      compiler_cp="${compiler_cp#:}"
      ;;
    *)
      echo "Invalid KOTLIN_SMOKE_CLASSPATH_MODE: $classpath_mode" >&2
      exit 1
      ;;
  esac
fi

runner="$repo_root/build/release-cli/console/runner.js"
source_dir="${KOTLIN_SMOKE_SOURCE_DIR:-"$repo_root/classes/kotlin_smoke"}"
out_dir="$work_dir/out-hello"
modern_overlay_jar="$repo_root/build/modern-bootstrap-overlay/modern-bootstrap.jar"
modern_boot_jar="$repo_root/vendor/java_home/lib/doppio.jar"
runtime_boot_jar="$repo_root/vendor/java_home/lib/rt.jar"
compiler_target_cp="$modern_overlay_jar:$modern_boot_jar:$runtime_boot_jar:$stdlib_jar"

if [ ! -f "$modern_overlay_jar" ] || [ ! -f "$modern_boot_jar" ] || [ ! -f "$runtime_boot_jar" ]; then
  echo "Doppio compiler bootstrap classpath is incomplete; build the modern release CLI first." >&2
  exit 1
fi

rm -rf "$out_dir"
mkdir -p "$out_dir"

compile_timeout="${KOTLIN_SMOKE_COMPILE_TIMEOUT_SECONDS:-900}"
run_timeout="${KOTLIN_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
kill_after="${KOTLIN_SMOKE_KILL_AFTER_SECONDS:-30}"
responsiveness="${DOPPIO_KOTLIN_RESPONSIVENESS:-100000}"

compile_start="$(date +%s)"
timeout -k "${kill_after}s" -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_cp" \
  org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \
  -no-reflect \
  -no-jdk \
  -classpath "$compiler_target_cp" \
  -java-parameters \
  -d "$out_dir" \
  "$source_dir"/*.kt
compile_end="$(date +%s)"

test -f "$out_dir/HelloKt.class"
test -f "$out_dir/META-INF/main.kotlin_module"

kotlin_bytecode_dump="$work_dir/kotlin-smoke-javap.txt"
javap -classpath "$out_dir" -v HelloKt > "$kotlin_bytecode_dump"
grep -Fq 'SourceFile: "Hello.kt"' "$kotlin_bytecode_dump"
grep -Fq 'kotlin.Metadata(' "$kotlin_bytecode_dump"

runtime_cp="$out_dir"
runtime_cp="$runtime_cp:$stdlib_jar"
default_expected_output="hi"
expected_output="${KOTLIN_SMOKE_EXPECTED_OUTPUT:-"$default_expected_output"}"

native_output="$(java -cp "$runtime_cp" HelloKt)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -k "${kill_after}s" -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" HelloKt)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Kotlin compiler smoke passed in $((compile_end - compile_start))s using $classpath_mode classpath."
