#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${SCALA_COMPILER_VERSION:-2.13.18}"
cache_dir="${SCALA_SMOKE_CACHE_DIR:-"$repo_root/build/scala-smoke-cache"}"
work_dir="${SCALA_DIAGNOSTIC_SMOKE_WORK_DIR:-"$repo_root/build/scala-diagnostic-smoke"}"
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
source_cp="$library_jar:$reflect_jar"
out_dir="$work_dir/out"
source_file="$work_dir/DiagnosticSmoke.scala"
missing_member_source_file="$work_dir/MissingMemberSmoke.scala"
log_file="$work_dir/diagnostic.log"

rm -rf "$work_dir"
mkdir -p "$out_dir"
cat > "$source_file" <<'SCALA_DIAGNOSTIC_SOURCE'
object DiagnosticSmoke {
  val number: Int = "not-an-int"
}
SCALA_DIAGNOSTIC_SOURCE
cat > "$missing_member_source_file" <<'SCALA_MISSING_MEMBER_SOURCE'
object MissingMemberSmoke {
  val text = "abc".definitelyMissing
}
SCALA_MISSING_MEMBER_SOURCE

compile_timeout="${SCALA_DIAGNOSTIC_SMOKE_COMPILE_TIMEOUT_SECONDS:-300}"
responsiveness="${DOPPIO_SCALA_RESPONSIVENESS:-100000}"

set +e
timeout -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_cp" \
  scala.tools.nsc.Main \
  -classpath "$source_cp" \
  -d "$out_dir" \
  "$source_file" \
  "$missing_member_source_file" > "$log_file" 2>&1
status="$?"
set -e

if [ "$status" -eq 0 ]; then
  echo "Expected Scala diagnostic compile to fail." >&2
  cat "$log_file" >&2
  exit 1
fi
if [ "$status" -ne 1 ]; then
  echo "Unexpected Scala diagnostic compile status: $status" >&2
  cat "$log_file" >&2
  exit 1
fi

grep -Fq 'DiagnosticSmoke.scala:2: error: type mismatch;' "$log_file"
grep -Fq 'found   : String("not-an-int")' "$log_file"
grep -Fq 'required: Int' "$log_file"
grep -Fq '  val number: Int = "not-an-int"' "$log_file"
grep -Fq '                    ^' "$log_file"
grep -Fq 'MissingMemberSmoke.scala:2: error: value definitelyMissing is not a member of String' "$log_file"
grep -Fq '  val text = "abc".definitelyMissing' "$log_file"
grep -Fq '                   ^' "$log_file"
grep -Fq '2 errors' "$log_file"

if find "$out_dir" -type f -name '*.class' | grep -q .; then
  echo "Unexpected class files from failed diagnostic compile." >&2
  find "$out_dir" -type f -name '*.class' >&2
  exit 1
fi

echo "Scala diagnostic smoke passed using Scala $version."
