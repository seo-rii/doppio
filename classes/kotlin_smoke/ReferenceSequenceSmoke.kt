class ReferenceOwner(private val seed: Int) {
  fun add(value: Int): Int = seed + value

  companion object {
    fun scale(value: Int): Int = value * 2
  }
}

fun referenceTarget(value: Int): Int = value + 1

fun referenceSequenceSummary(): String {
  val top: (Int) -> Int = ::referenceTarget
  val bound: (Int) -> Int = ReferenceOwner(5)::add
  val unbound: (ReferenceOwner, Int) -> Int = ReferenceOwner::add
  val constructor: (Int) -> ReferenceOwner = ::ReferenceOwner
  val companion: (Int) -> Int = ReferenceOwner.Companion::scale

  val zipped = generateSequence(1) { value ->
    if (value < 5) value + 1 else null
  }.map(top)
    .filter { it % 2 == 0 }
    .flatMap { sequenceOf(it, bound(it)) }
    .zip(sequenceOf("a", "b", "c", "d")) { value, label -> label + value }
    .joinToString("|")

  val folded = sequenceOf(1, 2, 3, 4).fold(0) { acc, value -> acc + companion(value) }
  val made = constructor(7).add(1)
  val unboundValue = unbound(ReferenceOwner(3), 4)
  return zipped + ":" + folded + ":" + made + ":" + unboundValue + ":" + top(9)
}
