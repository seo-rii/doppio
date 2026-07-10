#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${KOTLIN_COMPILER_VERSION:-2.4.0}"
cache_dir="${KOTLIN_SMOKE_CACHE_DIR:-"$repo_root/build/kotlin-smoke-cache"}"
work_dir="${KOTLIN_IO_SMOKE_WORK_DIR:-"$repo_root/build/kotlin-io-smoke"}"
compiler_jar="${KOTLIN_COMPILER_JAR:-}"
stdlib_jar="${KOTLIN_STDLIB_JAR:-}"
classpath_mode="${KOTLIN_IO_SMOKE_CLASSPATH_MODE:-minimal}"
compiler_cp="${KOTLIN_IO_COMPILER_CLASSPATH:-}"

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

if [ -z "$stdlib_jar" ]; then
  candidate_stdlib_jar="$(dirname "$compiler_jar")/kotlin-stdlib.jar"
  if [ -f "$candidate_stdlib_jar" ]; then
    stdlib_jar="$candidate_stdlib_jar"
  fi
fi
if [ -z "$stdlib_jar" ] || [ ! -f "$stdlib_jar" ]; then
  echo "Kotlin stdlib jar not found; set KOTLIN_STDLIB_JAR or use the kotlin-compiler package layout." >&2
  exit 1
fi
if [ -z "$compiler_cp" ]; then
  case "$classpath_mode" in
    minimal)
      compiler_cp="$compiler_jar"
      ;;
    full)
      compiler_lib_dir="$(dirname "$compiler_jar")"
      compiler_cp="$(printf ':%s' "$compiler_lib_dir"/*.jar)"
      compiler_cp="${compiler_cp#:}"
      ;;
    *)
      echo "Invalid KOTLIN_IO_SMOKE_CLASSPATH_MODE: $classpath_mode" >&2
      exit 1
      ;;
  esac
fi

runner="$repo_root/build/release-cli/console/runner.js"
source_dir="$repo_root/classes/kotlin_io_smoke"
out_dir="$work_dir/out"

rm -rf "$out_dir"
mkdir -p "$out_dir"

compile_timeout="${KOTLIN_IO_SMOKE_COMPILE_TIMEOUT_SECONDS:-420}"
run_timeout="${KOTLIN_IO_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
responsiveness="${DOPPIO_KOTLIN_RESPONSIVENESS:-100000}"

compile_start="$(date +%s)"
timeout -s INT "${compile_timeout}s" \
  node --max-old-space-size=4096 --no-deprecation "$runner" \
  "-Xresponsiveness:$responsiveness" \
  -cp "$compiler_cp" \
  org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \
  -no-reflect \
  -java-parameters \
  -d "$out_dir" \
  "$source_dir"/*.kt
compile_end="$(date +%s)"

test -f "$out_dir/IoHelloKt.class"
test -f "$out_dir/FileIoSmokeKt.class"
test -f "$out_dir/NioPathSmokeKt.class"
test -f "$out_dir/MappedBufferSmokeKt.class"
test -f "$out_dir/ResourceLookupMarker.class"
test -f "$out_dir/ResourceLookupSmokeKt.class"
test -f "$out_dir/ServiceLoaderSmokeKt.class"
test -f "$out_dir/ServiceLookupPlugin.class"
test -f "$out_dir/AlphaServiceLookupPlugin.class"
test -f "$out_dir/BetaServiceLookupPlugin.class"
test -f "$out_dir/JarZipSmokeKt.class"

mkdir -p "$out_dir/META-INF/services"
cat > "$out_dir/META-INF/services/ServiceLookupPlugin" <<'SERVICE_LOOKUP_PROVIDERS'
# Kotlin I/O smoke service providers
AlphaServiceLookupPlugin
AlphaServiceLookupPlugin
BetaServiceLookupPlugin
SERVICE_LOOKUP_PROVIDERS

runtime_cp="$out_dir:$stdlib_jar"
expected_output="$(printf '0:5:a,1:4:b,2:5:g|aaa|input.txt:17,nested/out.txt:17|616c706861|txt/out/nested/out.txt|true/true\n0:5:d,1:7:e,2:4:z|64656c74|-1/5/5/-1|input.txt:false,nested:true|input.txt:19,nested/moved.txt:19|input.txt/runtime-nio/nested/moved.txt|true/true/true/true/true|true/true/true/true/true/true/UnsupportedOperationException\naZcdYf:aZRSYf:ZRS:true:true:true:true:true:true:IndexOutOfBoundsException:0:true:true\nffffff|4:cafebabe|1:1:true|true:true:true\nalpha=7,beta=11|2|alpha=7,beta=11|AlphaServiceLookupPlugin>BetaServiceLookupPlugin|true\njarzip:false:META-INF/MANIFEST.MF,META-INF/services/example.Service,META-INF/versions/17/pkg/data.txt,pkg/data.txt:alpha/beta:pkg.Provider:11:6e30506e:6e30506e:true|META-INF/MANIFEST.MF=META-INF,META-INF/services/example.Service=META-INF,META-INF/versions/17/pkg/data.txt=META-INF,pkg/data.txt=alpha|jar:jar:alpha/beta:pkg.Provider:true')"

native_output="$(java -cp "$runtime_cp" IoHelloKt)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" IoHelloKt)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Kotlin I/O smoke passed in $((compile_end - compile_start))s using $classpath_mode classpath."
