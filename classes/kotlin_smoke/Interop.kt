fun nullableSummary(input: String?): String {
  val normalized = input?.trim()?.takeIf { it.isNotEmpty() } ?: "fallback"
  return normalized.uppercase()
}

inline fun inlineSmoke(seed: Int, op: (Int) -> Int): Int = op(seed) + 1

class OuterSmoke(private val seed: Int) {
  class Nested(private val label: String) {
    fun size(): Int = label.length
  }

  inner class Inner(private val delta: Int) {
    fun total(): Int = seed + delta
  }
}

fun localSummary(): String {
  class LocalCounter(private val values: List<Int>) {
    fun positive(): Int = values.count { it > 0 }
  }

  val runnable = Runnable { }
  val comparator = java.util.Comparator<String> { a, b -> a.length - b.length }
  val anonymous = object {
    fun size(): Int = "anon".length
  }
  val delegated by lazy { "lazy" }
  val sorted = listOf("bbb", "a", "cc").sortedWith(comparator).joinToString("")
  return nullableSummary("  ok ") + ":" + nullableSummary(null) + ":" +
    OuterSmoke.Nested("abc").size() + ":" + OuterSmoke(4).Inner(5).total() + ":" +
    LocalCounter(listOf(-1, 0, 2, 3)).positive() + ":" +
    runnable.javaClass.interfaces.size + ":" + sorted + ":" + anonymous.size() + ":" +
    delegated.length + ":" + inlineSmoke(3) { it * 2 }
}
