#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cache_dir="${CLOJURE_SMOKE_CACHE_DIR:-"$repo_root/build/clojure-smoke-cache"}"
work_dir="${CLOJURE_SMOKE_WORK_DIR:-"$repo_root/build/clojure-smoke"}"
source_dir="$repo_root/classes/clojure_smoke"
runner="$repo_root/build/release-cli/console/runner.js"
clojure_sha='21b578db389a8e74b286ce79c4a7f86ec641e26d88b12f18d69030916b0e18ca'
spec_alpha_sha='94cd99b6ea639641f37af4860a643b6ed399ee5a8be5d717cff0b663c8d75077'
core_specs_alpha_sha='eb73ac08cf49ba840c88ba67beef11336ca554333d9408808d78946e0feb9ddb'

verify_jar() {
  local jar="$1"
  local expected_sha="$2"
  if [ ! -f "$jar" ]; then
    echo "Clojure dependency not found: $jar" >&2
    return 1
  fi
  local actual_sha
  actual_sha="$(sha256sum -- "$jar" | cut -d ' ' -f1)"
  if [ "$actual_sha" != "$expected_sha" ]; then
    echo "Clojure dependency checksum mismatch: $jar" >&2
    return 1
  fi
}

download_jar() {
  local artifact="$1"
  local version="$2"
  local expected_sha="$3"
  local target="$cache_dir/$artifact-$version.jar"
  if [ ! -f "$target" ]; then
    mkdir -p "$cache_dir"
    local temporary_jar
    temporary_jar="$(mktemp "$cache_dir/.$artifact-$version.XXXXXXXX")"
    if ! curl -fsSL --retry 2 \
      "https://repo.maven.apache.org/maven2/org/clojure/$artifact/$version/$artifact-$version.jar" \
      -o "$temporary_jar"; then
      rm -f -- "$temporary_jar"
      return 1
    fi
    if ! verify_jar "$temporary_jar" "$expected_sha"; then
      rm -f -- "$temporary_jar"
      return 1
    fi
    mv -- "$temporary_jar" "$target"
  fi
  printf '%s\n' "$target"
}

clojure_jar="${CLOJURE_JAR:-}"
spec_alpha_jar="${CLOJURE_SPEC_ALPHA_JAR:-}"
core_specs_alpha_jar="${CLOJURE_CORE_SPECS_ALPHA_JAR:-}"

if [ -z "$clojure_jar" ]; then
  clojure_jar="$(download_jar clojure 1.12.6 "$clojure_sha")"
fi
if [ -z "$spec_alpha_jar" ]; then
  spec_alpha_jar="$(download_jar spec.alpha 0.5.238 "$spec_alpha_sha")"
fi
if [ -z "$core_specs_alpha_jar" ]; then
  core_specs_alpha_jar="$(download_jar core.specs.alpha 0.4.74 "$core_specs_alpha_sha")"
fi

verify_jar "$clojure_jar" "$clojure_sha"
verify_jar "$spec_alpha_jar" "$spec_alpha_sha"
verify_jar "$core_specs_alpha_jar" "$core_specs_alpha_sha"

if [ ! -f "$runner" ]; then
  echo "Doppio release CLI not found; build it before running the Clojure smoke test." >&2
  exit 1
fi

mkdir -p "$work_dir"
out_dir="$(mktemp -d "$work_dir/out.XXXXXXXX")"
language_cp="$clojure_jar:$spec_alpha_jar:$core_specs_alpha_jar"
compile_cp="$source_dir:$out_dir:$language_cp"
runtime_cp="$out_dir:$language_cp"
compile_timeout="${CLOJURE_SMOKE_COMPILE_TIMEOUT_SECONDS:-180}"
run_timeout="${CLOJURE_SMOKE_RUN_TIMEOUT_SECONDS:-180}"
kill_after="${CLOJURE_SMOKE_KILL_AFTER_SECONDS:-20}"
responsiveness="${DOPPIO_CLOJURE_RESPONSIVENESS:-100000}"

timeout -k "${kill_after}s" -s INT "${compile_timeout}s" \
  java -Dclojure.compile.path="$out_dir" -cp "$compile_cp" clojure.main \
  -e '(binding [*compile-path* (System/getProperty "clojure.compile.path")] (compile '\''clojure_smoke.core))'

test -f "$out_dir/clojure_smoke/core.class"
test -f "$out_dir/clojure_smoke/core__init.class"
javap -classpath "$out_dir" clojure_smoke.core | grep -Fq 'public static void main(java.lang.String[]);'

expected_output='clojure:35:3'
native_output="$(timeout -k "${kill_after}s" -s INT "${run_timeout}s" \
  java -cp "$runtime_cp" clojure_smoke.core)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -k "${kill_after}s" -s INT "${run_timeout}s" \
  node --no-deprecation "$runner" "-Xresponsiveness:$responsiveness" \
  -cp "$runtime_cp" clojure_smoke.core)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo 'Clojure AOT smoke passed on native JVM and Doppio.'
