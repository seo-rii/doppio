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
test -f "$out_dir/AnnotationMetadataOwner.class"
test -f "$out_dir/AnnotationMetadataSmokeKt.class"
test -f "$out_dir/AnnotatedSmokeOwner.class"
test -f "$out_dir/AnnotationReflectionSmokeKt.class"
test -f "$out_dir/ConstructsKt.class"
test -f "$out_dir/AdvancedKt.class"
test -f "$out_dir/BytecodeSmokeKt.class"
test -f "$out_dir/CollectionBuilderSmokeKt.class"
test -f "$out_dir/CollectionBuilderSmokeKt\$collectionBuilderSummary\$\$inlined\$groupingBy\$1.class"
test -f "$out_dir/ConcurrentCacheSmokeKt.class"
test -f "$out_dir/ControlFlowSmokeKt.class"
test -f "$out_dir/CaptureOwner.class"
test -f "$out_dir/CaptureOwner\$Nested.class"
test -f "$out_dir/CaptureOwner\$Nested\$Companion.class"
test -f "$out_dir/CaptureOwner\$Worker.class"
test -f "$out_dir/CaptureOwner\$Worker\$describe\$LocalFold.class"
test -f "$out_dir/CaptureOwner\$Worker\$describe\$anon\$1.class"
test -f "$out_dir/CaptureShapeSmokeKt.class"
test -f "$out_dir/ClosingSmoke.class"
test -f "$out_dir/ComponentSmoke.class"
test -f "$out_dir/DefaultBox.class"
test -f "$out_dir/DefaultConfig.class"
test -f "$out_dir/DefaultFormatter.class"
test -f "$out_dir/DefaultFormatter\$DefaultImpls.class"
test -f "$out_dir/DefaultFormatterImpl.class"
test -f "$out_dir/DefaultSyntheticSmokeKt.class"
test -f "$out_dir/DelegatingStep.class"
test -f "$out_dir/DelegationBridgeSmokeKt.class"
test -f "$out_dir/DelegateSmokeKt.class"
test -f "$out_dir/DiagnosticKind.class"
test -f "$out_dir/EmptyStage.class"
test -f "$out_dir/EnumPolymorphismSmokeKt.class"
test -f "$out_dir/ExtensionVarianceSmokeKt.class"
test -f "$out_dir/ExtensionVarianceSmokeKt\$starKeys\$\$inlined\$sortedBy\$1.class"
test -f "$out_dir/FileIoSmokeKt.class"
test -f "$out_dir/GenericCell.class"
test -f "$out_dir/InlineControlSmokeKt.class"
test -f "$out_dir/InlineControlSmokeKt\$crossCompute\$runner\$1.class"
test -f "$out_dir/InlineControlSmokeKt\$inlineControlSummary\$\$inlined\$crossCompute\$1.class"
test -f "$out_dir/InitializationDelegateOwner.class"
test -f "$out_dir/InitializationDelegateOwner\$Companion.class"
test -f "$out_dir/InitializationDelegateOwner\$Nested.class"
test -f "$out_dir/InitializationDelegateOwner\$special\$\$inlined\$observable\$1.class"
test -f "$out_dir/InitializationDelegateOwner\$special\$\$inlined\$vetoable\$1.class"
test -f "$out_dir/InitializationDelegateSmokeKt.class"
test -f "$out_dir/InitializationRecorder.class"
test -f "$out_dir/InteropKt.class"
test -f "$out_dir/JarZipSmokeKt.class"
test -f "$out_dir/JvmInteropOwner.class"
test -f "$out_dir/JvmInteropOwner\$Companion.class"
test -f "$out_dir/JvmInteropSingleton.class"
test -f "$out_dir/JvmInteropSmokeFile.class"
test -f "$out_dir/MethodHandleOwner.class"
test -f "$out_dir/MethodHandleOwner\$Companion.class"
test -f "$out_dir/MethodHandleSmokeKt.class"
test -f "$out_dir/BindingProvider.class"
test -f "$out_dir/ModernConstructSmokeKt.class"
test -f "$out_dir/MetadataLevel.class"
test -f "$out_dir/MultiTag.class"
test -f "$out_dir/MultiTag\$Container.class"
test -f "$out_dir/NioPathSmokeKt.class"
test -f "$out_dir/MutableBinding.class"
test -f "$out_dir/MutableDelegateOwner.class"
test -f "$out_dir/MutableDelegateSmokeKt.class"
test -f "$out_dir/ReferenceSequenceSmokeKt.class"
test -f "$out_dir/ReifiedArraySmokeKt.class"
test -f "$out_dir/ResourceLookupMarker.class"
test -f "$out_dir/ResourceLookupSmokeKt.class"
test -f "$out_dir/ResultExceptionSmokeKt.class"
test -f "$out_dir/ResultSmokeException.class"
test -f "$out_dir/RoutedStage.class"
test -f "$out_dir/RoutedStage\$ALPHA.class"
test -f "$out_dir/RoutedStage\$BETA.class"
test -f "$out_dir/RoutedStage\$GAMMA.class"
test -f "$out_dir/RuntimeSmokeTag.class"
test -f "$out_dir/AlphaServiceLookupPlugin.class"
test -f "$out_dir/BetaServiceLookupPlugin.class"
test -f "$out_dir/ProxyReflectionService.class"
test -f "$out_dir/ProxyReflectionSmokeKt.class"
test -f "$out_dir/ProxyReflectionTag.class"
test -f "$out_dir/RichTag.class"
test -f "$out_dir/ServiceLoaderSmokeKt.class"
test -f "$out_dir/ServiceLookupPlugin.class"
test -f "$out_dir/SequenceBuilderSmokeKt.class"
test -f "$out_dir/SequenceBuilderSmokeKt\$sequenceBuilderSummary\$iteratorValues\$1.class"
test -f "$out_dir/SequenceBuilderSmokeKt\$sequenceBuilderSummary\$seq\$1.class"
test -f "$out_dir/SuspendSmokeKt.class"
test -f "$out_dir/PrefixDelegate.class"
test -f "$out_dir/PipelineStep.class"
test -f "$out_dir/PipelineStep\$DefaultImpls.class"
test -f "$out_dir/ReferenceOwner.class"
test -f "$out_dir/ReferenceOwner\$Companion.class"
test -f "$out_dir/ReceiverLambdaSmokeKt.class"
test -f "$out_dir/ReceiverLambdaSmokeKt\$receiverLambdaSummary\$boundExtension\$1.class"
test -f "$out_dir/ReceiverLambdaSmokeKt\$receiverLambdaSummary\$extensionRef\$1.class"
test -f "$out_dir/ReceiverLambdaSmokeKt\$receiverLambdaSummary\$propertyRef\$1.class"
test -f "$out_dir/ReceiverMarker.class"
test -f "$out_dir/ReceiverPipeline.class"
test -f "$out_dir/SmokeResult.class"
test -f "$out_dir/SmokeRegistry.class"
test -f "$out_dir/SmokeValue.class"
test -f "$out_dir/StageKind.class"
test -f "$out_dir/StageMapper.class"
test -f "$out_dir/StageNode.class"
test -f "$out_dir/StagePayload.class"
test -f "$out_dir/Sink.class"
test -f "$out_dir/StringCell.class"
test -f "$out_dir/TextRegexSmokeKt.class"
test -f "$out_dir/TextStep.class"
test -f "$out_dir/UnsignedSmokeKt.class"
test -f "$out_dir/VarianceBox.class"
test -f "$out_dir/ValueClassSmokeKt.class"
test -f "$out_dir/ValueStage.class"
test -f "$out_dir/ValueDescriber.class"
test -f "$out_dir/PipelineState.class"
test -f "$out_dir/WhenMappingSmokeKt.class"
test -f "$out_dir/WhenMappingSmokeKt\$WhenMappings.class"
test -f "$out_dir/META-INF/main.kotlin_module"

