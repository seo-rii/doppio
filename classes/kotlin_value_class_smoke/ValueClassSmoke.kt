interface ValueDescriber {
  fun describe(): String
}

@JvmInline
value class SmokeValue(val raw: Int) : Comparable<SmokeValue>, ValueDescriber {
  val doubled: Int
    get() = raw * 2

  override fun describe(): String = "v$raw"

  operator fun plus(other: SmokeValue): SmokeValue = SmokeValue(raw + other.raw)

  override fun compareTo(other: SmokeValue): Int = raw - other.raw

  override fun toString(): String = "box$raw"
}

fun valueInterface(value: ValueDescriber): String = value.describe()

fun valueNullable(value: SmokeValue?): String = value?.describe() ?: "none"

fun valueClassSummary(): String {
  val first = SmokeValue(4)
  val second = SmokeValue(7)
  val sorted = listOf(second, first, SmokeValue(1)).sorted().joinToString(",") {
    it.describe()
  }
  val boxed: Any = first
  val nullable = valueNullable(null) + "|" + valueNullable(first + second)
  val lookup = mapOf(first to "a", second to "b")[SmokeValue(4)] ?: "missing"
  return sorted + ":" +
      (first + second).doubled + ":" +
      boxed.toString() + ":" +
      valueInterface(second) + ":" +
      nullable + ":" +
      lookup
}
