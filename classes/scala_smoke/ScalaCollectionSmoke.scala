import scala.collection.immutable.{ArraySeq, LazyList, TreeMap}
import scala.util.matching.Regex

object ScalaCollectionSmoke {
  private object PairToken {
    def unapply(text: String): Option[(String, Int)] = {
      text.split(":", 2).toList match {
        case key :: value :: Nil => value.toIntOption.map(key -> _)
        case _ => None
      }
    }
  }

  def exercise(): String = {
    val lazyValues = LazyList.iterate(1)(_ + 2).take(4).mkString(",")
    val grouped = List("a:2", "bb:3", "bad", "c:4")
      .collect { case PairToken(key, value) => key -> (value + key.length) }
      .groupMap(_._1.length)(_._2)
      .view
      .mapValues(_.sum)
      .toList
      .sortBy(_._1)
      .map { case (length, value) => s"$length=$value" }
      .mkString(",")
    val sorted = TreeMap("z" -> 2, "a" -> 5).iterator.map { case (key, value) => s"$key$value" }.mkString("|")
    val arraySeq = ArraySeq.unsafeWrapArray(Array(3, 1, 4)).sorted.mkString("")
    val matcher: Regex = raw"([a-z]+)(\d+)".r
    val matched = "k9" match {
      case matcher(key, value) => key + (value.toInt + 1)
      case _ => "none"
    }
    val either = List(1, 2, 3)
      .foldLeft[Either[String, Int]](Right(0))((acc, value) => acc.map(_ + value))
      .fold(identity, value => s"r$value")

    s"$lazyValues:$grouped:$sorted:$arraySeq:$matched:$either"
  }
}
