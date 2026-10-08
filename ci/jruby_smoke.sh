#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="9.4.15.0"
expected_sha256="e8a461c48da851d839b8deb8b67b1987542ba5e23b8febfa0e60f0065e2639d2"
expected_size=34375288
cache_dir="${JRUBY_SMOKE_CACHE_DIR:-"$repo_root/build/jruby-smoke-cache"}"
work_dir="${JRUBY_SMOKE_WORK_DIR:-"$repo_root/build/jruby-smoke"}"
source_file="$repo_root/classes/jruby_smoke/jruby_smoke.rb"
runner="$repo_root/build/release-cli/console/runner.js"
jruby_jar="${JRUBY_COMPLETE_JAR:-}"

verify_jar() {
  local jar="$1"
  if [ ! -f "$jar" ] || [ "$(wc -c < "$jar")" -ne "$expected_size" ]; then
    echo "JRuby $version JAR is missing or has an unexpected size: $jar" >&2
    return 1
  fi
  local actual_sha256
  actual_sha256="$(sha256sum -- "$jar")"
  if [ "${actual_sha256%% *}" != "$expected_sha256" ]; then
    echo "JRuby $version JAR failed SHA-256 verification: $jar" >&2
    return 1
  fi
}

if [ -z "$jruby_jar" ]; then
  mkdir -p "$cache_dir"
  jruby_jar="$cache_dir/jruby-complete-$version.jar"
  if [ ! -f "$jruby_jar" ]; then
    temporary_jar="$(mktemp "$cache_dir/.jruby-complete-$version.XXXXXXXX")"
    trap 'rm -f -- "$temporary_jar"' EXIT
    curl -fsSL --retry 2 \
      "https://repo1.maven.org/maven2/org/jruby/jruby-complete/$version/jruby-complete-$version.jar" \
      -o "$temporary_jar"
    verify_jar "$temporary_jar"
    mv -- "$temporary_jar" "$jruby_jar"
    trap - EXIT
  fi
fi

verify_jar "$jruby_jar"
for required_file in "$runner" "$source_file"; do
  if [ ! -f "$required_file" ]; then
    echo "JRuby smoke input is missing: $required_file" >&2
    exit 1
  fi
done

mkdir -p "$work_dir"
compile_timeout="${JRUBY_SMOKE_COMPILE_TIMEOUT_SECONDS:-60}"
run_timeout="${JRUBY_SMOKE_RUN_TIMEOUT_SECONDS:-240}"
kill_after="${JRUBY_SMOKE_KILL_AFTER_SECONDS:-20}"
responsiveness="${DOPPIO_JRUBY_RESPONSIVENESS:-100000}"

TMPDIR="$work_dir" timeout -k "${kill_after}s" -s INT "${compile_timeout}s" \
  java -cp "$jruby_jar" org.jruby.Main -c "$source_file" >/dev/null

expected_output='jruby:3:9'
native_output="$(TMPDIR="$work_dir" timeout -k "${kill_after}s" -s INT "${compile_timeout}s" \
  java -cp "$jruby_jar" org.jruby.Main "$source_file")"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM JRuby output: $native_output" >&2
  exit 1
fi

doppio_output="$(TMPDIR="$work_dir" timeout -k "${kill_after}s" -s INT "${run_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" -cp "$jruby_jar" \
  org.jruby.Main "$source_file")"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio JRuby output: $doppio_output" >&2
  exit 1
fi

echo "JRuby $version smoke passed on the native JVM and Doppio."
