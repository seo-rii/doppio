sealed class SmokeResult {
  data class Ok(val value: Int) : SmokeResult()
  object Missing : SmokeResult()
}

enum class SmokeMode { FAST, SLOW }

operator fun Pair<Int, Int>.plus(other: Pair<Int, Int>): Pair<Int, Int> =
  Pair(first + other.first, second + other.second)

object SmokeRegistry {
  private val values = linkedMapOf("one" to 1, "two" to 2)
  fun total(): Int = values.values.sum()
}

class SmokeFactory private constructor(private val prefix: String) {
  companion object {
    fun create(prefix: String = "mode"): SmokeFactory = SmokeFactory(prefix)
  }

  fun describe(mode: SmokeMode): String = "$prefix-${mode.name}"
}

fun structuredSummary(): String {
  val (left, right) = listOf(Pair(1, 2), Pair(3, 4))
    .reduce { acc, pair -> acc + pair }
  return "$left,$right:${left + right}"
}

fun advancedSummary(): String {
  val result: SmokeResult = SmokeResult.Ok(SmokeRegistry.total())
  val score = when (result) {
    is SmokeResult.Ok -> result.value
    SmokeResult.Missing -> -1
  }
  val lengths = listOf("a", "bb", "ccc").map { it.length }.filter { it > 1 }.joinToString(",")
  val caught = try {
    throw IllegalStateException("caught")
  } catch (e: IllegalStateException) {
    e.message ?: "missing"
  }
  return SmokeFactory.create().describe(SmokeMode.FAST) + ":" +
    score + ":" +
    lengths + ":" +
    caught + ":" +
    structuredSummary()
}
