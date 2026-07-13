import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.startCoroutine
import kotlin.coroutines.suspendCoroutine

private var suspendInlineContinuation: Continuation<Int>? = null

private suspend inline fun tracedInline(
  events: MutableList<String>,
  block: () -> Int,
): Int {
  events += "enter"
  try {
    return block()
  } finally {
    events += "exit"
  }
}

private suspend fun inlineCheckpoint(events: MutableList<String>): Int {
  events += "wait"
  return suspendCoroutine { continuation ->
    suspendInlineContinuation = continuation
  }
}

private fun runSuspendInline(fail: Boolean): String {
  val events = mutableListOf<String>()
  var outcome = "pending"
  val block: suspend () -> Int = {
    tracedInline(events) {
      events += "body"
      val value = inlineCheckpoint(events)
      events += "after:$value"
      value + 1
    }
  }

  block.startCoroutine(object : Continuation<Int> {
    override val context = EmptyCoroutineContext

    override fun resumeWith(result: Result<Int>) {
      val failure = result.exceptionOrNull()
      outcome = if (failure == null) {
        "done" + result.getOrThrow()
      } else {
        "fail:" + (failure.message ?: failure.javaClass.simpleName)
      }
    }
  })

  val beforeResume = outcome
  val continuation = suspendInlineContinuation ?: return "missing-inline"
  suspendInlineContinuation = null
  if (fail) {
    continuation.resumeWithException(IllegalStateException("boom"))
  } else {
    continuation.resume(4)
  }
  return beforeResume + ">" + outcome + ">" + events.joinToString(">")
}

fun suspendInlineSummary(): String {
  val success = runSuspendInline(false)
  val failure = runSuspendInline(true)
  return success + "|" + failure
}
