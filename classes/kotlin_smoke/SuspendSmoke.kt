import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine

suspend fun suspendValue(seed: Int): Int = seed + 2

fun suspendSummary(): String {
  var outcome = "pending"
  val block: suspend () -> Int = { suspendValue(5) }
  block.startCoroutine(object : Continuation<Int> {
    override val context = EmptyCoroutineContext

    override fun resumeWith(result: Result<Int>) {
      outcome = "suspend=" + result.getOrThrow()
    }
  })
  return outcome
}
