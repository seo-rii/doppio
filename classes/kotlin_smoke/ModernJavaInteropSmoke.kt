import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId

fun modernJavaInteropSummary(): String {
  val hexClass = Class.forName("java.util.HexFormat")
  val hex = hexClass.getMethod("of").invoke(null)
  val upper = hexClass.getMethod("withUpperCase").invoke(hex)
  val bytes = byteArrayOf(0x0f, 0x10, -1)
  val formatted = hexClass.getMethod("formatHex", ByteArray::class.java).invoke(hex, bytes) as String
  val upperText = hexClass.getMethod("formatHex", ByteArray::class.java).invoke(upper, byteArrayOf(10, 11)) as String
  val parsed = hexClass.getMethod("parseHex", CharSequence::class.java).invoke(hex, "cafe") as ByteArray
  val digit = hexClass.getMethod("fromHexDigit", Int::class.javaPrimitiveType).invoke(null, 'f'.code) as Int

  val instantSourceClass = Class.forName("java.time.InstantSource")
  val fixedInstant = Instant.parse("2020-01-02T03:04:05Z")
  val fixed = instantSourceClass.getMethod("fixed", Instant::class.java).invoke(null, fixedInstant)
  val fixedValue = instantSourceClass.getMethod("instant").invoke(fixed) as Instant
  val fixedMillis = instantSourceClass.getMethod("millis").invoke(fixed) as Long
  val offset = instantSourceClass
    .getMethod("offset", instantSourceClass, Duration::class.java)
    .invoke(null, fixed, Duration.ofSeconds(2))
  val offsetValue = instantSourceClass.getMethod("instant").invoke(offset) as Instant
  val zoned = instantSourceClass
    .getMethod("withZone", ZoneId::class.java)
    .invoke(fixed, ZoneId.of("UTC"))

  val randomGeneratorClass = Class.forName("java.util.random.RandomGenerator")
  val randomFactoryClass = Class.forName("java.util.random.RandomGeneratorFactory")
  val randomFactory = randomFactoryClass.getMethod("of", String::class.java).invoke(null, "Random")
  val randomGenerator = randomFactoryClass
    .getMethod("create", Long::class.javaPrimitiveType)
    .invoke(randomFactory, 123L)
  val nextInt = randomGeneratorClass
    .getMethod("nextInt", Int::class.javaPrimitiveType)
    .invoke(randomGenerator, 100) as Int
  val nextLong = randomGeneratorClass
    .getMethod("nextLong", Long::class.javaPrimitiveType)
    .invoke(randomGenerator, 1000L) as Long

  return "$formatted|$upperText|${parsed.size}:${hexClass.getMethod("formatHex", ByteArray::class.java).invoke(hex, parsed)}:$digit|" +
      "$fixedValue:$fixedMillis:$offsetValue:${Clock::class.java.isInstance(zoned)}|" +
      "${randomFactoryClass.getMethod("name").invoke(randomFactory)}:$nextInt:$nextLong"
}
