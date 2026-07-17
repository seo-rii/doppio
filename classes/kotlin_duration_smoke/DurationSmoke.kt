import java.time.Duration as JavaDuration
import java.time.temporal.ChronoUnit
import java.util.concurrent.TimeUnit
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.nanoseconds
import kotlin.time.Duration.Companion.seconds

fun durationSummary(): String {
  val base = 2.seconds + 1500.milliseconds - 250.milliseconds
  val parts = listOf(500.milliseconds, 1.seconds, (-250).milliseconds)
    .runningFold(Duration.ZERO) { acc, duration -> acc + duration }
    .joinToString(",") { it.inWholeMilliseconds.toString() }
  val sorted = listOf(3.seconds, 1500.milliseconds, Duration.ZERO, (-1).seconds)
    .sorted()
    .joinToString(",") { it.inWholeMilliseconds.toString() }
  val ratio = 3.seconds / 1500.milliseconds
  val parsed = Duration.parseIsoString("PT1.25S").inWholeMilliseconds
  val scaled = (750.milliseconds * 3).inWholeMilliseconds
  val coerced = 5.seconds.coerceIn(1.seconds, 3.seconds).inWholeSeconds
  val flags = listOf(base.isFinite(), Duration.INFINITE.isInfinite(), (-Duration.INFINITE).isInfinite())
    .joinToString(":") { it.toString() }
  val modernTimeUnits = listOf(
    TimeUnit.MILLISECONDS.toChronoUnit().name,
    TimeUnit.of(ChronoUnit.SECONDS).name,
    TimeUnit.SECONDS.convert(JavaDuration.ofSeconds(-2, 500_000_000)).toString(),
  ).joinToString(":")
  val modernDuration = JavaDuration.ofSeconds(-183_846, 321_098_766)
  val modernDurationParts = listOf(
    JavaDuration.ofSeconds(9).dividedBy(JavaDuration.ofSeconds(2)),
    modernDuration.toSeconds(),
    modernDuration.toDaysPart(),
    modernDuration.toHoursPart(),
    modernDuration.toMinutesPart(),
    modernDuration.toSecondsPart(),
    modernDuration.toMillisPart(),
    modernDuration.toNanosPart(),
  ).joinToString(":")
  return base.inWholeMilliseconds.toString() + "|" +
    parts + "|" +
    sorted + "|" +
    1500.nanoseconds.inWholeMicroseconds + "|" +
    ratio + "|" +
    parsed + "|" +
    scaled + "|" +
    coerced + "|" +
    flags + "|" +
    modernTimeUnits + "|" +
    modernDurationParts
}
