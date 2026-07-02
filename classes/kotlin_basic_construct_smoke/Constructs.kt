@Target(AnnotationTarget.CLASS)
annotation class SmokeTag(val value: String)

interface SmokeNamed {
  val name: String
  fun label(): String = "name=$name"
}

@SmokeTag("point")
data class SmokePoint(val x: Int, val y: Int) : SmokeNamed {
  override val name: String
    get() = "$x,$y"

  fun move(dx: Int = 1, dy: Int = 2): SmokePoint = SmokePoint(x + dx, y + dy)
}

class SmokeBox<T>(private val value: T) {
  fun get(): T = value
}

fun smokeTwice(seed: Int, op: (Int) -> Int): Int = op(op(seed))

fun smokeSummary(): String {
  val point = SmokePoint(1, 2).move()
  val boxed = SmokeBox(point)
  return boxed.get().label() + ":" + smokeTwice(3) { it + 1 }
}
