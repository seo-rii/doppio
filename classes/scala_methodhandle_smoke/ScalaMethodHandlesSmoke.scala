import java.lang.invoke.MethodHandle
import java.lang.invoke.MethodHandles
import java.lang.invoke.MethodType

final class ScalaMhBox(val label: String, private val base: Int) {
  def bump(delta: Int): String = s"$label${base + delta}"
}

class ScalaSpecialParent {
  def dispatch(suffix: String): String = s"parent:$suffix"
}

trait ScalaSpecialDefault {
  def defaultJoin(suffix: String): String = s"default:$suffix"
}

final class ScalaSpecialChild extends ScalaSpecialParent with ScalaSpecialDefault {
  override def dispatch(suffix: String): String = s"child:$suffix"
}

final class ScalaMhCombinatorHost {
  def join(text: String, value: Int): String = s"$text:$value"

  def joinArray(prefix: String, values: Array[String]): String =
    prefix + values.mkString(":", ",", "")

  def mixArray(prefix: String, values: Array[String], suffix: String): String =
    joinArray(prefix, values) + ":" + suffix

  def four(first: String, second: String, third: String, fourth: String): String =
    s"$first/$second/$third/$fourth"

  def foldAtTarget(first: String, folded: String, value: Int): String =
    s"$first:$folded:$value"

  def foldAtCombiner(value: Int): String = s"n$value"
}

