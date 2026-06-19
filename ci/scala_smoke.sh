#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${SCALA_COMPILER_VERSION:-2.13.18}"
cache_dir="${SCALA_SMOKE_CACHE_DIR:-"$repo_root/build/scala-smoke-cache"}"
work_dir="${SCALA_SMOKE_WORK_DIR:-"$repo_root/build/scala-smoke"}"
source_dir="${SCALA_SMOKE_SOURCE_DIR:-"$repo_root/classes/scala_smoke"}"
macro_source_dir="${SCALA_MACRO_SMOKE_SOURCE_DIR:-"$repo_root/classes/scala_macro_smoke"}"
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
macro_out_dir="$work_dir/macros"
out_dir="$work_dir/out"
main_source_cp="$macro_out_dir:$source_cp"
runtime_cp="$out_dir:$macro_out_dir:$library_jar:$reflect_jar"

rm -rf "$macro_out_dir" "$out_dir"
mkdir -p "$macro_out_dir" "$out_dir"

compile_timeout="${SCALA_SMOKE_COMPILE_TIMEOUT_SECONDS:-900}"
run_timeout="${SCALA_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
responsiveness="${DOPPIO_SCALA_RESPONSIVENESS:-100000}"

compile_start="$(date +%s)"
timeout -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_cp" \
  scala.tools.nsc.Main \
  -classpath "$source_cp" \
  -d "$macro_out_dir" \
  "$macro_source_dir"/*.scala

timeout -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_cp" \
  scala.tools.nsc.Main \
  -classpath "$main_source_cp" \
  -d "$out_dir" \
  "$source_dir"/*.scala
compile_end="$(date +%s)"

test -f "$macro_out_dir/ScalaMacroSmoke.class"
test -f "$out_dir/Hello.class"
test -f "$out_dir/AdvancedScalaSmoke.class"
test -f "$out_dir/Add.class"
test -f "$out_dir/Lit.class"
test -f "$out_dir/Metric.class"
test -f "$out_dir/ScalaLibrarySmoke.class"
test -f "$out_dir/ScalaMacroUseSmoke.class"
test -f "$out_dir/ScalaReflectSmoke.class"
test -f "$out_dir/ScalaReflectSmoke\$ReflectBox.class"
test -f "$out_dir/scalasmoke/PackageRegistry.class"
test -f "$out_dir/scalasmoke/PackageWorker.class"
test -f "$out_dir/scalasmoke/ScalaPackageReflectionSmoke.class"
test -f "$out_dir/scalasmoke/SmokeColors.class"
test -f "$out_dir/scalasmoke/SpecializedBox.class"
test -f "$out_dir/scalasmoke/package.class"
test -f "$out_dir/SmokeExpr.class"
test -f "$out_dir/SmokeBox.class"
test -f "$out_dir/SmokeStage.class"
test -f "$out_dir/ZeroExpr.class"

expected_output="${SCALA_SMOKE_EXPECTED_OUTPUT:-"scala:38:parse>run:i=39:SCALA:a,bb:sc|even4:25:12:1=4,2=2,3=4:b:4/ccc:4/aa:2:g2:t5:String:3:z:2:worker:3:c1:describe/getName/total:pkg-worker-11:20:red-green-blue:23:ReflectBox:2:name/value:true:m22:macro:cs"}"

native_output="$(java -cp "$runtime_cp" Hello)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" Hello)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Scala compiler smoke passed in $((compile_end - compile_start))s using Scala $version."
