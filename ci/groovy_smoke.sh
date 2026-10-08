#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="4.0.33"
expected_sha256="5240a9151289115e4d447d6b6d4cb9ac8a9fc6374e079714dfeeffda42323be8"
expected_size=7717996
cache_dir="${GROOVY_SMOKE_CACHE_DIR:-"$repo_root/build/groovy-smoke-cache"}"
work_dir="${GROOVY_SMOKE_WORK_DIR:-"$repo_root/build/groovy-smoke"}"
source_file="$repo_root/classes/groovy_smoke/GroovySmoke.groovy"
runner="$repo_root/build/release-cli/console/runner.js"
modern_overlay_jar="$repo_root/build/modern-bootstrap-overlay/modern-bootstrap.jar"
modern_boot_jar="$repo_root/vendor/java_home/lib/doppio.jar"
runtime_boot_jar="$repo_root/vendor/java_home/lib/rt.jar"
groovy_jar="${GROOVY_CORE_JAR:-}"

if [ -z "$groovy_jar" ]; then
  mkdir -p "$cache_dir"
  groovy_jar="$cache_dir/groovy-$version.jar"
  if [ ! -f "$groovy_jar" ]; then
    temporary_jar="$(mktemp "$cache_dir/.groovy-$version.XXXXXX")"
    trap 'rm -f "$temporary_jar"' EXIT
    curl -fsSL "https://repo1.maven.org/maven2/org/apache/groovy/groovy/$version/groovy-$version.jar" -o "$temporary_jar"
    downloaded_sha256="$(sha256sum "$temporary_jar")"
    if [ "${downloaded_sha256%% *}" != "$expected_sha256" ]; then
      echo "Groovy $version download failed SHA-256 verification." >&2
      exit 1
    fi
    mv "$temporary_jar" "$groovy_jar"
    trap - EXIT
  fi
fi

if [ ! -f "$groovy_jar" ] || [ "$(wc -c < "$groovy_jar")" -ne "$expected_size" ]; then
  echo "Groovy $version core JAR is missing or has an unexpected size: $groovy_jar" >&2
  exit 1
fi
actual_sha256="$(sha256sum "$groovy_jar")"
if [ "${actual_sha256%% *}" != "$expected_sha256" ]; then
  echo "Groovy $version core JAR failed SHA-256 verification: $groovy_jar" >&2
  exit 1
fi
for required_file in "$runner" "$modern_overlay_jar" "$modern_boot_jar" "$runtime_boot_jar" "$source_file"; do
  if [ ! -f "$required_file" ]; then
    echo "Groovy smoke input is missing: $required_file" >&2
    exit 1
  fi
done

mkdir -p "$work_dir"
out_dir="$(mktemp -d "$work_dir/out.XXXXXX")"
compiler_target_cp="$groovy_jar:$modern_overlay_jar:$modern_boot_jar:$runtime_boot_jar"
runtime_cp="$out_dir:$groovy_jar"
compile_timeout="${GROOVY_SMOKE_COMPILE_TIMEOUT_SECONDS:-600}"
run_timeout="${GROOVY_SMOKE_RUN_TIMEOUT_SECONDS:-120}"
kill_after="${GROOVY_SMOKE_KILL_AFTER_SECONDS:-30}"
responsiveness="${DOPPIO_GROOVY_RESPONSIVENESS:-100000}"

compile_start="$(date +%s)"
timeout -k "${kill_after}s" -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$groovy_jar" \
  org.codehaus.groovy.tools.FileSystemCompiler \
  -cp "$compiler_target_cp" \
  -d "$out_dir" \
  "$source_file"
compile_end="$(date +%s)"

test -f "$out_dir/GroovySmoke.class"
test -f "$out_dir/GroovySmoke\$_main_closure1.class"
test -f "$out_dir/GroovySmoke\$_main_closure2.class"
class_dump="$(javap -classpath "$out_dir" -verbose GroovySmoke)"
grep -Fq 'major version: 52' <<< "$class_dump"
grep -Fq 'SourceFile: "GroovySmoke.groovy"' <<< "$class_dump"

expected_output='groovy:4,9:14'
native_output="$(timeout -k "${kill_after}s" -s INT "${run_timeout}s" java -cp "$runtime_cp" GroovySmoke)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM Groovy output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -k "${kill_after}s" -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" GroovySmoke)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio Groovy output: $doppio_output" >&2
  exit 1
fi

echo "Groovy $version compiler smoke passed in $((compile_end - compile_start))s."
