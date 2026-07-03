#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${KOTLIN_COMPILER_VERSION:-2.4.0}"
cache_dir="${KOTLIN_SMOKE_CACHE_DIR:-"$repo_root/build/kotlin-smoke-cache"}"
work_dir="${KOTLIN_BYTECODE_SMOKE_WORK_DIR:-"$repo_root/build/kotlin-bytecode-smoke"}"
compiler_jar="${KOTLIN_COMPILER_JAR:-}"
stdlib_jar="${KOTLIN_STDLIB_JAR:-}"
classpath_mode="${KOTLIN_BYTECODE_SMOKE_CLASSPATH_MODE:-minimal}"
compiler_cp="${KOTLIN_BYTECODE_COMPILER_CLASSPATH:-}"

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
      echo "Invalid KOTLIN_BYTECODE_SMOKE_CLASSPATH_MODE: $classpath_mode" >&2
      exit 1
      ;;
  esac
fi

runner="$repo_root/build/release-cli/console/runner.js"
out_dir="$work_dir/out"
source_file="$work_dir/BytecodeSmoke.kt"

rm -rf "$work_dir"
mkdir -p "$out_dir"
cat > "$source_file" <<'KOTLIN_BYTECODE_SOURCE'
import kotlin.jvm.JvmInline
import kotlin.reflect.KClass

fun interface BytecodeMapper {
  fun map(value: Int): Int
}

