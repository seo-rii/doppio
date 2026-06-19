package object scalasmoke {
  val packageSeed: Int = 11

  def packageLabel(name: String): String = s"pkg-$name-$packageSeed"
}
