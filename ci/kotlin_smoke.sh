#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${KOTLIN_COMPILER_VERSION:-2.4.0}"
cache_dir="${KOTLIN_SMOKE_CACHE_DIR:-"$repo_root/build/kotlin-smoke-cache"}"
work_dir="${KOTLIN_SMOKE_WORK_DIR:-"$repo_root/build/kotlin-smoke"}"
compiler_jar="${KOTLIN_COMPILER_JAR:-}"
stdlib_jar="${KOTLIN_STDLIB_JAR:-}"
classpath_mode="${KOTLIN_SMOKE_CLASSPATH_MODE:-minimal}"
compiler_cp="${KOTLIN_COMPILER_CLASSPATH:-}"

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
      echo "Invalid KOTLIN_SMOKE_CLASSPATH_MODE: $classpath_mode" >&2
      exit 1
      ;;
  esac
fi

runner="$repo_root/build/release-cli/console/runner.js"
source_dir="${KOTLIN_SMOKE_SOURCE_DIR:-"$repo_root/classes/kotlin_smoke"}"
out_dir="$work_dir/out-hello"

rm -rf "$out_dir"
mkdir -p "$out_dir"

compile_timeout="${KOTLIN_SMOKE_COMPILE_TIMEOUT_SECONDS:-900}"
run_timeout="${KOTLIN_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
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

test -f "$out_dir/HelloKt.class"
test -f "$out_dir/AnnotatedSmokeOwner.class"
test -f "$out_dir/AnnotationReflectionSmokeKt.class"
test -f "$out_dir/ConstructsKt.class"
test -f "$out_dir/AdvancedKt.class"
test -f "$out_dir/BytecodeSmokeKt.class"
test -f "$out_dir/ClosingSmoke.class"
test -f "$out_dir/ComponentSmoke.class"
test -f "$out_dir/DelegateSmokeKt.class"
test -f "$out_dir/DiagnosticKind.class"
test -f "$out_dir/EmptyStage.class"
test -f "$out_dir/InlineControlSmokeKt.class"
test -f "$out_dir/InlineControlSmokeKt\$crossCompute\$runner\$1.class"
test -f "$out_dir/InlineControlSmokeKt\$inlineControlSummary\$\$inlined\$crossCompute\$1.class"
test -f "$out_dir/InteropKt.class"
test -f "$out_dir/JvmInteropOwner.class"
test -f "$out_dir/JvmInteropOwner\$Companion.class"
test -f "$out_dir/JvmInteropSingleton.class"
test -f "$out_dir/JvmInteropSmokeFile.class"
test -f "$out_dir/BindingProvider.class"
test -f "$out_dir/ModernConstructSmokeKt.class"
test -f "$out_dir/MutableBinding.class"
test -f "$out_dir/MutableDelegateOwner.class"
test -f "$out_dir/MutableDelegateSmokeKt.class"
test -f "$out_dir/ReferenceSequenceSmokeKt.class"
test -f "$out_dir/ReifiedArraySmokeKt.class"
test -f "$out_dir/RuntimeSmokeTag.class"
test -f "$out_dir/PrefixDelegate.class"
test -f "$out_dir/ReferenceOwner.class"
test -f "$out_dir/ReferenceOwner\$Companion.class"
test -f "$out_dir/SmokeResult.class"
test -f "$out_dir/SmokeRegistry.class"
test -f "$out_dir/SmokeValue.class"
test -f "$out_dir/StageKind.class"
test -f "$out_dir/StageMapper.class"
test -f "$out_dir/StageNode.class"
test -f "$out_dir/StagePayload.class"
test -f "$out_dir/ValueClassSmokeKt.class"
test -f "$out_dir/ValueStage.class"
test -f "$out_dir/ValueDescriber.class"
test -f "$out_dir/PipelineState.class"
test -f "$out_dir/WhenMappingSmokeKt.class"
test -f "$out_dir/WhenMappingSmokeKt\$WhenMappings.class"
test -f "$out_dir/META-INF/main.kotlin_module"

runtime_cp="$out_dir"
runtime_cp="$runtime_cp:$stdlib_jar"
default_expected_output="$(printf 'hi\nname=2,4:5\nmode-FAST:3:2,3:caught\nOK:FALLBACK:3:9:2:1:accbbb:4:4:7\ndelegate:answer:DelegatedOwner|local:local:top\ntry>catch>finally:boom:8:true:x3:10:12:4:sync\na2|b7|c4|d9:20:8:7:10\nv1,v4,v7:22:box4:v7:none|v11:a\nString:3:a|bb|ccc:Number:2:1|2:i[3,1,4,9,1,5]=23:zamm|zbbmm:1-4-9:2345:String:int\nclass:field:getter:ctor,_:method:arg:kt3\nABG:1:15:kt5:StagePayload:EmptyStage:true\n1357:nilpe:14:10,30,-1,40:neg|zero|small|big\nenter>body>exit:ok:c10:34:stop3\nkt:java:ok7:IllegalArgumentException:fieldconst:top-3:o5obj:5:11111111\nbind:primary:MutableDelegateOwner:primary:0|bind:primary:MutableDelegateOwner:primary:30|alt:secondary:MutableDelegateOwner:secondary:30|local:local:top:local:0|local:local:top:local:10')"
expected_output="${KOTLIN_SMOKE_EXPECTED_OUTPUT:-"$default_expected_output"}"

native_output="$(java -cp "$runtime_cp" HelloKt)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" HelloKt)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Kotlin compiler smoke passed in $((compile_end - compile_start))s using $classpath_mode classpath."
