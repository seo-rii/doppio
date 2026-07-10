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

object ScalaMethodHandlesSmoke {
  def exercise(): String = {
    val lookup = MethodHandles.lookup()
    val intClass = java.lang.Integer.TYPE
    val stringClass = classOf[String]

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

    List(
      objectMax.invokeWithArguments(Integer.valueOf(5), Integer.valueOf(8)).toString,
      bump.invokeWithArguments(box, Integer.valueOf(3)).toString,
      boundSubstring.invokeWithArguments(Integer.valueOf(1), Integer.valueOf(4)).toString,
      insertedSubstring.invokeWithArguments("scala", Integer.valueOf(5)).toString,
      droppedConstant.invokeWithArguments("ignored").toString,
      filteredReturn.invokeWithArguments("mh").toString,
      guarded.invokeWithArguments("").toString + "/" + guarded.invokeWithArguments("word").toString,
      parentSpecial.invokeWithArguments(specialReceiver, "ss").toString,
      defaultSpecial.invokeWithArguments(specialReceiver, "ss").toString
    ).mkString("mh:", ":", "")
  }
}
