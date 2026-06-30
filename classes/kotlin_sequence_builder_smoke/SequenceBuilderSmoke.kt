fun sequenceBuilderSummary(): String {
  val events = mutableListOf<String>()
  val seq = sequence {
    events += "start"
    yield(1)
    events += "after1"
    yieldAll(listOf(2, 3))
    events += "afterAll"
    for (i in 4..5) {
      yield(i * 2)
    }
    events += "done"
  }
  val firstTwo = seq.take(2).joinToString(":")
  val eventAfterTake = events.joinToString(">")
  val rest = seq.drop(2).take(4).mapIndexed { index, value ->
    index.toString() + "=" + value
  }.joinToString(",")
  val eventAfterRest = events.joinToString(">")
  val iteratorValues = iterator {
    yield("a")
    yieldAll(listOf("b", "c").iterator())
    yield("d")
  }.asSequence().joinToString("")
  val once = sequenceOf(7, 8, 9).constrainOnce()
  val onceFirst = once.joinToString("")
  val onceSecond = try {
    once.joinToString("")
  } catch (e: IllegalStateException) {
    e::class.java.simpleName
  }
  val generated = generateSequence(1) {
    if (it < 20) it * 2 else null
  }.take(5).windowed(2, 1) { it[0] + it[1] }.joinToString(",")
  val runningEvents = mutableListOf<String>()
  val observed = sequenceOf("x", "yy", "zzz")
    .onEach { runningEvents += it }
    .filter { it.length > 1 }
    .map { it.length }
    .zipWithNext { a, b -> a * 10 + b }
    .single()
  return firstTwo + "|" +
    eventAfterTake + "|" +
    rest + "|" +
    eventAfterRest + "|" +
    iteratorValues + "|" +
    onceFirst + "/" + onceSecond + "|" +
    generated + "|" +
    runningEvents.joinToString("") + ":" + observed
}
