package scalasmoke

import scala.beans.BeanProperty

trait NamedThing {
  def name: String
}

final class PackageWorker(@BeanProperty val name: String, private val seed: Int) extends NamedThing {
  private val created: Int = packageSeed + seed

  def total(values: Seq[Int]): Int = values.foldLeft(created)(_ + _)

  def describe(prefix: String = packageLabel(name)): String = s"$prefix:${total(Vector(1, 2, 3))}"
}

object SmokeColors extends Enumeration {
  val Red, Green, Blue = Value
}

final class SpecializedBox[@specialized(Int, Long) A](val value: A) {
  def pair(other: A): (A, A) = (value, other)
}

object PackageRegistry {
  private lazy val colors: List[String] = SmokeColors.values.toList.map(_.toString.toLowerCase)

  def token(worker: PackageWorker): String = {
    val cls = worker.getClass
    val constructorCount = cls.getDeclaredConstructors.length
    val methodNames = cls.getDeclaredMethods
      .map(_.getName)
      .filter(name => name == "describe" || name == "getName" || name == "total")
      .sorted
      .mkString("/")
    val beanName = cls.getMethod("getName").invoke(worker).asInstanceOf[String]
    val seedField = cls.getDeclaredField("seed")
    seedField.setAccessible(true)
    val reflectedSeed = seedField.get(worker).asInstanceOf[Int]
    val directDescription = worker.describe()
    val specialized = new SpecializedBox[Int](worker.total(List(4))).pair(5)

    s"$beanName:$reflectedSeed:c$constructorCount:$methodNames:$directDescription:${colors.mkString("-")}:${specialized._1 + specialized._2}"
  }
}

object ScalaPackageReflectionSmoke {
  def exercise(): String = PackageRegistry.token(new PackageWorker("worker", 3))
}
