#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${SCALA_COMPILER_VERSION:-2.13.18}"
cache_dir="${SCALA_SMOKE_CACHE_DIR:-"$repo_root/build/scala-smoke-cache"}"
work_dir="${SCALA_LANGUAGE_SMOKE_WORK_DIR:-"$repo_root/build/scala-language-smoke"}"
source_dir="$repo_root/classes/scala_language_smoke"
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
out_dir="$work_dir/out"
source_cp="$library_jar"
runtime_cp="$out_dir:$library_jar"

rm -rf "$out_dir"
mkdir -p "$out_dir"

compile_timeout="${SCALA_LANGUAGE_SMOKE_COMPILE_TIMEOUT_SECONDS:-420}"
run_timeout="${SCALA_LANGUAGE_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
kill_after="${SCALA_LANGUAGE_SMOKE_KILL_AFTER_SECONDS:-30}"
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

test -f "$out_dir/ScalaLanguageHello.class"
test -f "$out_dir/ScalaLanguageSmoke.class"
test -f "$out_dir/ScalaLanguageSmoke\$.class"
test -f "$out_dir/ScalaNonLocalReturnSmoke.class"
test -f "$out_dir/ScalaNonLocalReturnSmoke\$.class"
test -f "$out_dir/ScalaTraitLinearizationSmoke\$.class"
test -f "$out_dir/LeftThenRightTokenOwner.class"
test -f "$out_dir/LeftToken.class"
test -f "$out_dir/RightThenLeftTokenOwner.class"
test -f "$out_dir/RightToken.class"
test -f "$out_dir/RootToken.class"
test -f "$out_dir/SmokeCodec.class"
test -f "$out_dir/SmokeFolder.class"

left_owner_javap="$(javap -classpath "$out_dir" -c -p LeftThenRightTokenOwner)"
for target in \
    'InterfaceMethod RootToken.token$:(LRootToken;)Ljava/lang/String;' \
    'InterfaceMethod LeftToken.token$:(LLeftToken;)Ljava/lang/String;' \
    'InterfaceMethod RightToken.token$:(LRightToken;)Ljava/lang/String;'; do
  if ! grep -Fq "$target" <<<"$left_owner_javap"; then
    echo "Missing left-then-right trait bridge: $target" >&2
    exit 1
  fi
done

right_owner_javap="$(javap -classpath "$out_dir" -c -p RightThenLeftTokenOwner)"
for target in \
    'InterfaceMethod RootToken.token$:(LRootToken;)Ljava/lang/String;' \
    'InterfaceMethod RightToken.token$:(LRightToken;)Ljava/lang/String;' \
    'InterfaceMethod LeftToken.token$:(LLeftToken;)Ljava/lang/String;'; do
  if ! grep -Fq "$target" <<<"$right_owner_javap"; then
    echo "Missing right-then-left trait bridge: $target" >&2
    exit 1
  fi
done

left_trait_javap="$(javap -classpath "$out_dir" -c -p LeftToken)"
right_trait_javap="$(javap -classpath "$out_dir" -c -p RightToken)"
if ! grep -Fq 'InterfaceMethod LeftToken$$super$token:()Ljava/lang/String;' <<<"$left_trait_javap"; then
  echo 'Missing LeftToken super accessor dispatch.' >&2
  exit 1
fi
if ! grep -Fq 'InterfaceMethod RightToken$$super$token:()Ljava/lang/String;' <<<"$right_trait_javap"; then
  echo 'Missing RightToken super accessor dispatch.' >&2
  exit 1
fi

nonlocal_javap="$(javap -classpath "$out_dir" -c -p 'ScalaNonLocalReturnSmoke$')"
for marker in \
    'scala/runtime/NonLocalReturnControl$mcI$sp' \
    'scala/runtime/NonLocalReturnControl.key:()Ljava/lang/Object;' \
    'scala/runtime/NonLocalReturnControl.value$mcI$sp:()I' \
    'Class scala/runtime/NonLocalReturnControl' \
    'Exception table:'; do
  if ! grep -Fq "$marker" <<<"$nonlocal_javap"; then
    echo "Missing non-local return bytecode marker: $marker" >&2
    exit 1
  fi
done

expected_output="L:a7:R:b3:some(i2)|none|some(i4):a1,b2,c3:op7:12:2:fer:r12:dozen/sx/seven:ABC/ACB:4:n1>n4>finally/-1:n1>n3>finally"

native_output="$(java -cp "$runtime_cp" ScalaLanguageHello)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -k "${kill_after}s" -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" ScalaLanguageHello)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Scala language smoke passed in $((compile_end - compile_start))s using Scala $version."
