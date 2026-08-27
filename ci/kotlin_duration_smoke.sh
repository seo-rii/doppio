#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${KOTLIN_COMPILER_VERSION:-2.4.0}"
cache_dir="${KOTLIN_SMOKE_CACHE_DIR:-"$repo_root/build/kotlin-smoke-cache"}"
work_dir="${KOTLIN_DURATION_SMOKE_WORK_DIR:-"$repo_root/build/kotlin-duration-smoke"}"
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
source_dir="$repo_root/classes/kotlin_duration_smoke"
out_dir="$work_dir/out"
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

compile_timeout="${KOTLIN_DURATION_SMOKE_COMPILE_TIMEOUT_SECONDS:-360}"
run_timeout="${KOTLIN_DURATION_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
kill_after="${KOTLIN_DURATION_SMOKE_KILL_AFTER_SECONDS:-30}"
responsiveness="${DOPPIO_KOTLIN_RESPONSIVENESS:-100000}"

compile_start="$(date +%s)"
timeout -k "${kill_after}s" -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_jar" \
  org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \
  -no-reflect \
  -no-jdk \
  -classpath "$compiler_target_cp" \
  -d "$out_dir" \
  "$source_dir"/*.kt
compile_end="$(date +%s)"

test -f "$out_dir/KotlinDurationHelloKt.class"
test -f "$out_dir/DurationSmokeKt.class"
test -f "$out_dir/META-INF/main.kotlin_module"

duration_javap="$(javap -classpath "$out_dir" -c -p DurationSmokeKt)"
if ! grep -Eq 'invokevirtual +#[0-9]+ +// Method java/util/concurrent/TimeUnit\.toChronoUnit:\(\)Ljava/time/temporal/ChronoUnit;' <<<"$duration_javap"; then
  echo "Expected a direct invokevirtual TimeUnit.toChronoUnit reference." >&2
  exit 1
fi
if ! grep -Eq 'invokestatic +#[0-9]+ +// Method java/util/concurrent/TimeUnit\.of:\(Ljava/time/temporal/ChronoUnit;\)Ljava/util/concurrent/TimeUnit;' <<<"$duration_javap"; then
  echo "Expected a direct invokestatic TimeUnit.of reference." >&2
  exit 1
fi
if ! grep -Eq 'invokevirtual +#[0-9]+ +// Method java/util/concurrent/TimeUnit\.convert:\(Ljava/time/Duration;\)J' <<<"$duration_javap"; then
  echo "Expected a direct invokevirtual TimeUnit.convert(Duration) reference." >&2
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
    echo "Expected a direct invokevirtual Duration.${method_name} reference." >&2
    exit 1
  fi
done

runtime_cp="$out_dir:$stdlib_jar"
expected_output="${KOTLIN_DURATION_SMOKE_EXPECTED_OUTPUT:-"3250|0,500,1500,1250|-1000,0,1500,3000|1|2.0|1250|2250|3|true:true:true|MILLIS:SECONDS:-1|4:-183846:-2:-3:-4:-6:321:321098766"}"

native_output="$(java -cp "$runtime_cp" KotlinDurationHelloKt)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -k "${kill_after}s" -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" KotlinDurationHelloKt)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Kotlin duration smoke passed in $((compile_end - compile_start))s."
