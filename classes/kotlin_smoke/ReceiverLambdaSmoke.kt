@Target(AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
annotation class ReceiverMarker(val value: String)

typealias BuilderBlock = StringBuilder.(String) -> Unit

class ReceiverPipeline(private val seed: String) {
  fun build(block: BuilderBlock): String {
    val builder = StringBuilder(seed)
    builder.block("|")
    return builder.toString()
  }
}

fun @receiver:ReceiverMarker("text") String.decorate(prefix: String, suffix: String = "!"): String =
  prefix + this + suffix

val String.edgeChars: String
  get() = first().toString() + last()

inline fun <T> T.tapReceiver(block: T.() -> Unit): T {
  block()
  return this
}

fun receiverLambdaSummary(): String {
  val pipeline = ReceiverPipeline("s")
  val built = pipeline.build { separator ->
    append(separator)
    append("a".decorate("[", "]"))
    append(separator)
    append("kotlin".edgeChars)
  }
  val transforms: List<String.() -> String> = listOf(
    { decorate("<", ">") },
    { uppercase() }
  )
  val folded = transforms.fold("go") { value, transform -> value.transform() }
  var captured = 0
  val configured = StringBuilder().tapReceiver {
    append("x")
    captured += length
    append(captured)
  }.toString()
  val extensionRef: String.(String, String) -> String = String::decorate
  val boundExtension: (String, String) -> String = "q"::decorate
  val propertyRef: (String) -> String = String::edgeChars
  val receiverAnnotation = Class.forName("ReceiverLambdaSmokeKt")
    .getDeclaredMethod("decorate", String::class.java, String::class.java, String::class.java)
    .parameterAnnotations[0]
    .joinToString(",") { annotation -> (annotation as ReceiverMarker).value }
  return built + "|" +
    folded + "|" +
    configured + "|" +
    "xy".extensionRef("(", ")") + "|" +
    boundExtension("{", "}") + "|" +
    propertyRef("abcd") + "|" +
    receiverAnnotation
}
