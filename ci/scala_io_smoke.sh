#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${SCALA_COMPILER_VERSION:-2.13.18}"
cache_dir="${SCALA_SMOKE_CACHE_DIR:-"$repo_root/build/scala-smoke-cache"}"
work_dir="${SCALA_IO_SMOKE_WORK_DIR:-"$repo_root/build/scala-io-smoke"}"
source_dir="$repo_root/classes/scala_io_smoke"
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
resource_dir="$work_dir/resources"
source_cp="$out_dir:$library_jar"
runtime_cp="$out_dir:$resource_dir:$library_jar"

rm -rf "$out_dir" "$resource_dir"
mkdir -p "$out_dir" "$resource_dir"

compile_timeout="${SCALA_IO_SMOKE_COMPILE_TIMEOUT_SECONDS:-420}"
run_timeout="${SCALA_IO_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
responsiveness="${DOPPIO_SCALA_RESPONSIVENESS:-100000}"

compile_start="$(date +%s)"
javac -Xlint:-options -source 8 -target 8 -d "$out_dir" "$source_dir"/ZipFileSystemProbe.java
timeout -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_cp" \
  scala.tools.nsc.Main \
  -classpath "$source_cp" \
  -d "$out_dir" \
  "$source_dir"/*.scala
compile_end="$(date +%s)"

test -f "$out_dir/ScalaIoHello.class"
test -f "$out_dir/ZipFileSystemProbe.class"
test -f "$out_dir/ScalaJarZipSmoke.class"
test -f "$out_dir/ScalaResourceLookupSmoke.class"
test -f "$out_dir/ScalaServiceLoaderSmoke.class"
test -f "$out_dir/ScalaServiceLookupPlugin.class"
test -f "$out_dir/AlphaScalaServiceLookupPlugin.class"
test -f "$out_dir/BetaScalaServiceLookupPlugin.class"

mkdir -p "$out_dir/META-INF/services"
mkdir -p "$out_dir/scalasmoke/resources" "$resource_dir/scalasmoke/resources"
cat > "$out_dir/META-INF/services/ScalaServiceLookupPlugin" <<'SCALA_SERVICE_PROVIDERS'
# Scala I/O smoke service providers
AlphaScalaServiceLookupPlugin
AlphaScalaServiceLookupPlugin
BetaScalaServiceLookupPlugin
SCALA_SERVICE_PROVIDERS
printf 'scala-resource\nlookup\n' > "$out_dir/scalasmoke/resources/runtime.txt"
printf 'scala-root\n' > "$out_dir/scala-root-resource.txt"
printf 'out\n' > "$out_dir/scalasmoke/resources/duplicate.txt"
printf 'macro\n' > "$resource_dir/scalasmoke/resources/duplicate.txt"

expected_output="$(printf 'jarzip:false:META-INF/MANIFEST.MF,META-INF/services/example.Service,META-INF/versions/17/pkg/data.txt,pkg/data.txt:scala/jar:scala.Provider:10:true:true|META-INF/MANIFEST.MF=META-INF,META-INF/services/example.Service=META-INF,META-INF/versions/17/pkg/data.txt=META-INF,pkg/data.txt=scala|jar:jar:scala/jar:scala.Provider:true|one:jar:scala/jar:true;map:jar:scala/jar:true\nsvc:alpha=7,beta=11:2:alpha=7,beta=11:AlphaScalaServiceLookupPlugin>BetaScalaServiceLookupPlugin:true\nres:scala-resource/lookup:scala-root:out>macro:out>macro:2/2:true:true:true:true:true:true')"

native_output="$(java -cp "$runtime_cp" ScalaIoHello)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" ScalaIoHello)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Scala I/O smoke passed in $((compile_end - compile_start))s using Scala $version."
