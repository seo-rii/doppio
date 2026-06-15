import java.lang.invoke.MethodHandles
import java.lang.invoke.MethodType

class MethodHandleOwner(@JvmField var text: String) {
  fun append(suffix: String): String = text + suffix

  fun lengthPlus(delta: Int): Int = text.length + delta

  companion object {
    @JvmStatic
    fun join(prefix: String, value: Int): String = prefix + (value + 1)

    @JvmStatic
    fun doubleValue(value: Int): Int = value * 2

    @JvmStatic
    fun bracket(value: String): String = "[$value]"

    @JvmStatic
    fun triple(first: String, second: String, third: String): String = "$first/$second/$third"

    @JvmStatic
    fun longLabel(value: Long): String = "long:$value"

    @JvmStatic
    fun foldPrefix(first: String, second: String): String = "$first:$second"

    @JvmStatic
    fun foldTarget(prefix: String, first: String, second: String): String = "$prefix|$first|$second"

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
    extraCombinatorTypes
  ).joinToString("|")
}
