import java.lang.invoke.MethodHandle
import java.lang.invoke.MethodHandles
import java.lang.invoke.MethodType

class MethodHandleOwner(@JvmField var text: String) {
  fun append(suffix: String): String = text + suffix

  fun lengthPlus(delta: Int): Int = text.length + delta

  private fun secretSuffix(suffix: String): String = "secret:$suffix"

  companion object {
    @JvmField
    var cleanupLog: String = ""

    @JvmStatic
    fun join(prefix: String, value: Int): String = prefix + (value + 1)

    @JvmStatic
    fun doubleValue(value: Int): Int = value * 2

    @JvmStatic
    fun bracket(value: String): String = "[$value]"

    @JvmStatic
    fun triple(first: String, second: String, third: String): String = "$first/$second/$third"

    @JvmStatic
    fun joinArray(prefix: String, values: Array<String>): String = prefix + ":" + values.joinToString(",")

    @JvmStatic
    fun mixArray(prefix: String, values: Array<String>, suffix: String): String =
      joinArray(prefix, values) + ":$suffix"

    @JvmStatic
    fun four(first: String, second: String, third: String, fourth: String): String =
      "$first/$second/$third/$fourth"

    @JvmStatic
    fun loopZero(limit: Int): Int = 0

    @JvmStatic
    fun loopBelow(value: Int, limit: Int): Boolean = value < limit

    @JvmStatic
    fun loopIncrement(value: Int, limit: Int): Int = value + 1

    @JvmStatic
    fun loopCount(limit: Int): Int = limit

    @JvmStatic
    fun loopAddIndex(value: Int, index: Int, limit: Int): Int = value + index

    @JvmStatic
    fun loopSeed(prefix: String, limit: Int): String = prefix

    @JvmStatic
    fun loopCountText(prefix: String, limit: Int): Int = limit

    @JvmStatic
    fun loopKeepAppending(value: String, prefix: String, limit: Int): Boolean =
      value.length < prefix.length + limit

    @JvmStatic
    fun loopAppendDot(value: String, prefix: String, limit: Int): String = "$value."

    @JvmStatic
    fun loopAppendIndex(value: String, index: Int, prefix: String, limit: Int): String = value + index

    @JvmStatic
    fun loopRangeStart(prefix: String, start: Int, end: Int): Int = start

    @JvmStatic
    fun loopRangeEnd(prefix: String, start: Int, end: Int): Int = end

    @JvmStatic
    fun loopRangeSeed(prefix: String, start: Int, end: Int): String = prefix

    @JvmStatic
    fun loopRangeAppendIndex(value: String, index: Int, prefix: String, start: Int, end: Int): String =
      value + index

    @JvmStatic
    fun longLabel(value: Long): String = "long:$value"

    @JvmStatic
    fun foldPrefix(first: String, second: String): String = "$first:$second"

    @JvmStatic
    fun foldTarget(prefix: String, first: String, second: String): String = "$prefix|$first|$second"

    @JvmStatic
    fun foldAtTarget(first: String, folded: String, value: Int): String = "$first:$folded:$value"

    @JvmStatic
    fun foldAtCombiner(value: Int): String = "n$value"

    @JvmStatic
    fun tableFallback(index: Int, prefix: String): String = "$prefix:fb$index"

    @JvmStatic
    fun tableTarget0(index: Int, prefix: String): String = "$prefix:zero$index"

    @JvmStatic
    fun tableTarget1(index: Int, prefix: String): String = "$prefix:one$index"

    @JvmStatic
    fun isEmpty(value: String): Boolean = value.isEmpty()

    @JvmStatic
    fun throwOnNegative(value: Int): String {
      if (value < 0) {
        throw IllegalArgumentException("neg:$value")
      }
      return "pos:$value"
    }

    @JvmStatic
    fun handleNegative(e: IllegalArgumentException, value: Int): String = e.message + "/" + value

    @JvmStatic
    fun tryTarget(text: String, value: Int): String = "target:$text:$value"

    @JvmStatic
    fun tryFail(text: String, value: Int): String {
      throw IllegalArgumentException("try-fail:$text:$value")
    }

    @JvmStatic
    fun tryCleanup(throwable: Throwable?, result: String?, text: String): String {
      cleanupLog = (throwable?.let { it.javaClass.simpleName + ":" + it.message } ?: "none") +
        ",$result,$text"
      return "cleanup:$cleanupLog"
    }

    @JvmStatic
    fun tryVoidTarget(text: String) {
      cleanupLog = "void-target:$text"
    }

    @JvmStatic
    fun tryVoidCleanup(throwable: Throwable?, text: String) {
      cleanupLog = (throwable?.javaClass?.simpleName ?: "void-none") + ",$text,$cleanupLog"
    }
  }
}

