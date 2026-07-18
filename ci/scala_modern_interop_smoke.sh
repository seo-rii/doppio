#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${SCALA_COMPILER_VERSION:-2.13.18}"
cache_dir="${SCALA_SMOKE_CACHE_DIR:-"$repo_root/build/scala-smoke-cache"}"
work_dir="${SCALA_MODERN_INTEROP_SMOKE_WORK_DIR:-"$repo_root/build/scala-modern-interop-smoke"}"
source_dir="$repo_root/classes/scala_modern_interop_smoke"
runner="$repo_root/build/release-cli/console/runner.js"

download_jar() {
  local group_path="$1"
  local artifact="$2"
  local artifact_version="$3"
  local classifier="${4:-}"
  local jar_name
  if [ -n "$classifier" ]; then
    jar_name="$artifact-$artifact_version-$classifier.jar"
  else
    jar_name="$artifact-$artifact_version.jar"
  fi

  local target="$cache_dir/$jar_name"
  if [ ! -f "$target" ]; then
    mkdir -p "$cache_dir"
    curl -fsSL "https://repo1.maven.org/maven2/$group_path/$artifact/$artifact_version/$jar_name" -o "$target"
  fi
  printf '%s\n' "$target"
}

compiler_jar="${SCALA_COMPILER_JAR:-}"
library_jar="${SCALA_LIBRARY_JAR:-}"
reflect_jar="${SCALA_REFLECT_JAR:-}"
diff_utils_jar="${SCALA_DIFF_UTILS_JAR:-}"
jline_jar="${SCALA_JLINE_JAR:-}"

if [ -z "$compiler_jar" ]; then
  compiler_jar="$(download_jar org/scala-lang scala-compiler "$version")"
fi
if [ -z "$library_jar" ]; then
  library_jar="$(download_jar org/scala-lang scala-library "$version")"
fi
if [ -z "$reflect_jar" ]; then
  reflect_jar="$(download_jar org/scala-lang scala-reflect "$version")"
fi
if [ -z "$diff_utils_jar" ]; then
  diff_utils_jar="$(download_jar io/github/java-diff-utils java-diff-utils 4.16)"
fi
if [ -z "$jline_jar" ]; then
  jline_jar="$(download_jar org/jline jline 3.29.0 jdk8)"
fi

compiler_cp="$compiler_jar:$library_jar:$reflect_jar:$diff_utils_jar:$jline_jar"
modern_overlay_jar="$repo_root/build/modern-bootstrap-overlay/modern-bootstrap.jar"
modern_boot_jar="$repo_root/vendor/java_home/lib/doppio.jar"
runtime_boot_jar="$repo_root/vendor/java_home/lib/rt.jar"
compiler_boot_cp="$modern_overlay_jar:$modern_boot_jar:$runtime_boot_jar"
out_dir="$work_dir/out"
source_cp="$library_jar"
runtime_cp="$out_dir:$library_jar"

if [ ! -f "$modern_overlay_jar" ] || [ ! -f "$modern_boot_jar" ] || [ ! -f "$runtime_boot_jar" ]; then
  echo "Doppio compiler boot classpath is incomplete; build the release CLI first." >&2
  exit 1
fi

rm -rf "$out_dir"
mkdir -p "$out_dir"

compile_timeout="${SCALA_MODERN_INTEROP_SMOKE_COMPILE_TIMEOUT_SECONDS:-420}"
run_timeout="${SCALA_MODERN_INTEROP_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
kill_after="${SCALA_MODERN_INTEROP_SMOKE_KILL_AFTER_SECONDS:-30}"
responsiveness="${DOPPIO_SCALA_RESPONSIVENESS:-100000}"

compile_start="$(date +%s)"
timeout -k "${kill_after}s" -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_cp" \
  scala.tools.nsc.Main \
  -javabootclasspath "$compiler_boot_cp" \
  -classpath "$source_cp" \
  -d "$out_dir" \
  "$source_dir"/*.scala
compile_end="$(date +%s)"

test -f "$out_dir/ScalaModernInteropHello.class"
test -f "$out_dir/ScalaModernJavaInteropSmoke.class"

interop_javap="$(javap -classpath "$out_dir" -c -p 'ScalaModernJavaInteropSmoke$')"
optional_call_count="$(grep -Fc 'java/util/Optional.orElseThrow:()Ljava/lang/Object;' <<<"$interop_javap" || true)"
if [ "$optional_call_count" -ne 2 ]; then
  echo "Expected two direct Optional.orElseThrow calls, found $optional_call_count." >&2
  exit 1
fi
if ! grep -Fq 'java/lang/annotation/ElementType.MODULE:Ljava/lang/annotation/ElementType;' <<<"$interop_javap"; then
  echo "Expected a direct ElementType.MODULE field reference." >&2
  exit 1
fi
if ! grep -Fq 'java/lang/annotation/ElementType.RECORD_COMPONENT:Ljava/lang/annotation/ElementType;' <<<"$interop_javap"; then
  echo "Expected a direct ElementType.RECORD_COMPONENT field reference." >&2
  exit 1
fi
if ! grep -Eq 'invokestatic[[:space:]]+#[0-9]+[[:space:]]+// Method java/lang/Runtime\.version:\(\)Ljava/lang/Runtime\$Version;' <<<"$interop_javap"; then
  echo "Expected a direct invokestatic Runtime.version reference." >&2
  exit 1
fi
if ! grep -Eq 'invokevirtual[[:space:]]+#[0-9]+[[:space:]]+// Method java/lang/Runtime\$Version\.feature:\(\)I' <<<"$interop_javap"; then
  echo "Expected a direct invokevirtual Runtime.Version.feature reference." >&2
  exit 1
fi

expected_output="0f10ff|0A0B|2:cafe:15|2020-01-02T03:04:05Z:1577934245000:2020-01-02T03:04:07Z:true|Random:82:376|SplittableRandom:true:88:574|QRS:uoe|entry:value:uoe|jk:uoe:iae:2:uoe:jk:opt:true:nse:true:true:true:true:true:true:true:true:true|17|MODULE:10:RECORD_COMPONENT:11|true::false:CONSTRUCTOR,FIELD,LOCAL_VARIABLE,METHOD,PACKAGE,MODULE,PARAMETER,TYPE"

native_output="$(java -cp "$runtime_cp" ScalaModernInteropHello)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -k "${kill_after}s" -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" ScalaModernInteropHello)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Scala modern interop smoke passed in $((compile_end - compile_start))s using Scala $version."
