class CaptureOwner(private val seed: Int) {
  private val secret = seed + 7

  private fun mix(value: Int): Int = secret * 10 + value

  class Nested private constructor(private val label: String) {
    companion object {
      fun make(label: String): Nested = Nested(label)
    }

    fun tag(): String = label.reversed()
  }

  inner class Worker(private val offset: Int) {
    fun describe(values: List<Int>): String {
      val localBase = offset + values.size

      class LocalFold(private val multiplier: Int) {
        fun total(): Int {
          var acc = localBase
          values.forEach { value ->
            acc += mix(value * multiplier)
          }
          return acc
        }
      }

      val local = LocalFold(offset).total()
      val anon = object : Runnable {
        private val tag = Nested.make("xy").tag()
        private var ran = false

        override fun run() {
          ran = tag.length + local > 0
        }

        fun summary(): String = "$tag:$ran:$secret"
      }
      anon.run()
      val lambda = values.fold("") { acc, value -> acc + (value + offset) }
      return "$local:${anon.summary()}:$lambda"
    }
  }
}

fun captureShapeSummary(): String {
  val first = CaptureOwner(4).Worker(3).describe(listOf(1, 2))
  val second = CaptureOwner(1).Worker(2).describe(listOf(3))
  return "$first|$second"
}
