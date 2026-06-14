interface PipelineStep<in I, out O> {
  val name: String

  fun apply(input: I): O

  fun describe(input: I): String = "$name:${apply(input)}"
}

class TextStep(private val base: Int) : PipelineStep<CharSequence, String> {
  override val name: String = "text"

  override fun apply(input: CharSequence): String = (input.length + base).toString()
}

class DelegatingStep(
  private val suffix: String,
  private val delegate: PipelineStep<CharSequence, String>
) : PipelineStep<CharSequence, String> by delegate {
  override fun apply(input: CharSequence): String = delegate.apply(input) + suffix
}

open class GenericCell<T>(private val item: T) {
  open fun read(): T = item

  open fun echo(value: T): T = value
}

class StringCell(item: String) : GenericCell<String>(item) {
  override fun read(): String = super.read() + "!"

  override fun echo(value: String): String = value + read()
}

fun bridgeNames(clazz: Class<*>): String =
  clazz.declaredMethods
    .filter { it.isBridge }
    .map { method ->
      val params = method.parameterTypes.joinToString("_") { it.simpleName }
      method.name + ":" + method.returnType.simpleName + ":" + params
    }
    .sorted()
    .joinToString(",")

fun delegationBridgeSummary(): String {
  val text = TextStep(3)
  val delegated = DelegatingStep("x", text)
  val widened: PipelineStep<String, CharSequence> = delegated
  val cell: GenericCell<String> = StringCell("z")
  val values = listOf(
    text.describe("abcd"),
    delegated.describe("ab"),
    delegated.apply("ab"),
    widened.describe("abc"),
    cell.read(),
    cell.echo("a")
  )
  return values.joinToString("|") + "|" +
    bridgeNames(TextStep::class.java) + "|" +
    bridgeNames(DelegatingStep::class.java) + "|" +
    bridgeNames(StringCell::class.java)
}
