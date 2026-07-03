#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${KOTLIN_COMPILER_VERSION:-2.4.0}"
cache_dir="${KOTLIN_SMOKE_CACHE_DIR:-"$repo_root/build/kotlin-smoke-cache"}"
work_dir="${KOTLIN_DIAGNOSTIC_SMOKE_WORK_DIR:-"$repo_root/build/kotlin-diagnostic-smoke"}"
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
out_dir="$work_dir/out"
source_file="$work_dir/DiagnosticSmoke.kt"
log_file="$work_dir/diagnostic.log"

rm -rf "$work_dir"
mkdir -p "$out_dir"
cat > "$source_file" <<'KOTLIN_DIAGNOSTIC_SOURCE'
fun main() {
  val number: Int = "not-an-int"
  val text = "abc".definitelyMissing
  println(number)
  println(text)
}
KOTLIN_DIAGNOSTIC_SOURCE

compile_timeout="${KOTLIN_DIAGNOSTIC_SMOKE_COMPILE_TIMEOUT_SECONDS:-300}"
responsiveness="${DOPPIO_KOTLIN_RESPONSIVENESS:-100000}"

set +e
timeout -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_jar" \
  org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \
  -no-reflect \
  -d "$out_dir" \
  "$source_file" > "$log_file" 2>&1
status="$?"
set -e

if [ "$status" -eq 0 ]; then
  echo "Expected Kotlin diagnostic compile to fail." >&2
  cat "$log_file" >&2
  exit 1
fi
if [ "$status" -ne 1 ]; then
  echo "Unexpected Kotlin diagnostic compile status: $status" >&2
  cat "$log_file" >&2
  exit 1
fi

grep -Fq "DiagnosticSmoke.kt:2:19: error: initializer type mismatch: expected 'Int', actual 'String'." "$log_file"
grep -Fq '  val number: Int = "not-an-int"' "$log_file"
grep -Fq '                  ^' "$log_file"
grep -Fq "DiagnosticSmoke.kt:3:20: error: unresolved reference 'definitelyMissing'." "$log_file"
grep -Fq '  val text = "abc".definitelyMissing' "$log_file"
grep -Fq '                   ^^^^^^^^^^^^^^^^^' "$log_file"

if find "$out_dir" -type f | grep -q .; then
  echo "Unexpected output files from failed diagnostic compile." >&2
  find "$out_dir" -type f >&2
  exit 1
fi

echo "Kotlin diagnostic smoke passed using Kotlin $version."
