import scala.collection.mutable.ListBuffer
import scala.util.Try
import scala.util.Using

final class FunctionalCloseRecorder(private val log: ListBuffer[String]) extends AutoCloseable {
  def mark(value: String): Int = {
    log += value
    value.length
  }

  override def close(): Unit = {
    log += "close"
  }
}

object ScalaFunctionalSmoke {
  def exercise(): String = {
    val chained = Function.chain(List[Int => Int](_ + 2, _ * 3, _ - 1))(4)
    val composed = (((value: Int) => value + 1).andThen(_ * 2)).compose((value: Int) => value * 3)(2)
    val options = List(
      Option.when(chained > 10)(s"p$chained"),
      Option.unless(composed < 10)(s"c$composed"),
      Option.when(false)("ignored")
    ).flatten.mkString("+")

    val closeLog = ListBuffer.empty[String]
    val usingValue = Using.resource(new FunctionalCloseRecorder(closeLog)) { recorder =>
      recorder.mark("alpha") + recorder.mark("bb")
    }
    val successful = Try("42".toInt)
      .map(_ + usingValue)
      .filter(_ % 7 == 0)
      .recover { case _: Throwable => -1 }
      .get
    val recovered = Try("x".toInt)
      .recover { case _: NumberFormatException => 13 }
      .get
    val (invalid, valid) = List("1", "x", "23", "").partitionMap { text =>
      if (text.nonEmpty && text.forall(_.isDigit)) Right(text.toInt)
      else Left(if (text.isEmpty) "_" else text)
    }
    val either = Either.cond(usingValue == 7, s"ok$successful", "bad")
      .map(_.toLowerCase)
      .fold(identity, identity)

    s"f$chained/$composed/$options/u$usingValue/${closeLog.mkString(">")}/t$successful+$recovered/${invalid.mkString("|")}=${valid.sum}/$either"
  }
}
