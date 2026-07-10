tailrec fun foldDigits(value: Int, acc: Int = 0): Int =
  if (value == 0) acc else foldDigits(value / 10, acc + value % 10)

fun labeledGrid(limit: Int): String {
  val hits = mutableListOf<String>()
  var finallyCount = 0
  outer@ for (x in 0..limit) {
    try {
      for (y in 0..limit) {
        val product = x * y
        when {
          product == 0 -> continue
          product % 5 == 0 -> continue@outer
          product > 10 -> break@outer
          product % 2 == 0 -> hits += "$x:$y:$product"
        }
      }
    } finally {
      finallyCount += x
    }
  }
  return hits.joinToString(",") + "#$finallyCount"
}

fun localDefaultAndVararg(seed: String): String {
  fun encode(prefix: String = "p", vararg values: Int): String =
    prefix + values.joinToString("") { value -> (value + seed.length).toString(16) }

  val base = intArrayOf(1, 3, 5)
  val spread = encode(values = base)
  val named = encode(prefix = "q", values = intArrayOf(2, 4))
  return spread + "|" + named
}

fun resultFlow(values: List<String>): String {
  val mapped = values.mapIndexed { index, text ->
    runCatching {
      val parsed = text.toInt()
      check(parsed >= 0) { "neg$index" }
      parsed + index
    }.fold(
      onSuccess = { value -> "ok$value" },
      onFailure = { throwable -> throwable.message ?: throwable::class.java.simpleName }
    )
  }
  return mapped.joinToString(":")
}

fun labelReturnSummary(): String {
  val found = run search@{
    listOf("a", "bb", "ccc").forEachIndexed { index, text ->
      if (text.length + index > 3) return@search "$index:$text"
    }
    "none"
  }
  return found
}

fun doWhileWhenSummary(values: List<Int>): String {
  val events = mutableListOf<String>()
  var index = 0
  do {
    try {
      val value = values[index++]
      events += when (value) {
        in Int.MIN_VALUE..-1 -> "neg$value"
        0 -> "zero"
        1, 2 -> "small$value"
        else -> if (value % 2 == 0) "even$value" else throw IllegalStateException("odd$value")
      }
    } catch (e: IllegalStateException) {
      events += "catch:${e.message}"
    } finally {
      events += "finally$index"
    }
  } while (index < values.size)
  return events.joinToString(",")
}

fun controlFlowSummary(): String =
  foldDigits(9070).toString() + "|" +
    labeledGrid(5) + "|" +
    localDefaultAndVararg("kt") + "|" +
    resultFlow(listOf("1", "-2", "x", "4")) + "|" +
    labelReturnSummary() + "|" +
    doWhileWhenSummary(listOf(0, 2, 3, 4, -1))
