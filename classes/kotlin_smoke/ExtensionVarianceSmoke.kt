typealias ScoreMap = MutableMap<String, Int>
typealias PairList<T> = List<Pair<String, T>>

class VarianceBox<out T : CharSequence>(val value: T) {
  fun describe(): String = value.toString() + ":" + value.length
}

class Sink<in T> {
  private val seen = mutableListOf<String>()

  fun put(value: T) {
    seen += value.toString()
  }

  fun join(): String = seen.joinToString(",")
}

fun ScoreMap.bump(key: String, delta: Int = 1): Int {
  val next = (this[key] ?: 0) + delta
  this[key] = next
  return next
}

val <T : CharSequence> List<T>.firstSize: Int
  get() = first().length

fun <T> Iterable<T>.tagged(prefix: String): List<String>
    where T : CharSequence, T : Comparable<T> =
  mapIndexed { index, value -> "$prefix$index:$value:${value.length}" }

fun projectedSizes(values: MutableList<out CharSequence>): String =
  values.joinToString(",") { it.length.toString() }

fun consumeProjected(boxes: List<VarianceBox<CharSequence>>, sink: Sink<String>): String {
  sink.put(boxes.joinToString("") { it.value })
  return boxes.joinToString("|") { it.describe() }
}

fun starKeys(values: Map<String, *>): String =
  values.entries.sortedBy { it.key }.joinToString(",") { entry ->
    entry.key + ":" + (entry.value?.javaClass?.simpleName ?: "null")
  }

fun extensionVarianceSummary(): String {
  val scores: ScoreMap = linkedMapOf("a" to 1)
  val bumped = scores.bump("a", 4)
  val defaultBump = scores.bump("b")
  val pairs: PairList<Int> = listOf("x" to 2, "y" to 3)
  val first = listOf("abc", "d").firstSize
  val labels = listOf("b", "aa").tagged("p").joinToString(",")
  val box = VarianceBox("kt")
  val widened: VarianceBox<CharSequence> = box
  val sink: Sink<CharSequence> = Sink()
  val stringSink: Sink<String> = sink
  val projected = projectedSizes(mutableListOf("a", StringBuilder("bb")))
  val consumed = consumeProjected(listOf(widened, VarianceBox(StringBuilder("xy"))), stringSink)
  val star = starKeys(mapOf("n" to 1, "s" to "q", "z" to null))
  return bumped.toString() + "/" + defaultBump + "/" +
    scores["a"] + ":" + scores["b"] + "|" +
    pairs.sumOf { it.second } + "|" +
    first + "|" +
    labels + "|" +
    widened.describe() + "|" +
    sink.join() + "|" +
    projected + "|" +
    consumed + "|" +
    star
}