object ScalaMethodHandlesSmoke {
  def exercise(): String = {
    val lookup = MethodHandles.lookup()
    val intClass = java.lang.Integer.TYPE
    val stringClass = classOf[String]
    val stringArrayClass = classOf[Array[String]]

    val max = lookup.findStatic(
      classOf[java.lang.Math],
      "max",
      MethodType.methodType(intClass, intClass, intClass)
    )
    val objectMax = max.asType(
      MethodType.methodType(classOf[Object], classOf[Object], classOf[Object])
    )

    val ctor = lookup.findConstructor(
      classOf[ScalaMhBox],
      MethodType.methodType(java.lang.Void.TYPE, stringClass, intClass)
    )
    val box = ctor.invokeWithArguments("b", Integer.valueOf(4)).asInstanceOf[ScalaMhBox]
    val bump = lookup.findVirtual(
      classOf[ScalaMhBox],
      "bump",
      MethodType.methodType(stringClass, intClass)
    )

    val substring = lookup.findVirtual(
      stringClass,
      "substring",
      MethodType.methodType(stringClass, intClass, intClass)
    )
    val boundSubstring = substring.bindTo("scala")
    val insertedSubstring = MethodHandles.insertArguments(substring, 1, Integer.valueOf(2))

    val constant = MethodHandles.constant(stringClass, "const")
    val droppedConstant = MethodHandles.dropArguments(constant, 0, stringClass)
    val identity = MethodHandles.identity(stringClass)
    val upper = lookup.findVirtual(
      stringClass,
      "toUpperCase",
      MethodType.methodType(stringClass)
    )
    val filteredReturn = MethodHandles.filterReturnValue(identity, upper)

    val isEmpty = lookup.findVirtual(
      stringClass,
      "isEmpty",
      MethodType.methodType(java.lang.Boolean.TYPE)
    )
    val emptyValue = MethodHandles.dropArguments(
      MethodHandles.constant(stringClass, "empty"),
      0,
      stringClass
    )
    val filledValue = MethodHandles.dropArguments(
      MethodHandles.constant(stringClass, "filled"),
      0,
      stringClass
    )
    val guarded = MethodHandles.guardWithTest(isEmpty, emptyValue, filledValue)
    val specialReceiver = new ScalaSpecialChild
    val privateLookupMethod = classOf[MethodHandles].getMethod(
      "privateLookupIn",
      classOf[Class[_]],
      classOf[MethodHandles.Lookup]
    )
    val specialLookup = privateLookupMethod.invoke(
      null,
      classOf[ScalaSpecialChild],
      lookup
    ).asInstanceOf[MethodHandles.Lookup]
    val parentSpecial = specialLookup.unreflectSpecial(
      classOf[ScalaSpecialParent].getDeclaredMethod("dispatch", stringClass),
      classOf[ScalaSpecialChild]
    )
    val defaultSpecial = specialLookup.unreflectSpecial(
      classOf[ScalaSpecialDefault].getDeclaredMethod("defaultJoin", stringClass),
      classOf[ScalaSpecialChild]
    )

    val methodHandleClass = classOf[MethodHandle]
    val zeroMethod = classOf[MethodHandles].getMethod("zero", classOf[Class[_]])
    val emptyMethod = classOf[MethodHandles].getMethod("empty", classOf[MethodType])
    val arrayLengthMethod = classOf[MethodHandles].getMethod("arrayLength", classOf[Class[_]])
    val arrayConstructorMethod = classOf[MethodHandles].getMethod("arrayConstructor", classOf[Class[_]])
    val dropArgumentsToMatchMethod = classOf[MethodHandles].getMethod(
      "dropArgumentsToMatch",
      methodHandleClass,
      intClass,
      classOf[java.util.List[_]],
      intClass
    )
    val dropReturnMethod = classOf[MethodHandles].getMethod("dropReturn", methodHandleClass)
    val foldArgumentsAtMethod = classOf[MethodHandles].getMethod(
      "foldArguments",
      methodHandleClass,
      intClass,
      methodHandleClass
    )
    val asCollectorAtMethod = methodHandleClass.getMethod("asCollector", intClass, classOf[Class[_]], intClass)
    val asSpreaderAtMethod = methodHandleClass.getMethod("asSpreader", intClass, classOf[Class[_]], intClass)

    val host = new ScalaMhCombinatorHost
    val hostClass = classOf[ScalaMhCombinatorHost]
    val join = lookup.findVirtual(
      hostClass,
      "join",
      MethodType.methodType(stringClass, stringClass, intClass)
    ).bindTo(host)
    val joinArray = lookup.findVirtual(
      hostClass,
      "joinArray",
      MethodType.methodType(stringClass, stringClass, stringArrayClass)
    ).bindTo(host)
    val mixArray = lookup.findVirtual(
      hostClass,
      "mixArray",
      MethodType.methodType(stringClass, stringClass, stringArrayClass, stringClass)
    ).bindTo(host)
    val four = lookup.findVirtual(
      hostClass,
      "four",
      MethodType.methodType(stringClass, stringClass, stringClass, stringClass, stringClass)
    ).bindTo(host)
    val foldAtTarget = lookup.findVirtual(
      hostClass,
      "foldAtTarget",
      MethodType.methodType(stringClass, stringClass, stringClass, intClass)
    ).bindTo(host)
    val foldAtCombiner = lookup.findVirtual(
      hostClass,
      "foldAtCombiner",
      MethodType.methodType(stringClass, intClass)
    ).bindTo(host)

    val zeroInt = zeroMethod.invoke(null, intClass).asInstanceOf[MethodHandle]
    val zeroString = zeroMethod.invoke(null, stringClass).asInstanceOf[MethodHandle]
    val emptyString = emptyMethod.invoke(
      null,
      MethodType.methodType(stringClass, intClass, stringClass)
    ).asInstanceOf[MethodHandle]
    val arrayLength = arrayLengthMethod.invoke(null, stringArrayClass).asInstanceOf[MethodHandle]
    val arrayConstructor = arrayConstructorMethod.invoke(null, stringArrayClass).asInstanceOf[MethodHandle]
    val matchedDrop = dropArgumentsToMatchMethod.invoke(
      null,
      MethodHandles.identity(stringClass),
      Integer.valueOf(0),
      java.util.Arrays.asList[Class[_]](intClass, stringClass),
      Integer.valueOf(1)
    ).asInstanceOf[MethodHandle]
    val droppedReturn = dropReturnMethod.invoke(null, join).asInstanceOf[MethodHandle]
    val foldedAtOne = foldArgumentsAtMethod.invoke(
      null,
      foldAtTarget,
      Integer.valueOf(1),
      foldAtCombiner
    ).asInstanceOf[MethodHandle]
    val constructed = arrayConstructor.invokeWithArguments(Integer.valueOf(2)).asInstanceOf[Array[String]]
    droppedReturn.invokeWithArguments("drop", Integer.valueOf(5))
    val overlayValues = List(
      zeroInt.invokeWithArguments().toString,
      (zeroString.invokeWithArguments() == null).toString,
      (emptyString.invokeWithArguments(Integer.valueOf(4), "empty") == null).toString,
      arrayLength.invokeWithArguments(
        java.util.Collections.singletonList(Array("a", "b", "c").asInstanceOf[Object])
      ).toString,
      constructed.length.toString + ":" + (constructed(0) == null).toString,
      matchedDrop.invokeWithArguments(Integer.valueOf(2), "matched").toString,
      "dropReturn",
      foldedAtOne.invokeWithArguments("fold", Integer.valueOf(6)).toString
    ).mkString("/")

    val collectedArray = joinArray.asCollector(stringArrayClass, 2)
    val collectedArrayAt = asCollectorAtMethod.invoke(
      joinArray,
      Integer.valueOf(1),
      stringArrayClass,
      Integer.valueOf(2)
    ).asInstanceOf[MethodHandle]
    val collectedArrayMiddle = asCollectorAtMethod.invoke(
      mixArray,
      Integer.valueOf(1),
      stringArrayClass,
      Integer.valueOf(2)
    ).asInstanceOf[MethodHandle]
    val spreadArray = collectedArray.asSpreader(stringArrayClass, 2)
    val spreadArrayAt = asSpreaderAtMethod.invoke(
      collectedArray,
      Integer.valueOf(1),
      stringArrayClass,
      Integer.valueOf(2)
    ).asInstanceOf[MethodHandle]
    val spreadArrayMiddle = asSpreaderAtMethod.invoke(
      four,
      Integer.valueOf(1),
      stringArrayClass,
      Integer.valueOf(2)
    ).asInstanceOf[MethodHandle]
    val varargsArray = joinArray.asVarargsCollector(stringArrayClass)
    val fixedArray = varargsArray.asFixedArity()
    val adapterValues = List(
      collectedArray.invokeWithArguments("collect", "a", "b").toString,
      collectedArrayAt.invokeWithArguments("collectAt", "x", "y").toString,
      collectedArrayMiddle.invokeWithArguments("collectMid", "m", "n", "tail").toString,
      spreadArray.invokeWithArguments(
        java.util.Arrays.asList[Object]("spread", Array("d", "e").asInstanceOf[Object])
      ).toString,
      spreadArrayAt.invokeWithArguments(
        java.util.Arrays.asList[Object]("spreadAt", Array("g", "h").asInstanceOf[Object])
      ).toString,
      spreadArrayMiddle.invokeWithArguments(
        java.util.Arrays.asList[Object]("spreadMid", Array("o", "p").asInstanceOf[Object], "tail")
      ).toString,
      varargsArray.isVarargsCollector.toString,
      varargsArray.invokeWithArguments("var", "j", "k").toString,
      fixedArray.isVarargsCollector.toString,
      fixedArray.invokeWithArguments(
        java.util.Arrays.asList[Object]("fixed", Array("l", "m").asInstanceOf[Object])
      ).toString
    ).mkString("/")

    List(
      objectMax.invokeWithArguments(Integer.valueOf(5), Integer.valueOf(8)).toString,
      bump.invokeWithArguments(box, Integer.valueOf(3)).toString,
      boundSubstring.invokeWithArguments(Integer.valueOf(1), Integer.valueOf(4)).toString,
      insertedSubstring.invokeWithArguments("scala", Integer.valueOf(5)).toString,
      droppedConstant.invokeWithArguments("ignored").toString,
      filteredReturn.invokeWithArguments("mh").toString,
      guarded.invokeWithArguments("").toString + "/" + guarded.invokeWithArguments("word").toString,
      parentSpecial.invokeWithArguments(specialReceiver, "ss").toString,
      defaultSpecial.invokeWithArguments(specialReceiver, "ss").toString,
      overlayValues,
      adapterValues
    ).mkString("mh:", ":", "")
  }
}
