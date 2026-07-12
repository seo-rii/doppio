interface LeftPath {
  val weight: Int
    get() = 3

  fun tag(value: Int): String = "L$value"
}

interface RightPath {
  val weight: Int
    get() = 4

  fun tag(value: Int): String = "R$value"
}

class QualifiedSuperOwner : LeftPath, RightPath {
  override val weight: Int
    get() = super<LeftPath>.weight + super<RightPath>.weight

  override fun tag(value: Int): String {
    return super<LeftPath>.tag(value) + super<RightPath>.tag(value + 2)
  }
}

fun qualifiedSuperSummary(): String {
  val owner = QualifiedSuperOwner()
  var checksum = 0
  repeat(256) {
    checksum += owner.tag(4).length + owner.weight
  }
  return owner.tag(4) + ":" + owner.weight + ":" + checksum
}