fun methodHandleSummary(): String {
  val lookup = MethodHandles.lookup()
  val ownerClass = MethodHandleOwner::class.java
  val stringClass = String::class.java
  val intClass = java.lang.Integer.TYPE
  val staticJoin = lookup.findStatic(
    ownerClass,
    "join",
    MethodType.methodType(stringClass, stringClass, intClass)
  )
  val constructor = lookup.findConstructor(
    ownerClass,
    MethodType.methodType(java.lang.Void.TYPE, stringClass)
  )
  val append = lookup.findVirtual(
    ownerClass,
    "append",
    MethodType.methodType(stringClass, stringClass)
  )
  val lengthPlus = lookup.findVirtual(
    ownerClass,
    "lengthPlus",
    MethodType.methodType(intClass, intClass)
  )
  val getter = lookup.findGetter(ownerClass, "text", stringClass)
  val setter = lookup.findSetter(ownerClass, "text", stringClass)
  val reflectedJoin = ownerClass.getDeclaredMethod("join", stringClass, intClass)
  val reflectedConstructor = ownerClass.getConstructor(stringClass)
  val reflectedAppend = ownerClass.getDeclaredMethod("append", stringClass)
  val reflectedText = ownerClass.getDeclaredField("text")
  val unreflectedJoin = lookup.unreflect(reflectedJoin)
  val unreflectedConstructor = lookup.unreflectConstructor(reflectedConstructor)
  val unreflectedAppend = lookup.unreflect(reflectedAppend)
  val unreflectedGetter = lookup.unreflectGetter(reflectedText)
  val unreflectedSetter = lookup.unreflectSetter(reflectedText)

  val owner = constructor.invokeWithArguments("mh") as MethodHandleOwner
  val before = getter.invokeWithArguments(owner).toString()
  setter.invokeWithArguments(owner, "handle")
  val after = getter.invokeWithArguments(owner).toString()
  val directStatic = staticJoin.invokeWithArguments("v", 4).toString()
  val adaptedStatic = staticJoin.asType(
    MethodType.methodType(Any::class.java, Any::class.java, Any::class.java)
  ).invokeWithArguments("a", Integer.valueOf(2)).toString()
  val appended = append.invokeWithArguments(owner, "!").toString()
  val widenedReturn = lengthPlus.asType(
    MethodType.methodType(java.lang.Long.TYPE, ownerClass, intClass)
  ).invokeWithArguments(owner, 5).toString()
  val boxedReturn = lengthPlus.asType(
    MethodType.methodType(Any::class.java, ownerClass, intClass)
  ).invokeWithArguments(owner, 1).toString()
  val unreflectOwner = unreflectedConstructor.invokeWithArguments("ur") as MethodHandleOwner
  val unreflectBefore = unreflectedGetter.invokeWithArguments(unreflectOwner).toString()
  unreflectedSetter.invokeWithArguments(unreflectOwner, "reflect")
  val unreflectAfter = unreflectedAppend.invokeWithArguments(unreflectOwner, "?").toString()
  val unreflectStatic = unreflectedJoin.invokeWithArguments("u", 6).toString()
  val unreflectPrivateFailure = try {
    lookup.unreflect(ownerClass.getDeclaredMethod("secretSuffix", stringClass))
    "private-ok"
  } catch (e: IllegalAccessException) {
    e.javaClass.simpleName
  }
  val unreflectValues = listOf(
    unreflectStatic,
    unreflectBefore + ">" + unreflectAfter,
    unreflectPrivateFailure
  ).joinToString("/")
  val reflectAsMethod = MethodHandles::class.java.getMethod(
    "reflectAs",
    Class::class.java,
    MethodHandle::class.java
  )
  val reflectedStaticMember = reflectAsMethod.invoke(
    null,
    java.lang.reflect.Method::class.java,
    staticJoin
  ) as java.lang.reflect.Method
  val reflectedConstructorMember = reflectAsMethod.invoke(
    null,
    java.lang.reflect.Constructor::class.java,
    constructor
  ) as java.lang.reflect.Constructor<*>
  val reflectedGetterMember = reflectAsMethod.invoke(
    null,
    java.lang.reflect.Field::class.java,
    getter
  ) as java.lang.reflect.Field
  val reflectedSetterMember = reflectAsMethod.invoke(
    null,
    java.lang.reflect.Field::class.java,
    setter
  ) as java.lang.reflect.Field
  val reflectAsValues = listOf(
    reflectedStaticMember.name + ":" + reflectedStaticMember.parameterTypes.size,
    reflectedConstructorMember.declaringClass.simpleName + ":" +
      reflectedConstructorMember.parameterTypes[0].simpleName,
    reflectedGetterMember.name + ":" + reflectedGetterMember.type.simpleName,
    reflectedSetterMember.name + ":" + reflectedSetterMember.type.simpleName
  ).joinToString("/")
  val privateLookupMethod = MethodHandles::class.java.getMethod(
    "privateLookupIn",
    Class::class.java,
    MethodHandles.Lookup::class.java
  )
  val privateLookup = privateLookupMethod.invoke(null, ownerClass, lookup) as MethodHandles.Lookup
  val privateLookupSecret = privateLookup.findVirtual(
    ownerClass,
    "secretSuffix",
    MethodType.methodType(stringClass, stringClass)
  )
  val privateLookupFailure = try {
    privateLookupMethod.invoke(null, ownerClass, MethodHandles.publicLookup())
    "public-ok"
  } catch (e: java.lang.reflect.InvocationTargetException) {
    e.cause?.javaClass?.simpleName ?: e.javaClass.simpleName
  } catch (e: IllegalAccessException) {
    e.javaClass.simpleName
  }
  val privateLookupModes = privateLookup.lookupModes()
  val privateLookupValues = listOf(
    privateLookup.lookupClass().name,
    ((privateLookupModes and 2) != 0).toString() + ":" +
      ((privateLookupModes and 8) != 0).toString(),
    privateLookupSecret.invokeWithArguments(owner, "pl").toString(),
    privateLookupFailure
  ).joinToString("/")
  val identity = MethodHandles.identity(stringClass)
  val constant = MethodHandles.constant(stringClass, "const")
  val boundStatic = staticJoin.bindTo("bound")
  val boundVirtual = append.bindTo(owner)
  val inserted = MethodHandles.insertArguments(staticJoin, 1, 8)
  val droppedIdentity = MethodHandles.dropArguments(
    identity,
    0,
    intClass,
    java.lang.Long.TYPE
  )
  val doubleValue = lookup.findStatic(
    ownerClass,
    "doubleValue",
    MethodType.methodType(intClass, intClass)
  )
  val filteredArgument = MethodHandles.filterArguments(staticJoin, 1, doubleValue)
  val bracket = lookup.findStatic(
    ownerClass,
    "bracket",
    MethodType.methodType(stringClass, stringClass)
  )
  val filteredReturn = MethodHandles.filterReturnValue(staticJoin, bracket)
  val triple = lookup.findStatic(
    ownerClass,
    "triple",
    MethodType.methodType(stringClass, stringClass, stringClass, stringClass)
  )
  val permuted = MethodHandles.permuteArguments(
    triple,
    MethodType.methodType(stringClass, stringClass, stringClass, stringClass),
    2,
    0,
    1
  )
  val isEmpty = lookup.findStatic(
    ownerClass,
    "isEmpty",
    MethodType.methodType(java.lang.Boolean.TYPE, stringClass)
  )
  val emptyConstant = MethodHandles.dropArguments(
    MethodHandles.constant(stringClass, "empty"),
    0,
    stringClass
  )
  val guarded = MethodHandles.guardWithTest(isEmpty, emptyConstant, identity)
  val throwOnNegative = lookup.findStatic(
    ownerClass,
    "throwOnNegative",
    MethodType.methodType(stringClass, intClass)
  )
  val handleNegative = lookup.findStatic(
    ownerClass,
    "handleNegative",
    MethodType.methodType(stringClass, IllegalArgumentException::class.java, intClass)
  )
  val caught = MethodHandles.catchException(
    throwOnNegative,
    IllegalArgumentException::class.java,
    handleNegative
  )
  val exactInvoker = MethodHandles.exactInvoker(staticJoin.type())
  val looseInvoker = MethodHandles.invoker(staticJoin.type())
  val collected = MethodHandles.collectArguments(triple, 1, staticJoin)
  val foldPrefix = lookup.findStatic(
    ownerClass,
    "foldPrefix",
    MethodType.methodType(stringClass, stringClass, stringClass)
  )
  val foldTarget = lookup.findStatic(
    ownerClass,
    "foldTarget",
    MethodType.methodType(stringClass, stringClass, stringClass, stringClass)
  )
  val folded = MethodHandles.foldArguments(foldTarget, foldPrefix)
  val longLabel = lookup.findStatic(
    ownerClass,
    "longLabel",
    MethodType.methodType(stringClass, java.lang.Long.TYPE)
  )
  val explicitDoubleToLong = MethodHandles.explicitCastArguments(
    longLabel,
    MethodType.methodType(stringClass, java.lang.Double.TYPE)
  )
  val stringGetter = MethodHandles.arrayElementGetter(Array<String>::class.java)
  val stringSetter = MethodHandles.arrayElementSetter(Array<String>::class.java)
  val strings = arrayOf("zero", "one")
  val stringBefore = stringGetter.invokeWithArguments(strings, 1).toString()
  stringSetter.invokeWithArguments(strings, 1, "changed")
  val intGetter = MethodHandles.arrayElementGetter(IntArray::class.java)
  val intSetter = MethodHandles.arrayElementSetter(IntArray::class.java)
  val ints = intArrayOf(7, 8)
  val intBefore = intGetter.invokeWithArguments(ints, 0).toString()
  intSetter.invokeWithArguments(ints, 0, 9)
  val throwing = MethodHandles.throwException(stringClass, IllegalStateException::class.java)
  val thrown = try {
    throwing.invokeWithArguments(IllegalStateException("boom")).toString()
  } catch (e: IllegalStateException) {
    e.message ?: "missing"
  }
  val zeroMethod = MethodHandles::class.java.getMethod("zero", Class::class.java)
  val emptyMethod = MethodHandles::class.java.getMethod("empty", MethodType::class.java)
  val arrayLengthMethod = MethodHandles::class.java.getMethod("arrayLength", Class::class.java)
  val arrayConstructorMethod = MethodHandles::class.java.getMethod("arrayConstructor", Class::class.java)
  val dropArgumentsToMatchMethod = MethodHandles::class.java.getMethod(
    "dropArgumentsToMatch",
    MethodHandle::class.java,
    intClass,
    List::class.java,
    intClass
  )
  val dropReturnMethod = MethodHandles::class.java.getMethod("dropReturn", MethodHandle::class.java)
  val foldArgumentsAtMethod = MethodHandles::class.java.getMethod(
    "foldArguments",
    MethodHandle::class.java,
    intClass,
    MethodHandle::class.java
  )
  val asCollectorAtMethod = MethodHandle::class.java.getMethod(
    "asCollector",
    intClass,
    Class::class.java,
    intClass
  )
  val asSpreaderAtMethod = MethodHandle::class.java.getMethod(
    "asSpreader",
    intClass,
    Class::class.java,
    intClass
  )
  val tryFinallyMethod = MethodHandles::class.java.getMethod(
    "tryFinally",
    MethodHandle::class.java,
    MethodHandle::class.java
  )
  val tableSwitchMethod = MethodHandles::class.java.getMethod(
    "tableSwitch",
    MethodHandle::class.java,
    Array<MethodHandle>::class.java
  )
  val whileLoopMethod = MethodHandles::class.java.getMethod(
    "whileLoop",
    MethodHandle::class.java,
    MethodHandle::class.java,
    MethodHandle::class.java
  )
  val doWhileLoopMethod = MethodHandles::class.java.getMethod(
    "doWhileLoop",
    MethodHandle::class.java,
    MethodHandle::class.java,
    MethodHandle::class.java
  )
  val countedLoopMethod = MethodHandles::class.java.getMethod(
    "countedLoop",
    MethodHandle::class.java,
    MethodHandle::class.java,
    MethodHandle::class.java
  )
  val countedRangeLoopMethod = MethodHandles::class.java.getMethod(
    "countedLoop",
    MethodHandle::class.java,
    MethodHandle::class.java,
    MethodHandle::class.java,
    MethodHandle::class.java
  )
  val zeroInt = zeroMethod.invoke(null, intClass) as MethodHandle
  val zeroString = zeroMethod.invoke(null, stringClass) as MethodHandle
  val emptyString = emptyMethod.invoke(
    null,
    MethodType.methodType(stringClass, intClass, stringClass)
  ) as MethodHandle
  val arrayLength = arrayLengthMethod.invoke(null, Array<String>::class.java) as MethodHandle
  val arrayConstructor = arrayConstructorMethod.invoke(null, Array<String>::class.java) as MethodHandle
  val constructed = arrayConstructor.invokeWithArguments(3) as Array<*>
  val matchedDrop = dropArgumentsToMatchMethod.invoke(
    null,
    MethodHandles.identity(stringClass),
    0,
    listOf(intClass, stringClass),
    1
  ) as MethodHandle
  val droppedReturn = dropReturnMethod.invoke(null, staticJoin) as MethodHandle
  val foldAtTarget = lookup.findStatic(
    ownerClass,
    "foldAtTarget",
    MethodType.methodType(stringClass, stringClass, stringClass, intClass)
  )
  val foldAtCombiner = lookup.findStatic(
    ownerClass,
    "foldAtCombiner",
    MethodType.methodType(stringClass, intClass)
  )
  val foldedAtOne = foldArgumentsAtMethod.invoke(null, foldAtTarget, 1, foldAtCombiner) as MethodHandle
  val tableFallback = lookup.findStatic(
    ownerClass,
    "tableFallback",
    MethodType.methodType(stringClass, intClass, stringClass)
  )
  val tableTarget0 = lookup.findStatic(
    ownerClass,
    "tableTarget0",
    MethodType.methodType(stringClass, intClass, stringClass)
  )
  val tableTarget1 = lookup.findStatic(
    ownerClass,
    "tableTarget1",
    MethodType.methodType(stringClass, intClass, stringClass)
  )
  val tableSwitch = tableSwitchMethod.invoke(
    null,
    tableFallback,
    arrayOf(tableTarget0, tableTarget1)
  ) as MethodHandle
  val joinArray = lookup.findStatic(
    ownerClass,
    "joinArray",
    MethodType.methodType(stringClass, stringClass, Array<String>::class.java)
  )
  val collectedArray = joinArray.asCollector(Array<String>::class.java, 3)
  val collectedArrayAt = asCollectorAtMethod.invoke(
    joinArray,
    1,
    Array<String>::class.java,
    2
  ) as MethodHandle
  val mixArray = lookup.findStatic(
    ownerClass,
    "mixArray",
    MethodType.methodType(stringClass, stringClass, Array<String>::class.java, stringClass)
  )
  val collectedArrayMiddle = asCollectorAtMethod.invoke(
    mixArray,
    1,
    Array<String>::class.java,
    2
  ) as MethodHandle
  val spreadArray = collectedArray.asSpreader(Array<String>::class.java, 3)
  val spreadArrayAt = asSpreaderAtMethod.invoke(
    collectedArray,
    1,
    Array<String>::class.java,
    3
  ) as MethodHandle
  val four = lookup.findStatic(
    ownerClass,
    "four",
    MethodType.methodType(stringClass, stringClass, stringClass, stringClass, stringClass)
  )
  val spreadArrayMiddle = asSpreaderAtMethod.invoke(
    four,
    1,
    Array<String>::class.java,
    2
  ) as MethodHandle
  val varargsArray = joinArray.asVarargsCollector(Array<String>::class.java)
  val fixedArray = varargsArray.asFixedArity()
  val spreadInvoker = MethodHandles.spreadInvoker(staticJoin.type(), 1)
  val spreadVarargs = listOf(
    collectedArray.invokeWithArguments("collect", "a", "b", "c").toString(),
    collectedArrayAt.invokeWithArguments("collectAt", "x", "y").toString(),
    collectedArrayMiddle.invokeWithArguments("collectMid", "m", "n", "tail").toString(),
    spreadArray.invokeWithArguments("spread", arrayOf("d", "e", "f")).toString(),
    spreadArrayAt.invokeWithArguments("spreadAt", arrayOf("g", "h", "i")).toString(),
    spreadArrayMiddle.invokeWithArguments("spreadMid", arrayOf("o", "p"), "tail").toString(),
    varargsArray.isVarargsCollector.toString(),
    varargsArray.invokeWithArguments("var", "j", "k").toString(),
    fixedArray.isVarargsCollector.toString(),
    fixedArray.invokeWithArguments("fixed", arrayOf("l", "m")).toString(),
    spreadInvoker.invokeWithArguments(staticJoin, "spreadInvoker", arrayOf(Integer.valueOf(10))).toString()
  ).joinToString("~")
  val loopZero = lookup.findStatic(
    ownerClass,
    "loopZero",
    MethodType.methodType(intClass, intClass)
  )
  val loopBelow = lookup.findStatic(
    ownerClass,
    "loopBelow",
    MethodType.methodType(java.lang.Boolean.TYPE, intClass, intClass)
  )
  val loopIncrement = lookup.findStatic(
    ownerClass,
    "loopIncrement",
    MethodType.methodType(intClass, intClass, intClass)
  )
  val whileInt = whileLoopMethod.invoke(null, loopZero, loopBelow, loopIncrement) as MethodHandle
  val whileDefaultInt = whileLoopMethod.invoke(null, null, loopBelow, loopIncrement) as MethodHandle
  val loopSeed = lookup.findStatic(
    ownerClass,
    "loopSeed",
    MethodType.methodType(stringClass, stringClass, intClass)
  )
  val loopKeepAppending = lookup.findStatic(
    ownerClass,
    "loopKeepAppending",
    MethodType.methodType(java.lang.Boolean.TYPE, stringClass, stringClass, intClass)
  )
  val loopAppendDot = lookup.findStatic(
    ownerClass,
    "loopAppendDot",
    MethodType.methodType(stringClass, stringClass, stringClass, intClass)
  )
  val whileText = whileLoopMethod.invoke(null, loopSeed, loopKeepAppending, loopAppendDot) as MethodHandle
  val whileLoops = listOf(
    whileInt.invokeWithArguments(5).toString(),
    whileDefaultInt.invokeWithArguments(3).toString(),
    whileText.invokeWithArguments("x", 3).toString()
  ).joinToString("~")
  val doWhileInt = doWhileLoopMethod.invoke(null, loopZero, loopIncrement, loopBelow) as MethodHandle
  val doWhileDefaultInt = doWhileLoopMethod.invoke(null, null, loopIncrement, loopBelow) as MethodHandle
  val doWhileText = doWhileLoopMethod.invoke(null, loopSeed, loopAppendDot, loopKeepAppending) as MethodHandle
  val doWhileLoops = listOf(
    doWhileInt.invokeWithArguments(5).toString(),
    doWhileDefaultInt.invokeWithArguments(3).toString(),
    doWhileInt.invokeWithArguments(0).toString(),
    doWhileText.invokeWithArguments("x", 3).toString(),
    doWhileText.invokeWithArguments("x", 0).toString()
  ).joinToString("~")
  val loopCount = lookup.findStatic(
    ownerClass,
    "loopCount",
    MethodType.methodType(intClass, intClass)
  )
  val loopAddIndex = lookup.findStatic(
    ownerClass,
    "loopAddIndex",
    MethodType.methodType(intClass, intClass, intClass, intClass)
  )
  val countedInt = countedLoopMethod.invoke(null, loopCount, loopZero, loopAddIndex) as MethodHandle
  val countedDefaultInt = countedLoopMethod.invoke(null, loopCount, null, loopAddIndex) as MethodHandle
  val loopCountText = lookup.findStatic(
    ownerClass,
    "loopCountText",
    MethodType.methodType(intClass, stringClass, intClass)
  )
  val loopAppendIndex = lookup.findStatic(
    ownerClass,
    "loopAppendIndex",
    MethodType.methodType(stringClass, stringClass, intClass, stringClass, intClass)
  )
  val countedText = countedLoopMethod.invoke(null, loopCountText, loopSeed, loopAppendIndex) as MethodHandle
  val loopRangeStart = lookup.findStatic(
    ownerClass,
    "loopRangeStart",
    MethodType.methodType(intClass, stringClass, intClass, intClass)
  )
  val loopRangeEnd = lookup.findStatic(
    ownerClass,
    "loopRangeEnd",
    MethodType.methodType(intClass, stringClass, intClass, intClass)
  )
  val loopRangeSeed = lookup.findStatic(
    ownerClass,
    "loopRangeSeed",
    MethodType.methodType(stringClass, stringClass, intClass, intClass)
  )
  val loopRangeAppendIndex = lookup.findStatic(
    ownerClass,
    "loopRangeAppendIndex",
    MethodType.methodType(stringClass, stringClass, intClass, stringClass, intClass, intClass)
  )
  val countedRange = countedRangeLoopMethod.invoke(
    null,
    loopRangeStart,
    loopRangeEnd,
    loopRangeSeed,
    loopRangeAppendIndex
  ) as MethodHandle
  val countedLoops = listOf(
    countedInt.invokeWithArguments(5).toString(),
    countedDefaultInt.invokeWithArguments(4).toString(),
    countedInt.invokeWithArguments(0).toString(),
    countedText.invokeWithArguments("x", 3).toString(),
    countedRange.invokeWithArguments("x", 2, 5).toString(),
    countedRange.invokeWithArguments("x", 5, 2).toString()
  ).joinToString("~")
  val tryTarget = lookup.findStatic(
    ownerClass,
    "tryTarget",
    MethodType.methodType(stringClass, stringClass, intClass)
  )
  val tryFail = lookup.findStatic(
    ownerClass,
    "tryFail",
    MethodType.methodType(stringClass, stringClass, intClass)
  )
  val tryCleanup = lookup.findStatic(
    ownerClass,
    "tryCleanup",
    MethodType.methodType(stringClass, Throwable::class.java, stringClass, stringClass)
  )
  val tried = tryFinallyMethod.invoke(null, tryTarget, tryCleanup) as MethodHandle
  val tryValue = tried.invokeWithArguments("try", 7).toString()
  val tryNormalLog = MethodHandleOwner.cleanupLog
  val triedFail = tryFinallyMethod.invoke(null, tryFail, tryCleanup) as MethodHandle
  val tryFailure = try {
    triedFail.invokeWithArguments("bad", 8).toString()
  } catch (e: IllegalArgumentException) {
    (e.message ?: "missing") + "/" + MethodHandleOwner.cleanupLog
  }
  val tryVoidTarget = lookup.findStatic(
    ownerClass,
    "tryVoidTarget",
    MethodType.methodType(java.lang.Void.TYPE, stringClass)
  )
  val tryVoidCleanup = lookup.findStatic(
    ownerClass,
    "tryVoidCleanup",
    MethodType.methodType(java.lang.Void.TYPE, Throwable::class.java, stringClass)
  )
  val triedVoid = tryFinallyMethod.invoke(null, tryVoidTarget, tryVoidCleanup) as MethodHandle
  MethodHandleOwner.cleanupLog = "before-void"
  triedVoid.invokeWithArguments("void")
  val tryFinallyValues = listOf(
    tryValue,
    tryNormalLog,
    tryFailure,
    MethodHandleOwner.cleanupLog
  ).joinToString("~")
  val tableSwitchValues = listOf(
    tableSwitch.invokeWithArguments(0, "ts").toString(),
    tableSwitch.invokeWithArguments(1, "ts").toString(),
    tableSwitch.invokeWithArguments(-1, "ts").toString()
  ).joinToString("~")
  val combinators = listOf(
    identity.invokeWithArguments("id").toString(),
    constant.invokeWithArguments().toString(),
    boundStatic.invokeWithArguments(5).toString(),
    boundVirtual.invokeWithArguments("?").toString(),
    inserted.invokeWithArguments("ins").toString(),
    droppedIdentity.invokeWithArguments(2, java.lang.Long.valueOf(3), "drop").toString(),
    filteredArgument.invokeWithArguments("flt", 4).toString(),
    filteredReturn.invokeWithArguments("ret", 3).toString(),
    permuted.invokeWithArguments("a", "b", "c").toString(),
    guarded.invokeWithArguments("").toString(),
    guarded.invokeWithArguments("word").toString(),
    caught.invokeWithArguments(7).toString(),
    caught.invokeWithArguments(-2).toString()
  ).joinToString("|")
  val extraCombinators = listOf(
    exactInvoker.invokeWithArguments(staticJoin, "exact", 2).toString(),
    looseInvoker.invokeWithArguments(staticJoin, "loose", Integer.valueOf(3)).toString(),
    collected.invokeWithArguments("A", "B", 5, "C").toString(),
    folded.invokeWithArguments("left", "right").toString(),
    explicitDoubleToLong.invokeWithArguments(java.lang.Double.valueOf(12.75)).toString(),
    stringBefore,
    strings[1],
    intBefore,
    ints[0].toString(),
    thrown
  ).joinToString("|")
  val publicOverlayCombinators = listOf(
    zeroInt.invokeWithArguments().toString(),
    (zeroString.invokeWithArguments() == null).toString(),
    (emptyString.invokeWithArguments(4, "empty") == null).toString(),
    arrayLength.invokeWithArguments(arrayOf("a", "b", "c", "d")).toString(),
    constructed.size.toString() + ":" + (constructed[0] == null).toString(),
    (droppedReturn.invokeWithArguments("drop", 5) == null).toString(),
    matchedDrop.invokeWithArguments(2, "matched").toString(),
    foldedAtOne.invokeWithArguments("fold", 6).toString(),
    spreadVarargs,
    whileLoops,
    doWhileLoops,
    countedLoops,
    tryFinallyValues,
    tableSwitchValues
  ).joinToString("|")
  val combinatorTypes = listOf(
    boundStatic,
    droppedIdentity,
    filteredArgument,
    guarded,
    caught
  ).joinToString("|") { it.type().toMethodDescriptorString() }
  val extraCombinatorTypes = listOf(
    exactInvoker,
    collected,
    folded,
    explicitDoubleToLong,
    stringGetter,
    intSetter,
    throwing
  ).joinToString("|") { it.type().toMethodDescriptorString() }
  val publicOverlayCombinatorTypes = listOf(
    zeroInt,
    zeroString,
    emptyString,
    arrayLength,
    arrayConstructor,
    droppedReturn,
    matchedDrop,
    foldedAtOne,
    collectedArray,
    collectedArrayAt,
    collectedArrayMiddle,
    spreadArray,
    spreadArrayAt,
    spreadArrayMiddle,
    spreadInvoker,
    whileInt,
    whileDefaultInt,
    whileText,
    doWhileInt,
    doWhileDefaultInt,
    doWhileText,
    countedInt,
    countedDefaultInt,
    countedText,
    countedRange,
    tableSwitch,
    tried,
    triedVoid
  ).joinToString("|") { it.type().toMethodDescriptorString() }

  return listOf(
    directStatic,
    adaptedStatic,
    before + ">" + after,
    appended,
    widenedReturn,
    boxedReturn,
    staticJoin.type().toMethodDescriptorString(),
    append.type().toMethodDescriptorString(),
    combinators,
    combinatorTypes,
    extraCombinators,
    publicOverlayCombinators,
    unreflectValues,
    reflectAsValues,
    privateLookupValues,
    extraCombinatorTypes,
    publicOverlayCombinatorTypes
  ).joinToString("|")
}
