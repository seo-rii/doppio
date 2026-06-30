enum class RoutedStage(val code: Int) {
  ALPHA(1) {
    override val marker: String = "A"

    override fun label(input: String): String = input.uppercase() + code
  },
  BETA(2) {
    override val marker: String = "B"

    override fun label(input: String): String = input.reversed() + code
  },
  GAMMA(3) {
    override val marker: String = "G"

    override fun label(input: String): String = input.repeat(code) + code
  };

  abstract val marker: String

  abstract fun label(input: String): String

  fun rank(): Int = ordinal + code
}

fun enumPolymorphismSummary(): String {
  val markers = RoutedStage.entries.joinToString("") { it.marker + it.rank() }
  val labels = enumValues<RoutedStage>().joinToString(",") { it.label("x") }
  val branches = RoutedStage.entries.joinToString("/") {
    when (it) {
      RoutedStage.ALPHA -> "low"
      RoutedStage.BETA,
      RoutedStage.GAMMA -> "high"
    }
  }
  val badLookup = try {
    enumValueOf<RoutedStage>("OMEGA").name
  } catch (e: IllegalArgumentException) {
    e.javaClass.simpleName
  }
  return listOf(
    markers,
    RoutedStage.valueOf("BETA").label("kt"),
    labels,
    branches,
    badLookup
  ).joinToString("|")
}
