import scala.annotation.tailrec
import scala.reflect.ClassTag
import scala.util.Try

final case class Metric(name: String, value: Int = 1) {
  def bump(delta: Int = 1): Metric = copy(value = value + delta)
}

object ScalaLibrarySmoke {
  implicit final class RichMetric(private val metric: Metric) extends AnyVal {
    def token: String = s"${metric.name}:${metric.value}"
  }

  private def arrayToken[A: ClassTag](items: A*): String = {
    val array = Array[A](items: _*)
    s"${array.getClass.getComponentType.getSimpleName}:${array.length}"
  }

  @tailrec
  private def gcd(a: Int, b: Int): Int = {
    if (b == 0) math.abs(a) else gcd(b, a % b)
  }

  def exercise(): String = {
    val metrics = List(Metric("aa", 2), Metric("b").bump(3), Metric("ccc", 4))
    val grouped = metrics
      .groupMapReduce(_.name.length)(_.value)(_ + _)
      .toList
      .sortBy(_._1)
      .map { case (length, value) => s"$length=$value" }
      .mkString(",")
    val ordered = metrics.sortBy(metric => (-metric.value, metric.name)).map(_.token).mkString("/")
    val gcdValue = metrics.map(_.value).foldLeft(0)(gcd)
    val tried = Try(metrics.find(_.name == "b").get.bump().value).toOption.getOrElse(-1)
    val array = arrayToken("x", "y", "z")
    val defaulted = Metric("z").bump().token

    s"$grouped:$ordered:g$gcdValue:t$tried:$array:$defaulted"
  }
}
