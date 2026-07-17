#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${SCALA_COMPILER_VERSION:-2.13.18}"
cache_dir="${SCALA_SMOKE_CACHE_DIR:-"$repo_root/build/scala-smoke-cache"}"
work_dir="${SCALA_DURATION_SMOKE_WORK_DIR:-"$repo_root/build/scala-duration-smoke"}"
source_dir="$repo_root/classes/scala_duration_smoke"
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
modern_boot_jar="$repo_root/vendor/java_home/lib/doppio.jar"
runtime_boot_jar="$repo_root/vendor/java_home/lib/rt.jar"
modern_overlay_jar="$repo_root/build/modern-bootstrap-overlay/modern-bootstrap.jar"
out_dir="$work_dir/out"
source_cp="$library_jar"
runtime_cp="$out_dir:$library_jar"
compiler_boot_cp="$modern_overlay_jar:$modern_boot_jar:$runtime_boot_jar"

if [ ! -f "$modern_overlay_jar" ] || [ ! -f "$modern_boot_jar" ] || [ ! -f "$runtime_boot_jar" ]; then
  echo "Doppio compiler boot classpath is incomplete; build the release CLI first." >&2
  exit 1
fi

rm -rf "$out_dir"
mkdir -p "$out_dir"

compile_timeout="${SCALA_DURATION_SMOKE_COMPILE_TIMEOUT_SECONDS:-420}"
run_timeout="${SCALA_DURATION_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
kill_after="${SCALA_DURATION_SMOKE_KILL_AFTER_SECONDS:-30}"
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

test -f "$out_dir/ScalaDurationHello.class"
test -f "$out_dir/ScalaDurationSmoke.class"

duration_javap="$(javap -classpath "$out_dir" -c -p 'ScalaDurationSmoke$')"
if ! grep -Eq 'invokevirtual[[:space:]]+#[0-9]+[[:space:]]+// Method java/util/concurrent/TimeUnit\.toChronoUnit:\(\)Ljava/time/temporal/ChronoUnit;' <<<"$duration_javap"; then
  echo "Missing direct invokevirtual TimeUnit.toChronoUnit reference." >&2
  exit 1
fi
if ! grep -Eq 'invokestatic[[:space:]]+#[0-9]+[[:space:]]+// Method java/util/concurrent/TimeUnit\.of:\(Ljava/time/temporal/ChronoUnit;\)Ljava/util/concurrent/TimeUnit;' <<<"$duration_javap"; then
  echo "Missing direct invokestatic TimeUnit.of reference." >&2
  exit 1
fi
if ! grep -Eq 'invokevirtual[[:space:]]+#[0-9]+[[:space:]]+// Method java/util/concurrent/TimeUnit\.convert:\(Ljava/time/Duration;\)J' <<<"$duration_javap"; then
  echo "Missing direct invokevirtual TimeUnit.convert(Duration) reference." >&2
  exit 1
fi
duration_method_refs=(
  'dividedBy|\(Ljava/time/Duration;\)J'
  'toSeconds|\(\)J'
  'toDaysPart|\(\)J'
  'toHoursPart|\(\)I'
  'toMinutesPart|\(\)I'
  'toSecondsPart|\(\)I'
  'toMillisPart|\(\)I'
  'toNanosPart|\(\)I'
)
for method_ref in "${duration_method_refs[@]}"; do
  method_name="${method_ref%%|*}"
  method_descriptor="${method_ref#*|}"
  if ! grep -Eq "invokevirtual[[:space:]]+#[0-9]+[[:space:]]+// Method java/time/Duration\.${method_name}:${method_descriptor}" <<<"$duration_javap"; then
    echo "Missing direct invokevirtual Duration.${method_name} reference." >&2
    exit 1
  fi
done

expected_output="3250|0,500,1500,1250|-1000,0,1500,3000|1|2.0|1250|2250|3|true:false:true|MILLIS|HOURS|2345|-2345|4:-183846:-2:-3:-4:-6:321:321098766"

native_output="$(java -cp "$runtime_cp" ScalaDurationHello)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -k "${kill_after}s" -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" ScalaDurationHello)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Scala duration smoke passed in $((compile_end - compile_start))s using Scala $version."
