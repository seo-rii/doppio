class IndyConcatProbe(private val label: String) {
  var calls: Int = 0
    private set

  override fun toString(): String {
    calls++
    return "probe[$label#$calls]"
  }
}

class IndyConcatThrowingProbe {
  override fun toString(): String {
    throw IllegalStateException("concat-boom")
  }
}

private fun mixedConcat(
  count: Int,
  left: Long,
  right: Long,
  ratio: Float,
  offset: Double,
  enabled: Boolean,
  marker: Char,
  value: Any?
): String {
  return "mix[$count][$left][$right][$ratio][$offset][$enabled][$marker][$value]"
}

private fun throwingConcat(value: Any?): String = "throwing=$value"

fun indyConcatSummary(): String {
  val probe = IndyConcatProbe("box")
  val mixed = mixedConcat(
    7,
    4294967297L,
    Long.MIN_VALUE,
    1.25f,
    -2.5,
    true,
    'K',
    probe
  )
  val nullable: Any? = null
  val nullText = "nullable=$nullable"
  val constantText = "plain=${8 + 9}"
  val thrown = try {
    throwingConcat(IndyConcatThrowingProbe())
    "missing"
  } catch (e: IllegalStateException) {
    "${e.javaClass.simpleName}:${e.message}"
  }
  return "$mixed|$nullText|calls=${probe.calls}|$constantText|throw=$thrown"
}
