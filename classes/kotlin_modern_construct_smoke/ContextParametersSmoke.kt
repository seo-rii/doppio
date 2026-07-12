interface SmokeContext {
  val seed: Int

  fun label(value: Int): String
}

class PrefixContext(
  private val prefix: String,
  override val seed: Int,
) : SmokeContext {
  override fun label(value: Int): String = "$prefix$value"
}

context(ctx: SmokeContext)
fun contextLabel(value: Int): String = ctx.label(value + ctx.seed)

context(ctx: SmokeContext)
val contextToken: String
  get() = ctx.label(ctx.seed)

fun contextParameterSummary(): String {
  val ctx = PrefixContext("c", 4)
  return context(ctx) {
    contextLabel(4) + ":" + contextToken
  }
}
