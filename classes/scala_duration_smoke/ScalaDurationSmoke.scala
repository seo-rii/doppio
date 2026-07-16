import java.time.{Duration => JavaDuration}
import java.time.temporal.ChronoUnit
import java.util.concurrent.TimeUnit
import scala.concurrent.duration._

object ScalaDurationSmoke {
  def exercise(): String = {
    val base = 2.seconds + 1500.millis - 250.millis
    val timeline = List(500.millis, 1.second, -250.millis)
      .scanLeft(Duration.Zero)(_ + _)
      .map(_.toMillis)
      .mkString(",")
    val sorted = List(3.seconds, 1500.millis, Duration.Zero, -1.second)
      .sorted
      .map(_.toMillis)
      .mkString(",")
    val ratio = 3.seconds / 1500.millis
    val parsed = Duration("1250 millis").toMillis
    val scaled = (750.millis * 3).toMillis
    val clamped = List(5.seconds, 3.seconds).min.toSeconds
    val flags = List(base.isFinite, Duration.Inf.isFinite, Duration.MinusInf < Duration.Zero).mkString(":")
    val chronoUnit = TimeUnit.MILLISECONDS.toChronoUnit().name()
    val timeUnit = TimeUnit.of(ChronoUnit.HOURS).name()
    val converted = TimeUnit.MILLISECONDS.convert(JavaDuration.ofSeconds(2, 345678901))
    val negativeFraction = TimeUnit.MILLISECONDS.convert(JavaDuration.ofSeconds(-3, 654321099))
    s"${base.toMillis}|$timeline|$sorted|${Duration.fromNanos(1500).toMicros}|$ratio|$parsed|$scaled|$clamped|$flags|$chronoUnit|$timeUnit|$converted|$negativeFraction"
  }
}
