#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${KOTLIN_COMPILER_VERSION:-2.4.0}"
cache_dir="${KOTLIN_REFLECT_SMOKE_CACHE_DIR:-"${KOTLIN_SMOKE_CACHE_DIR:-"$repo_root/build/kotlin-smoke-cache"}"}"
work_dir="${KOTLIN_REFLECT_SMOKE_WORK_DIR:-"$repo_root/build/kotlin-reflect-smoke"}"
compiler_jar="${KOTLIN_COMPILER_JAR:-}"
stdlib_jar="${KOTLIN_STDLIB_JAR:-}"
reflect_jar="${KOTLIN_REFLECT_JAR:-}"
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

compiler_lib_dir="$(dirname "$compiler_jar")"
if [ -z "$stdlib_jar" ]; then
  candidate_stdlib_jar="$compiler_lib_dir/kotlin-stdlib.jar"
  if [ -f "$candidate_stdlib_jar" ]; then
    stdlib_jar="$candidate_stdlib_jar"
  fi
fi
if [ -z "$stdlib_jar" ] || [ ! -f "$stdlib_jar" ]; then
  echo "Kotlin stdlib jar not found; set KOTLIN_STDLIB_JAR or use the kotlin-compiler package layout." >&2
  exit 1
fi
if [ -z "$reflect_jar" ]; then
  candidate_reflect_jar="$compiler_lib_dir/kotlin-reflect.jar"
  if [ -f "$candidate_reflect_jar" ]; then
    reflect_jar="$candidate_reflect_jar"
  fi
fi
if [ -z "$reflect_jar" ] || [ ! -f "$reflect_jar" ]; then
  echo "Kotlin reflect jar not found; set KOTLIN_REFLECT_JAR or use the kotlin-compiler package layout." >&2
  exit 1
fi
if [ -z "$compiler_cp" ]; then
  compiler_cp="$compiler_jar"
fi

runner="$repo_root/build/release-cli/console/runner.js"
source_dir="${KOTLIN_REFLECT_SMOKE_SOURCE_DIR:-"$repo_root/classes/kotlin_reflect_smoke"}"
out_dir="$work_dir/out"

rm -rf "$out_dir"
mkdir -p "$out_dir"

compile_timeout="${KOTLIN_REFLECT_SMOKE_COMPILE_TIMEOUT_SECONDS:-300}"
run_timeout="${KOTLIN_REFLECT_SMOKE_RUN_TIMEOUT_SECONDS:-90}"
responsiveness="${DOPPIO_KOTLIN_RESPONSIVENESS:-100000}"
source_cp="$stdlib_jar:$reflect_jar"

compile_start="$(date +%s)"
timeout -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_cp" \
  org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \
  -no-stdlib \
  -no-reflect \
  -cp "$source_cp" \
  -d "$out_dir" \
  "$source_dir"/*.kt
compile_end="$(date +%s)"

test -f "$out_dir/ReflectSmokeBox.class"
test -f "$out_dir/ReflectSmokeBox\$Companion.class"
test -f "$out_dir/ReflectTag.class"
test -f "$out_dir/ReflectDefaults.class"
test -f "$out_dir/ReflectGenericHolder.class"
test -f "$out_dir/ReflectNode.class"
test -f "$out_dir/ReflectEmptyNode.class"
test -f "$out_dir/ReflectValueNode.class"
test -f "$out_dir/ReflectSmokeKt.class"
test -f "$out_dir/META-INF/main.kotlin_module"

runtime_cp="$out_dir:$stdlib_jar:$reflect_jar"
expected_output="ReflectSmokeBox|count,name|5|r:box:5|box:render:prefix|s:seed:1|d:x:8/d:x:12|ReflectEmptyNode,ReflectValueNode:empty|String[]:false|item:T[]:false,maybeItems:List[T?]:false"

native_output="$(java -cp "$runtime_cp" ReflectSmokeKt)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" ReflectSmokeKt)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Kotlin reflect smoke passed in $((compile_end - compile_start))s."
