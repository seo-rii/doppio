import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.resume
import kotlin.coroutines.startCoroutine
import kotlin.coroutines.suspendCoroutine

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

suspend fun suspendStateValue(seed: Int): Int {
  val first = suspendCoroutine<Int> { continuation ->
    continuation.resume(seed + 3)
  }
  return first * 2
}

fun stateMachineSummary(): String {
  var outcome = "pending"
  val block: suspend () -> Int = { suspendStateValue(4) }
  block.startCoroutine(object : Continuation<Int> {
    override val context = EmptyCoroutineContext

    override fun resumeWith(result: Result<Int>) {
      outcome = "state=" + result.getOrThrow()
    }
  })
  return outcome
}