@Target(AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
annotation class BytecodeReceiverTag(val value: String)

typealias BytecodeBlock = StringBuilder.(String) -> Unit

fun @receiver:BytecodeReceiverTag("receiver") String.decorate(
  prefix: String,
  suffix: String = "!"
): String = prefix + this + suffix

enum class BytecodeLevel { LOW, HIGH }

@Retention(AnnotationRetention.RUNTIME)
@Target(
  AnnotationTarget.CLASS,
  AnnotationTarget.FUNCTION,
  AnnotationTarget.VALUE_PARAMETER
)
@Repeatable
annotation class BytecodeTag(val value: String)

@Retention(AnnotationRetention.RUNTIME)
@Target(
  AnnotationTarget.CLASS,
  AnnotationTarget.FUNCTION,
  AnnotationTarget.VALUE_PARAMETER
)
annotation class BytecodeRich(
  val name: String,
  val level: BytecodeLevel = BytecodeLevel.LOW,
  val owner: KClass<*>,
  val numbers: IntArray
)

@BytecodeTag("class-a")
@BytecodeTag("class-b")
@BytecodeRich("class", BytecodeLevel.HIGH, BytecodeAnnotated::class, [1, 2])
class BytecodeAnnotated(
  @BytecodeTag("ctor")
  @BytecodeRich("arg", owner = String::class, numbers = [3])
  val value: String
) {
  @BytecodeTag("method")
  @BytecodeRich("method", owner = Int::class, numbers = [4])
  fun combine(
    @BytecodeTag("suffix")
    suffix: String
  ): String = value + suffix
}

interface BytecodeStep<in I, out O> {
  fun apply(input: I): O

  fun describe(input: I): String = apply(input).toString()
}

class BytecodeStringStep : BytecodeStep<CharSequence, String> {
  override fun apply(input: CharSequence): String = input.toString()
}

class BytecodeDelegating(
  private val delegate: BytecodeStep<CharSequence, String>
) : BytecodeStep<CharSequence, String> by delegate

@JvmInline
value class BytecodeValue(val raw: Int) : Comparable<BytecodeValue> {
  fun label(): String = "v$raw"

  override fun compareTo(other: BytecodeValue): Int = raw - other.raw
}

fun <T : CharSequence> bytecodeGeneric(value: T): T = value

fun main() {
  val mapper = BytecodeMapper { value -> value + 1 }
  val block: BytecodeBlock = { text -> append(text) }
  val builder = StringBuilder("a")
  builder.block("b")
  val annotated = BytecodeAnnotated("q").combine("z")
  val step: BytecodeStep<String, CharSequence> =
    BytecodeDelegating(BytecodeStringStep())
  val values = listOf(BytecodeValue(2), BytecodeValue(1))
    .sorted()
    .joinToString(",") { value -> value.label() }
  println(
    mapper.map(2).toString() + "|" +
      "x".decorate("[", "]") + "|" +
      builder.toString() + "|" +
      annotated + "|" +
      step.describe("k") + "|" +
      values + "|" +
      bytecodeGeneric("g")
  )
}
KOTLIN_BYTECODE_SOURCE

compile_timeout="${KOTLIN_BYTECODE_SMOKE_COMPILE_TIMEOUT_SECONDS:-600}"
run_timeout="${KOTLIN_BYTECODE_SMOKE_RUN_TIMEOUT_SECONDS:-60}"
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
  "$source_file"
compile_end="$(date +%s)"

test -f "$out_dir/BytecodeSmokeKt.class"
test -f "$out_dir/BytecodeAnnotated.class"
test -f "$out_dir/BytecodeRich.class"
test -f "$out_dir/BytecodeTag.class"
test -f "$out_dir/BytecodeTag\$Container.class"
test -f "$out_dir/BytecodeValue.class"
test -f "$out_dir/BytecodeDelegating.class"
test -f "$out_dir/BytecodeStep.class"
test -f "$out_dir/META-INF/main.kotlin_module"

kotlin_bytecode_dump="$work_dir/kotlin-bytecode.javap"
javap -classpath "$out_dir" -v \
  BytecodeSmokeKt \
  BytecodeValue > "$kotlin_bytecode_dump"
grep -Fq 'InvokeDynamic' "$kotlin_bytecode_dump"
grep -Fq 'java/lang/invoke/LambdaMetafactory.metafactory' "$kotlin_bytecode_dump"
grep -Fq 'Lkotlin/ExtensionFunctionType;' "$kotlin_bytecode_dump"
grep -Fq 'BytecodeValue."box-impl":(I)LBytecodeValue;' "$kotlin_bytecode_dump"
grep -Fq 'BytecodeValue."unbox-impl":()I' "$kotlin_bytecode_dump"
grep -Fq 'ACC_BRIDGE, ACC_SYNTHETIC' "$kotlin_bytecode_dump"
grep -Fq 'kotlin.Metadata(' "$kotlin_bytecode_dump"
grep -Fq 'SourceFile: "BytecodeSmoke.kt"' "$kotlin_bytecode_dump"
grep -Fq 'LineNumberTable:' "$kotlin_bytecode_dump"
grep -Fq 'BootstrapMethods:' "$kotlin_bytecode_dump"
grep -Fq 'MethodParameters:' "$kotlin_bytecode_dump"
grep -Fq '      prefix' "$kotlin_bytecode_dump"
grep -Fq '      suffix' "$kotlin_bytecode_dump"

kotlin_metadata_dump="$work_dir/kotlin-metadata.javap"
javap -classpath "$out_dir" -v \
  BytecodeAnnotated \
  BytecodeRich \
  BytecodeDelegating \
  BytecodeStep > "$kotlin_metadata_dump"
grep -Fq 'RuntimeVisibleParameterAnnotations:' "$kotlin_metadata_dump"
grep -Fq 'BytecodeTag$Container(' "$kotlin_metadata_dump"
grep -Fq 'BytecodeRich(' "$kotlin_metadata_dump"
grep -Fq 'MethodParameters:' "$kotlin_metadata_dump"
grep -Fq 'AnnotationDefault:' "$kotlin_metadata_dump"
grep -Fq 'java.lang.annotation.Retention(' "$kotlin_metadata_dump"
grep -Fq '// Ljava/lang/Object;LBytecodeStep<Ljava/lang/CharSequence;Ljava/lang/String;>;' "$kotlin_metadata_dump"
grep -Fq 'ACC_BRIDGE, ACC_SYNTHETIC' "$kotlin_metadata_dump"
grep -Fq 'BytecodeStep$DefaultImpls' "$kotlin_metadata_dump"
grep -Fq 'kotlin.Metadata(' "$kotlin_metadata_dump"
grep -Fq 'SourceFile: "BytecodeSmoke.kt"' "$kotlin_metadata_dump"
grep -Fq 'LineNumberTable:' "$kotlin_metadata_dump"
grep -Fq 'InnerClasses:' "$kotlin_metadata_dump"
grep -Fq '      value' "$kotlin_metadata_dump"
grep -Fq '      suffix' "$kotlin_metadata_dump"

runtime_cp="$out_dir:$stdlib_jar"
expected_output="$(cat <<'KOTLIN_BYTECODE_EXPECTED'
3|[x]|ab|qz|k|v1,v2|g
KOTLIN_BYTECODE_EXPECTED
)"

native_output="$(java -cp "$runtime_cp" BytecodeSmokeKt)"
if [ "$native_output" != "$expected_output" ]; then
  echo "Unexpected native JVM output: $native_output" >&2
  exit 1
fi

doppio_output="$(timeout -s INT "${run_timeout}s" node --no-deprecation "$runner" -cp "$runtime_cp" BytecodeSmokeKt)"
if [ "$doppio_output" != "$expected_output" ]; then
  echo "Unexpected Doppio output: $doppio_output" >&2
  exit 1
fi

echo "Kotlin bytecode smoke passed in $((compile_end - compile_start))s using $classpath_mode classpath."
