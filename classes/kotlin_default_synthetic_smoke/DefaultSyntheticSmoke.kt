class DefaultBox @JvmOverloads constructor(
  val name: String = "box",
  val size: Int = 2
) {
  @JvmOverloads
  fun render(prefix: String = "p", suffix: String = "!"): String {
    return "$prefix-$name:${size * 3}$suffix"
  }
}

interface DefaultFormatter {
  fun decorate(value: String): String = "[$value]"

  fun label(value: String = "core"): String = decorate(value.uppercase())
}

class DefaultFormatterImpl : DefaultFormatter

data class DefaultConfig(
  val name: String = "cfg",
  val count: Int = 1,
  val flags: List<String> = listOf("a")
) {
  fun bump(delta: Int = 2): DefaultConfig {
    return copy(count = count + delta, flags = flags + "b")
  }
}

fun defaultSyntheticSummary(): String {
  val box = DefaultBox()
  val named = DefaultBox("wide").render(suffix = "?")
  val formatter: DefaultFormatter = DefaultFormatterImpl()
  val copied = DefaultConfig().bump().copy(name = "cfg2")

  val boxClass = DefaultBox::class.java
  val intClass = java.lang.Integer.TYPE
  val reflectedConstructors = listOf(
    boxClass.getConstructor().newInstance().render(),
    boxClass.getConstructor(String::class.java).newInstance("named").render(),
    boxClass.getConstructor(String::class.java, intClass).newInstance("full", 3).render()
  ).joinToString("|")

  val reflectTarget = DefaultBox("r", 1)
  val reflectedMethods = listOf(
    boxClass.getMethod("render").invoke(reflectTarget),
    boxClass.getMethod("render", String::class.java).invoke(reflectTarget, "q"),
    boxClass.getMethod("render", String::class.java, String::class.java).invoke(reflectTarget, "q", "?")
  ).joinToString("|")

  return box.render() + ":" +
      named + ":" +
      formatter.label() + ":" +
      copied.name + copied.count + copied.flags.joinToString("") + ":" +
      reflectedConstructors + ":" +
      reflectedMethods + ":" +
      qualifiedSuperSummary()
}
