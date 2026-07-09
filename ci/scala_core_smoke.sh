#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${SCALA_COMPILER_VERSION:-2.13.18}"
cache_dir="${SCALA_CORE_SMOKE_CACHE_DIR:-"$repo_root/build/scala-smoke-cache"}"
work_dir="${SCALA_CORE_SMOKE_WORK_DIR:-"$repo_root/build/scala-core-smoke"}"
source_dir="${SCALA_CORE_SMOKE_SOURCE_DIR:-"$repo_root/classes/scala_core_smoke"}"
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
source_cp="$library_jar"
out_dir="$work_dir/out"
runtime_cp="$out_dir:$library_jar"

rm -rf "$out_dir"
mkdir -p "$out_dir"

compile_timeout="${SCALA_CORE_SMOKE_COMPILE_TIMEOUT_SECONDS:-420}"
run_timeout="${SCALA_CORE_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
kill_after="${SCALA_CORE_SMOKE_KILL_AFTER_SECONDS:-30}"
responsiveness="${DOPPIO_SCALA_RESPONSIVENESS:-100000}"

compile_start="$(date +%s)"
timeout -k "${kill_after}s" -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_cp" \
  scala.tools.nsc.Main \
  -classpath "$source_cp" \
  -d "$out_dir" \
  "$source_dir"/*.scala
compile_end="$(date +%s)"

test -f "$out_dir/Hello.class"
test -f "$out_dir/AdvancedScalaSmoke.class"
test -f "$out_dir/Add.class"
test -f "$out_dir/Lit.class"
test -f "$out_dir/SmokeExpr.class"
test -f "$out_dir/SmokeBox.class"
test -f "$out_dir/SmokeStage.class"
test -f "$out_dir/ZeroExpr.class"

scala_indy_dump="$work_dir/scala-indy-javap.txt"
javap -classpath "$runtime_cp" -v 'AdvancedScalaSmoke$' 'Hello$' > "$scala_indy_dump"
grep -q 'InvokeDynamic' "$scala_indy_dump"
grep -q 'LambdaMetafactory' "$scala_indy_dump"
grep -Fq 'SourceFile: "Hello.scala"' "$scala_indy_dump"
grep -Fq 'LineNumberTable:' "$scala_indy_dump"
grep -Fq 'BootstrapMethods:' "$scala_indy_dump"
grep -Fq 'InnerClasses:' "$scala_indy_dump"
grep -Fq 'ScalaInlineInfo:' "$scala_indy_dump"

scala_signature_dump="$work_dir/scala-signature-javap.txt"
javap -classpath "$runtime_cp" -v SmokeBox Formatter > "$scala_signature_dump"
grep -Fq '// <B:Ljava/lang/Object;>(Lscala/Function1<TA;TB;>;)LSmokeBox<TB;>;' "$scala_signature_dump"
grep -Fq '// (TA;)Ljava/lang/String;' "$scala_signature_dump"
grep -Fq 'SourceFile: "Hello.scala"' "$scala_signature_dump"
grep -Fq 'LineNumberTable:' "$scala_signature_dump"
grep -Fq 'MethodParameters:' "$scala_signature_dump"
grep -Fq 'scala.reflect.ScalaSignature(' "$scala_signature_dump"
grep -Fq 'ScalaInlineInfo:' "$scala_signature_dump"
grep -Fq 'ScalaSig:' "$scala_signature_dump"

expected_output="${SCALA_CORE_SMOKE_EXPECTED_OUTPUT:-"scala:38:parse>run:i=39:SCALA:a,bb:sc|even4:25:12"}"

native_output="$(java -cp "$runtime_cp" Hello)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -k "${kill_after}s" -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" Hello)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Scala core smoke passed in $((compile_end - compile_start))s using Scala $version."
