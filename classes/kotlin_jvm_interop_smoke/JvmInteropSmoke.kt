@file:JvmName("JvmInteropSmokeFile")

import java.lang.reflect.Modifier

class JvmInteropOwner private constructor(val label: String) {
  companion object {
    const val CONST_TAG: String = "const"

    @JvmField
    val FIELD_TAG: String = "field"

    @JvmStatic
    fun create(label: String): JvmInteropOwner = JvmInteropOwner(label)

    @JvmStatic
    @Throws(IllegalArgumentException::class)
    fun checked(value: Int): String {
      if (value < 0) {
        throw IllegalArgumentException("bad$value")
      }
      return "ok$value"
    }
  }

  @Volatile
  var marker: Int = 1

  @Synchronized
  fun bump(delta: Int): Int {
    marker += delta
    return marker
  }

  @JvmSynthetic
  fun syntheticLabel(prefix: String): String = "$prefix$label"
}

object JvmInteropSingleton {
  @JvmField
  val objectField: String = "obj"

  @JvmStatic
  fun objectCall(value: Int): String = "o${value + 1}"
}

@JvmName("renamedTop")
fun topJvmName(value: String): String = "top-${value.length}"

fun jvmInteropSummary(): String {
  val owner = JvmInteropOwner.create("kt")
  val ownerClass = JvmInteropOwner::class.java
  val staticCreate = ownerClass.getDeclaredMethod("create", String::class.java)
  val staticChecked = ownerClass.getDeclaredMethod("checked", java.lang.Integer.TYPE)
  val fieldTag = ownerClass.getDeclaredField("FIELD_TAG")
  val constTag = ownerClass.getDeclaredField("CONST_TAG")
  val markerField = ownerClass.getDeclaredField("marker")
  val bump = ownerClass.getDeclaredMethod("bump", java.lang.Integer.TYPE)
  val fileClass = Class.forName("JvmInteropSmokeFile")
  val renamedTop = fileClass.getDeclaredMethod("renamedTop", String::class.java)
  val singletonClass = JvmInteropSingleton::class.java
  val objectCall = singletonClass.getDeclaredMethod("objectCall", java.lang.Integer.TYPE)
  val objectField = singletonClass.getDeclaredField("objectField")
  val syntheticLabel = ownerClass.getDeclaredMethod("syntheticLabel", String::class.java)

  val created = staticCreate.invoke(null, "java") as JvmInteropOwner
  val checked = staticChecked.invoke(null, 7).toString()
  val exceptionTypes = staticChecked.exceptionTypes.joinToString("|") { type ->
    type.simpleName
  }
  val flags = listOf(
    Modifier.isStatic(staticCreate.modifiers),
    Modifier.isStatic(fieldTag.modifiers),
    Modifier.isStatic(constTag.modifiers),
    Modifier.isVolatile(markerField.modifiers),
    Modifier.isSynchronized(bump.modifiers),
    Modifier.isStatic(renamedTop.modifiers),
    Modifier.isStatic(objectCall.modifiers),
    Modifier.isStatic(objectField.modifiers),
    syntheticLabel.isSynthetic
  ).joinToString("") { flag ->
    if (flag) "1" else "0"
  }

  return owner.label + ":" +
      created.label + ":" +
      checked + ":" +
      exceptionTypes + ":" +
      fieldTag.get(null) + constTag.get(null) + ":" +
      renamedTop.invoke(null, "abc") + ":" +
      objectCall.invoke(null, 4) + objectField.get(null) + ":" +
      owner.bump(4) + ":" +
      syntheticLabel.invoke(owner, "syn-") + ":" +
      flags
}
