import java.lang.invoke.MethodHandles
import java.lang.invoke.MethodType

class MethodHandleOwner(@JvmField var text: String) {
  fun append(suffix: String): String = text + suffix

  fun lengthPlus(delta: Int): Int = text.length + delta

  companion object {
    @JvmStatic
    fun join(prefix: String, value: Int): String = prefix + (value + 1)
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

  return listOf(
    directStatic,
    adaptedStatic,
    before + ">" + after,
    appended,
    widenedReturn,
    boxedReturn,
    staticJoin.type().toMethodDescriptorString(),
    append.type().toMethodDescriptorString()
  ).joinToString("|")
}
