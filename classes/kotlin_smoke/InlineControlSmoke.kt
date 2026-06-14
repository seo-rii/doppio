inline fun visitInts(values: IntArray, visitor: (Int) -> Unit) {
  for (value in values) {
    visitor(value)
  }
}

inline fun <T> inlineAround(trace: MutableList<String>, block: () -> T): T {
  trace += "enter"
  try {
    return block()
  } finally {
    trace += "exit"
  }
}

inline fun crossCompute(seed: Int, crossinline block: (Int) -> String): String {
  var result = "unset"
  val runner = Runnable {
    result = block(seed + 1)
  }
  runner.run()
  return result
}

inline fun retainAndApply(
  seed: Int,
  noinline retained: (Int) -> Int,
  transform: (Int) -> Int
): Int {
  val callbacks = arrayOf(retained)
  return callbacks[0](seed) + transform(seed + 1)
}

fun nonLocalInlineReturn(): String {
  visitInts(intArrayOf(1, 2, 3, 4)) { value ->
    if (value == 3) {
      return "stop$value"
    }
  }
  return "done"
}

fun inlineControlSummary(): String {
  val trace = mutableListOf<String>()
  val around = inlineAround(trace) {
    trace += "body"
    "ok"
  }
  val cross = crossCompute(4) { value ->
    "c${value * 2}"
  }
  val retained = retainAndApply(5, { value -> value * value }) { value ->
    value + 3
  }
  return trace.joinToString(">") + ":" +
      around + ":" +
      cross + ":" +
      retained + ":" +
      nonLocalInlineReturn()
}
