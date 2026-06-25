import java.time.{Clock, Duration, Instant, ZoneId}
import java.util.stream.Stream

object ScalaModernJavaInteropSmoke {
  def exercise(): String = {
    val hexClass = Class.forName("java.util.HexFormat")
    val hex = hexClass.getMethod("of").invoke(null)
    val upper = hexClass.getMethod("withUpperCase").invoke(hex)
    val bytes = Array[Byte](0x0f, 0x10, -1)
    val formatted = hexClass.getMethod("formatHex", classOf[Array[Byte]]).invoke(hex, bytes).asInstanceOf[String]
    val upperText = hexClass.getMethod("formatHex", classOf[Array[Byte]]).invoke(upper, Array[Byte](10, 11)).asInstanceOf[String]
    val parsed = hexClass.getMethod("parseHex", classOf[CharSequence]).invoke(hex, "cafe").asInstanceOf[Array[Byte]]
    val digit = hexClass.getMethod("fromHexDigit", java.lang.Integer.TYPE).invoke(null, Int.box('f'.toInt))

    val instantSourceClass = Class.forName("java.time.InstantSource")
    val fixedInstant = Instant.parse("2020-01-02T03:04:05Z")
    val fixed = instantSourceClass.getMethod("fixed", classOf[Instant]).invoke(null, fixedInstant)
    val fixedValue = instantSourceClass.getMethod("instant").invoke(fixed).asInstanceOf[Instant]
    val fixedMillis = instantSourceClass.getMethod("millis").invoke(fixed)
    val offset = instantSourceClass
      .getMethod("offset", instantSourceClass, classOf[Duration])
      .invoke(null, fixed, Duration.ofSeconds(2))
    val offsetValue = instantSourceClass.getMethod("instant").invoke(offset).asInstanceOf[Instant]
    val zoned = instantSourceClass
      .getMethod("withZone", classOf[ZoneId])
      .invoke(fixed, ZoneId.of("UTC"))

    val randomGeneratorClass = Class.forName("java.util.random.RandomGenerator")
    val randomFactoryClass = Class.forName("java.util.random.RandomGeneratorFactory")
    val randomFactory = randomFactoryClass.getMethod("of", classOf[String]).invoke(null, "Random")
    val randomGenerator = randomFactoryClass
      .getMethod("create", java.lang.Long.TYPE)
      .invoke(randomFactory, Long.box(123L))
    val nextInt = randomGeneratorClass
      .getMethod("nextInt", java.lang.Integer.TYPE)
      .invoke(randomGenerator, Int.box(100))
    val nextLong = randomGeneratorClass
      .getMethod("nextLong", java.lang.Long.TYPE)
      .invoke(randomGenerator, Long.box(1000L))
    val streamClass = classOf[Stream[_]]
    val streamList = Stream.of("q", "r", "s")
      .map((value: String) => value.toUpperCase)
    val streamToList = streamClass.getMethod("toList")
      .invoke(streamList)
      .asInstanceOf[java.util.List[String]]
    val streamListFailure =
      try {
        streamToList.add("T")
        "mut"
      } catch {
        case _: UnsupportedOperationException => "uoe"
      }

    s"$formatted|$upperText|${parsed.length}:${hexClass.getMethod("formatHex", classOf[Array[Byte]]).invoke(hex, parsed)}:$digit|" +
      s"$fixedValue:$fixedMillis:$offsetValue:${classOf[Clock].isInstance(zoned)}|" +
      s"${randomFactoryClass.getMethod("name").invoke(randomFactory)}:$nextInt:$nextLong|" +
      s"${java.lang.String.join("", streamToList)}:$streamListFailure"
  }
}
