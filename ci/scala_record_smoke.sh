#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${SCALA_COMPILER_VERSION:-2.13.18}"
cache_dir="${SCALA_SMOKE_CACHE_DIR:-"$repo_root/build/scala-smoke-cache"}"
work_dir="${SCALA_RECORD_SMOKE_WORK_DIR:-"$repo_root/build/scala-record-smoke"}"
source_dir="${SCALA_RECORD_SMOKE_SOURCE_DIR:-"$repo_root/classes/scala_record_smoke"}"
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
support_dir="$work_dir/support"
out_dir="$work_dir/out"

test -f "$repo_root/classes/modern_classlib/out/java/lang/Record.class"

rm -rf "$support_dir" "$out_dir"
mkdir -p "$support_dir" "$out_dir"
javac --release 17 -d "$support_dir" "$source_dir"/*.java

compile_timeout="${SCALA_RECORD_SMOKE_COMPILE_TIMEOUT_SECONDS:-420}"
run_timeout="${SCALA_RECORD_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
responsiveness="${DOPPIO_SCALA_RESPONSIVENESS:-100000}"

compile_start="$(date +%s)"
timeout -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_cp" \
  scala.tools.nsc.Main \
  -classpath "$support_dir:$library_jar:$reflect_jar" \
  -d "$out_dir" \
  "$source_dir"/*.scala
compile_end="$(date +%s)"

test -f "$support_dir/RecordInteropBox.class"
test -f "$support_dir/RecordInteropSupport.class"
test -f "$out_dir/ScalaRecordInteropSmoke.class"
test -f "$out_dir/ScalaRecordInteropSmoke$.class"

record_dump="$work_dir/record-javap.txt"
javap -classpath "$support_dir" -v RecordInteropBox > "$record_dump"
grep -q 'java/lang/Record' "$record_dump"
grep -q 'Record:' "$record_dump"

runtime_cp="$out_dir:$support_dir:$library_jar:$reflect_jar"
expected_output="${SCALA_RECORD_SMOKE_EXPECTED_OUTPUT:-"true|Record|3|scala:9|scala|7|a-bb|name:String:_:scala,count:int:_:7,tags:List:Ljava/util/List<Ljava/lang/String;>;:[a, bb]|rx:5|true|true"}"

native_output="$(java -cp "$runtime_cp" ScalaRecordInteropSmoke)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" ScalaRecordInteropSmoke)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Scala record smoke passed in $((compile_end - compile_start))s using Scala $version."
