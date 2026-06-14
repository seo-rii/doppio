fun collectionBuilderSummary(): String {
  val values = buildList {
    add(2)
    addAll(listOf(4, 6))
    repeat(2) { add(it + 7) }
  }
  val indexMap = buildMap {
    values.forEachIndexed { index, value ->
      put("k" + index, value * value)
    }
    putIfAbsent("k1", -1)
  }
  val grouped = values.groupingBy {
    if (it % 2 == 0) "e" else "o"
  }.fold(0) { acc, item -> acc + item }
  val groupedText = grouped.toSortedMap().entries.joinToString(",") {
    it.key + "=" + it.value
  }
  val windows = values.windowed(3, 2, partialWindows = true) { window ->
    window.sum()
  }.joinToString(",")
  val chunks = values.chunked(2) { chunk ->
    chunk.joinToString("")
  }.joinToString("|")
  val partitioned = values.partition { it > 5 }
  val partitionedText = partitioned.first.joinToString("") + "/" +
    partitioned.second.joinToString("")
  val zipped = values.zipWithNext { previous, next ->
    previous.toString() + ":" + next
  }.take(3).joinToString(";")
  val flattened = listOf(listOf("a"), emptyList(), listOf("b", "c"))
    .flatten()
    .joinToString("")
  val associated = values.associateWith { it.toString(16) }.entries.joinToString(",") {
    it.key.toString() + it.value
  }
  val running = values.runningFold(1) { acc, value -> acc + value }.joinToString(":")
  val reduced = values.reduceIndexed { index, acc, value -> acc + value * index }
  val setText = buildSet {
    addAll(values.map { it % 3 })
    add(9)
  }.joinToString(",")
  val mapText = indexMap.toSortedMap().entries.joinToString(",") {
    it.key + "=" + it.value
  }
  return values.joinToString("") + "|" +
    mapText + "|" +
    groupedText + "|" +
    windows + "|" +
    chunks + "|" +
    partitionedText + "|" +
    zipped + "|" +
    flattened + "|" +
    associated + "|" +
    running + "|" +
    reduced + "|" +
    setText
}
