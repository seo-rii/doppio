inline fun <reified T> reifiedStats(values: List<Any?>): String {
  val count = values.count { it is T }
  val rendered = values.mapNotNull { it as? T }.joinToString("|") {
    it.toString()
  }
  return T::class.java.simpleName + ":" + count + ":" + rendered
}

fun joinInts(prefix: String, vararg values: Int): String {
  return prefix + values.joinToString(",", "[", "]") + "=" + values.sum()
}

fun reifiedArraySummary(): String {
  val mixed = listOf("a", 1, "bb", null, 2L, "ccc")
  val stringStats = reifiedStats<String>(mixed)
  val numberStats = reifiedStats<Number>(mixed)

  val ints = intArrayOf(3, 1, 4)
  val extra = intArrayOf(1, 5)
  val spread = joinInts("i", *ints, 9, *extra)

  val objectArray = arrayOf("z", "a", "mm")
  val copy = objectArray.copyOf()
  copy[1] = "bb"
  val squares = arrayOf(1, 2, 3).map { it * it }.toTypedArray()
  val primitive = IntArray(4) { index -> index + 2 }.joinToString("")
  val component = objectArray.javaClass.componentType.simpleName
  val primitiveComponent = ints.javaClass.componentType.simpleName

  return stringStats + ":" +
      numberStats + ":" +
      spread + ":" +
      objectArray.joinToString("") + "|" + copy.joinToString("") + ":" +
      squares.joinToString("-") + ":" +
      primitive + ":" +
      component + ":" +
      primitiveComponent
}
