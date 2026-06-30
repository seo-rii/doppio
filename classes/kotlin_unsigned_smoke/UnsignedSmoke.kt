@OptIn(ExperimentalUnsignedTypes::class)
fun unsignedSummary(): String {
  val ints = uintArrayOf(1u, UInt.MAX_VALUE, 4u)
  val wrapped = ints.reduce { acc, value -> acc + value }
  val bytes = ubyteArrayOf(0x0fu, 0xa0u, 0xffu)
  val hex = bytes.joinToString("") {
    (it.toInt() and 0xff).toString(16).padStart(2, '0')
  }
  val sortedLongs = ulongArrayOf(ULong.MAX_VALUE, 2uL, 9uL)
      .toList()
      .sorted()
      .joinToString(",")
  val filtered = ints.filter { it > 2u }.joinToString(",")
  val lookup = linkedMapOf(1u to "one", wrapped to "wrap", UInt.MAX_VALUE to "max")

  return ints.size.toString() + ":" +
      wrapped + ":" +
      hex + ":" +
      sortedLongs + ":" +
      filtered + ":" +
      lookup[4u] + ":" +
      (UInt.MAX_VALUE > 0u) + ":" +
      (ULong.MAX_VALUE > 0uL)
}