mkdir -p "$out_dir/META-INF/services"
cat > "$out_dir/META-INF/services/ServiceLookupPlugin" <<'SERVICE_LOOKUP_PROVIDERS'
# Kotlin smoke service providers
AlphaServiceLookupPlugin
AlphaServiceLookupPlugin
BetaServiceLookupPlugin
SERVICE_LOOKUP_PROVIDERS

runtime_cp="$out_dir"
runtime_cp="$runtime_cp:$stdlib_jar"
default_expected_output="$(printf 'hi\nname=2,4:5\nmode-FAST:3:2,3:caught\nOK:FALLBACK:3:9:2:1:accbbb:4:4:7\nsuspend=7\ndelegate:answer:DelegatedOwner|local:local:top\nstate=14\npending->delayed=15\npending->fail=resume3\ntry>catch>finally:boom:8:true:x3:10:12:4:sync\npending->thread=24\npending->executor=13\npending>1>pending>pending>1>pending>pending>1>dispatch=36\na2|b7|c4|d9:20:8:7:10\nv1,v4,v7:22:box4:v7:none|v11:a\nString:3:a|bb|ccc:Number:2:1|2:i[3,1,4,9,1,5]=23:zamm|zbbmm:1-4-9:2345:String:int\nclass:field:getter:ctor,_:method:arg:kt3\nABG:1:15:kt5:StagePayload:EmptyStage:true\np-box:6!:p-wide:6?:[CORE]:cfg23ab:p-box:6!|p-named:6!|p-full:9!:p-r:3!|q-r:3!|q-r:3?\n1357:nilpe:14:10,30,-1,40:neg|zero|small|big\nenter>body>exit:ok:c10:34:stop3\nkt:java:ok7:IllegalArgumentException:fieldconst:top-3:o5obj:5:11111111\nbind:primary:MutableDelegateOwner:primary:0|bind:primary:MutableDelegateOwner:primary:30|alt:secondary:MutableDelegateOwner:secondary:30|local:local:top:local:0|local:local:top:local:10\n234:yx:true:11:45|89:yx:true:8:5\ntext:7|text:5|5x|text:6|z!|az!|apply:Object:Object,describe:String:CharSequence,describe:String:Object|apply:Object:Object,describe:String:Object|echo:Object:Object,read:Object:\nclass-a,class-b|class:HIGH:AnnotationMetadataOwner:1,2,3|ctor-a,ctor-b|ctor:LOW:String:4,5|field-a,field-b|field:LOW:int:6|method-a,method-b|method:LOW:long:7,8|arg-a,arg-b|arg:LOW:double:9|kt3\n5/1/5:1|5|3|p0:b:1,p1:aa:2|kt:2|ktxy|1,2|kt:2|xy:2|n:Integer,s:String,z:null\ns|[a]|kn|<GO>|x1|(xy)|{q}|ad|text\n16|1:2:2,1:4:4,2:1:2,2:2:4,2:3:6,2:4:8,3:2:6#6|p357|q46|ok1:neg1:For input string: "x":ok7|2:ccc\nfalse/true|KT:5:1|KT:5:1|kt|2/9/6|companion>observed:start->kt>guarded:2?1>guarded:2?9>lazy>nested\n24678|k0=4,k1=16,k2=36,k3=49,k4=64|e=20,o=7|12,21,8|24|67|8|678/24|2:4;4:6;6:7|abc|22,44,66,77,88|1:3:7:13:20:28|71|2,1,0,9\n1:2|start>after1|0=3,1=8,2=10|start>after1>start>after1>afterAll>done|abcd|789/IllegalStateException|3,6,12,24|xyyzzz:23')"
default_expected_output="${default_expected_output}
44|12|IllegalStateException/99/77|0=ok44,1=errIllegalStateException:again,2=errUnsupportedOperationException:manual|6:body>recover:inner>finally|IllegalArgumentException:root|two|enter:a>ok:a>mapped:44>enter:b>fail:b:ResultSmokeException:boom>recover:boom>enter:c>ok:c>recoverCatching:bad4>else:again"
default_expected_output="${default_expected_output}
0:a:2:0-2,1:bb:25:5-9,2:c:457:12-16|A:1; BB:32; C:654; bad=x|first b=2|a|bb|c|0:5:a,1:6:b,2:5:g|KT/42|true|KOTin"
default_expected_output="${default_expected_output}
0:5:a,1:4:b,2:5:g|aaa|input.txt:17,nested/out.txt:17|616c706861|txt/out/nested/out.txt|true/true"
default_expected_output="${default_expected_output}
0:5:d,1:7:e,2:4:z|64656c74|input.txt:false,nested:true|input.txt:19,nested/moved.txt:19|input.txt/runtime-nio/nested/moved.txt|true/true/true"
default_expected_output="${default_expected_output}
a=123,b=12,c=89|true|true:y:Y11|abc:false:true:1|main:11/worker:3/main:11/main:11|locked:3:hold:1:true|k=1,z=12|11"
default_expected_output="${default_expected_output}
ffffff|4:cafebabe|1:1:true|true:true:true"
default_expected_output="${default_expected_output}
alpha=7,beta=11|2|alpha=7,beta=11|AlphaServiceLookupPlugin>BetaServiceLookupPlugin|true"
default_expected_output="${default_expected_output}
jarzip:false:META-INF/MANIFEST.MF,META-INF/services/example.Service,META-INF/versions/17/pkg/data.txt,pkg/data.txt:alpha/beta:pkg.Provider:11:6e30506e:6e30506e:true|META-INF/MANIFEST.MF=META-INF,META-INF/services/example.Service=META-INF,META-INF/versions/17/pkg/data.txt=META-INF,pkg/data.txt=alpha|jar:jar:alpha/beta:pkg.Provider:true"
default_expected_output="${default_expected_output}
iface/transform/value|dyn|KT5|XY3|cba|null|ProxyReflectionService(dyn)|321|true|true|true|transform:2,getLabel:0,transform:2,maybe:1,maybe:1,toString:0,hashCode:0,equals:1"
default_expected_output="${default_expected_output}
v5|a3|mh>handle|handle!|11|7|(Ljava/lang/String;I)Ljava/lang/String;|(LMethodHandleOwner;Ljava/lang/String;)Ljava/lang/String;|id|const|bound6|handle?|ins9|drop|flt9|[ret4]|c/a/b|empty|word|pos:7|neg:-2/-2|(I)Ljava/lang/String;|(IJLjava/lang/String;)Ljava/lang/String;|(Ljava/lang/String;I)Ljava/lang/String;|(Ljava/lang/String;)Ljava/lang/String;|(I)Ljava/lang/String;|exact3|loose4|A/B6/C|left:right|left|right|long:12|one|changed|7|9|boom|0|true|true|4|3:true|true|matched|fold:n6:6|u7/ur>reflect?/IllegalAccessException|MethodHandleOwner/true:true/secret:pl/IllegalAccessException|(Ljava/lang/invoke/MethodHandle;Ljava/lang/String;I)Ljava/lang/String;|(Ljava/lang/String;Ljava/lang/String;ILjava/lang/String;)Ljava/lang/String;|(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;|(D)Ljava/lang/String;|([Ljava/lang/String;I)Ljava/lang/String;|([III)V|(Ljava/lang/IllegalStateException;)Ljava/lang/String;|()I|()Ljava/lang/String;|(ILjava/lang/String;)Ljava/lang/String;|([Ljava/lang/String;)I|(I)[Ljava/lang/String;|(Ljava/lang/String;I)V|(ILjava/lang/String;)Ljava/lang/String;|(Ljava/lang/String;I)Ljava/lang/String;"
default_expected_output="${default_expected_output}
3:4:0fa0ff:2,9,18446744073709551615:4294967295,4:wrap:true:true"
default_expected_output="${default_expected_output}
A1B3G5|tk2|X1,x2,xxx3|low/high/high|IllegalArgumentException"
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
