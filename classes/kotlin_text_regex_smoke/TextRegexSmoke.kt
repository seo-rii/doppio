private val tokenRegex = Regex("(?<key>[a-z]+)=(\\d+)")

fun textRegexSummary(): String {
  val text = "a=1; bb=23; c=456; bad=x"
  val matchSummary = tokenRegex.findAll(text).mapIndexed { index, match ->
    val key = match.groups["key"]?.value ?: "_"
    val number = match.groupValues[2].toInt()
    "$index:$key:${number + key.length}:${match.range.first}-${match.range.last}"
  }.joinToString(",")

  val replaced = tokenRegex.replace(text) { match ->
    val (key, digits) = match.destructured
    "${key.uppercase()}:${digits.reversed()}"
  }
  val firstOnly = tokenRegex.replaceFirst("a=1 b=2", "first")
  val split = Regex("[,;]\\s*").split("a, bb; c").joinToString("|")

  val block = """
    alpha
      beta
    gamma
  """.trimIndent()
  val lineSummary = block.lineSequence().mapIndexed { index, line ->
    "$index:${line.length}:${line.trim().first()}"
  }.joinToString(",")

  val entire = Regex("([A-Z]+)-(\\d+)")
    .matchEntire("KT-42")
    ?.destructured
    ?.toList()
    ?.joinToString("/")
    ?: "none"
  val optionMatch = Regex("kt", setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE))
    .containsMatchIn("A\nKT")
  val transformed = "kotlin"
    .replaceRange(1, 4, "OT")
    .replaceFirstChar { it.uppercaseChar() }

  return matchSummary + "|" +
    replaced + "|" +
    firstOnly + "|" +
    split + "|" +
    lineSummary + "|" +
    entire + "|" +
    optionMatch + "|" +
    transformed
}
