interface JvmDefaultRoot {
  val prefix: String
    get() = "root"

  fun render(value: String = "kt"): String = "$prefix:$value"
}

interface JvmDefaultUpper : JvmDefaultRoot {
  override val prefix: String
    get() = "upper"

  override fun render(value: String): String = super.render(value).uppercase()
}

interface JvmDefaultSuffix : JvmDefaultRoot {
  override fun render(value: String): String = super.render(value) + "!"
}

class JvmDefaultUpperOnly : JvmDefaultUpper

class JvmDefaultDiamond : JvmDefaultUpper, JvmDefaultSuffix {
  override val prefix: String
    get() = "diamond"

  override fun render(value: String): String {
    return super<JvmDefaultUpper>.render(value) + "|" +
        super<JvmDefaultSuffix>.render(value)
  }
}

class JvmDefaultDelegating(private val delegate: JvmDefaultRoot) : JvmDefaultRoot by delegate

fun jvmDefaultSummary(): String {
  val upper: JvmDefaultRoot = JvmDefaultUpperOnly()
  val diamond: JvmDefaultRoot = JvmDefaultDiamond()
  val delegated: JvmDefaultRoot = JvmDefaultDelegating(upper)
  val rootClass = JvmDefaultRoot::class.java
  val renderMethod = rootClass.getDeclaredMethod("render", String::class.java)
  val prefixMethod = rootClass.getDeclaredMethod("getPrefix")
  val hasDefaultArgumentBridge = rootClass.declaredMethods.any { it.name == "render\$default" }

  return listOf(
    upper.render(),
    upper.prefix,
    diamond.render("x"),
    delegated.render("d"),
    renderMethod.isDefault,
    prefixMethod.isDefault,
    hasDefaultArgumentBridge
  ).joinToString(":")
}
