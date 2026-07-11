import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.util.AbstractMap
import java.util.function.Consumer
import java.util.function.Function
import java.util.stream.Stream

fun modernJavaInteropSummary(): String {
  val hexClass = Class.forName("java.util.HexFormat")
  val hex = hexClass.getMethod("of").invoke(null)
  val upper = hexClass.getMethod("withUpperCase").invoke(hex)
  val bytes = byteArrayOf(0x0f, 0x10, -1)
  val formatted = hexClass.getMethod("formatHex", ByteArray::class.java).invoke(hex, bytes) as String
  val upperText = hexClass.getMethod("formatHex", ByteArray::class.java).invoke(upper, byteArrayOf(10, 11)) as String
  val parsed = hexClass.getMethod("parseHex", CharSequence::class.java).invoke(hex, "cafe") as ByteArray
  val digit = hexClass.getMethod("fromHexDigit", Int::class.javaPrimitiveType).invoke(null, 'f'.code) as Int

  val instantSourceClass = Class.forName("java.time.InstantSource")
  val fixedInstant = Instant.parse("2020-01-02T03:04:05Z")
  val fixed = instantSourceClass.getMethod("fixed", Instant::class.java).invoke(null, fixedInstant)
  val fixedValue = instantSourceClass.getMethod("instant").invoke(fixed) as Instant
  val fixedMillis = instantSourceClass.getMethod("millis").invoke(fixed) as Long
  val offset = instantSourceClass
    .getMethod("offset", instantSourceClass, Duration::class.java)
    .invoke(null, fixed, Duration.ofSeconds(2))
  val offsetValue = instantSourceClass.getMethod("instant").invoke(offset) as Instant
  val zoned = instantSourceClass
    .getMethod("withZone", ZoneId::class.java)
    .invoke(fixed, ZoneId.of("UTC"))

  val randomGeneratorClass = Class.forName("java.util.random.RandomGenerator")
  val randomFactoryClass = Class.forName("java.util.random.RandomGeneratorFactory")
  val randomFactory = randomFactoryClass.getMethod("of", String::class.java).invoke(null, "Random")
  val randomGenerator = randomFactoryClass
    .getMethod("create", Long::class.javaPrimitiveType)
    .invoke(randomFactory, 123L)
  val nextInt = randomGeneratorClass
    .getMethod("nextInt", Int::class.javaPrimitiveType)
    .invoke(randomGenerator, 100) as Int
  val nextLong = randomGeneratorClass
    .getMethod("nextLong", Long::class.javaPrimitiveType)
    .invoke(randomGenerator, 1000L) as Long
  val splitFactory = randomFactoryClass.getMethod("of", String::class.java).invoke(null, "SplittableRandom")
  val splitGenerator = randomFactoryClass
    .getMethod("create", Long::class.javaPrimitiveType)
    .invoke(splitFactory, 123L)
  val splitInt = randomGeneratorClass
    .getMethod("nextInt", Int::class.javaPrimitiveType)
    .invoke(splitGenerator, 100) as Int
  val splitLong = randomGeneratorClass
    .getMethod("nextLong", Long::class.javaPrimitiveType)
    .invoke(splitGenerator, 1000L) as Long
  val splitIsSplittable = randomFactoryClass.getMethod("isSplittable").invoke(splitFactory) as Boolean
  val streamList = Stream.of("q", "r", "s")
    .map { value -> value.uppercase() }
    .toList()
  val streamListFailure = try {
    streamList.add("T")
    "mut"
  } catch (e: UnsupportedOperationException) {
    "uoe"
  }
  val mutableEntry = AbstractMap.SimpleEntry("entry", "value")
  val entryCopy = java.util.Map.Entry.copyOf(mutableEntry)
  mutableEntry.setValue("changed")
  val entryCopyMutation = try {
    entryCopy.setValue("again")
    "mut"
  } catch (e: UnsupportedOperationException) {
    "uoe"
  }
  val copyList = java.util.List.copyOf(listOf("m", "n"))
  val copyListMutation = try {
    copyList.add("z")
    "mut"
  } catch (e: UnsupportedOperationException) {
    "uoe"
  }
  val copySet = java.util.Set.copyOf(listOf("s", "s", "t"))
  val copyMap = java.util.Map.copyOf(linkedMapOf("x" to 4, "y" to 5))
  val copyMapMutation = try {
    copyMap.put("z", 9)
    "mut"
  } catch (e: UnsupportedOperationException) {
    "uoe"
  }
  val optionalValue = java.util.Optional.of("opt").orElseThrow()
  val optionalEmpty = java.util.Optional.empty<String>()
  val optionalFailure = try {
    optionalEmpty.orElseThrow()
    "ok"
  } catch (e: java.util.NoSuchElementException) {
    "nse"
  }
  val stackWalkerClass = Class.forName("java.lang.StackWalker")
  val stackFrameClass = Class.forName("java.lang.StackWalker\$StackFrame")
  val stackWalker = stackWalkerClass.getMethod("getInstance").invoke(null)
  val stackFrameGetClassName = stackFrameClass.getMethod("getClassName")
  val stackFrameGetMethodName = stackFrameClass.getMethod("getMethodName")
  val stackHasSmokeFrame = stackWalkerClass
    .getMethod("walk", Function::class.java)
    .invoke(stackWalker, Function<Any, Boolean> { framesObj ->
      @Suppress("UNCHECKED_CAST")
      val frames = framesObj as Stream<Any>
      frames.anyMatch { frame ->
        stackFrameGetClassName.invoke(frame) == "ModernJavaInteropSmokeKt" &&
            stackFrameGetMethodName.invoke(frame) == "modernJavaInteropSummary"
      }
    }) as Boolean
  val stackWalkerOptionClass = Class.forName("java.lang.StackWalker\$Option")
  val retainClassReference = stackWalkerOptionClass.enumConstants
    .first { (it as Enum<*>).name == "RETAIN_CLASS_REFERENCE" }
  val retainedStackWalker = stackWalkerClass
    .getMethod("getInstance", stackWalkerOptionClass)
    .invoke(null, retainClassReference)
  val callerClass = stackWalkerClass.getMethod("getCallerClass").invoke(retainedStackWalker) as Class<*>
  var forEachSawSummary = false
  var forEachSawHelloMain = false
  stackWalkerClass
    .getMethod("forEach", Consumer::class.java)
    .invoke(retainedStackWalker, Consumer<Any> { frame ->
      val className = stackFrameGetClassName.invoke(frame)
      val methodName = stackFrameGetMethodName.invoke(frame)
      if (className == "ModernJavaInteropSmokeKt" && methodName == "modernJavaInteropSummary") {
        forEachSawSummary = true
      }
      if (className == "KotlinModernJavaInteropHelloKt" && methodName == "main") {
        forEachSawHelloMain = true
      }
    })
  val callerClassMatches = callerClass.name == "KotlinModernJavaInteropHelloKt"
  val processHandleClass = Class.forName("java.lang.ProcessHandle")
  val currentHandle = processHandleClass.getMethod("current").invoke(null)
  val currentPid = processHandleClass.getMethod("pid").invoke(currentHandle) as Long
  val currentProcessAlive = processHandleClass.getMethod("isAlive").invoke(currentHandle) as Boolean
  val currentProcessByPid = processHandleClass
    .getMethod("of", Long::class.javaPrimitiveType)
    .invoke(null, currentPid) as java.util.Optional<*>
  val processInfoClass = Class.forName("java.lang.ProcessHandle\$Info")
  val currentInfo = processHandleClass.getMethod("info").invoke(currentHandle)
  val commandPresent = (processInfoClass.getMethod("command").invoke(currentInfo) as java.util.Optional<*>).isPresent
  val commandLinePresent = (processInfoClass.getMethod("commandLine").invoke(currentInfo) as java.util.Optional<*>).isPresent
  val argumentsPresent = (processInfoClass.getMethod("arguments").invoke(currentInfo) as java.util.Optional<*>).isPresent
  val startInstantPresent = (processInfoClass.getMethod("startInstant").invoke(currentInfo) as java.util.Optional<*>).isPresent
  val cpuDurationPresent = (processInfoClass.getMethod("totalCpuDuration").invoke(currentInfo) as java.util.Optional<*>).isPresent
  val infoString = currentInfo.toString()
  val infoStringShape = infoString.startsWith("[") && infoString.contains("cmd: ") && infoString.endsWith("]")

  return "$formatted|$upperText|${parsed.size}:${hexClass.getMethod("formatHex", ByteArray::class.java).invoke(hex, parsed)}:$digit|" +
      "$fixedValue:$fixedMillis:$offsetValue:${Clock::class.java.isInstance(zoned)}|" +
      "${randomFactoryClass.getMethod("name").invoke(randomFactory)}:$nextInt:$nextLong|" +
      "${randomFactoryClass.getMethod("name").invoke(splitFactory)}:$splitIsSplittable:$splitInt:$splitLong|" +
      "${streamList.joinToString("")}:$streamListFailure|" +
      "${entryCopy.key}:${entryCopy.value}:$entryCopyMutation|" +
      "${copyList.joinToString("")}:$copyListMutation:${copySet.size}:${copySet.contains("s")}:${copySet.contains("t")}:" +
      "${copyMap["y"]}:$copyMapMutation:$optionalValue:${optionalEmpty.isEmpty}:$optionalFailure:" +
      "$stackHasSmokeFrame:$callerClassMatches:$forEachSawSummary:$forEachSawHelloMain:" +
      "${currentPid > 0}:$currentProcessAlive:${currentProcessByPid.isPresent}:" +
      "$commandPresent:$commandLinePresent:$argumentsPresent:$startInstantPresent:$cpuDurationPresent:$infoStringShape"
}
