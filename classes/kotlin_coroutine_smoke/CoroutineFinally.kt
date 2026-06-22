import kotlin.coroutines.AbstractCoroutineContextElement
import kotlin.coroutines.Continuation
import kotlin.coroutines.ContinuationInterceptor
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.resume
import kotlin.coroutines.startCoroutine
import kotlin.coroutines.suspendCoroutine

private var savedContinuation: Continuation<Int>? = null

private class QueueDispatcher :
    AbstractCoroutineContextElement(ContinuationInterceptor),
    ContinuationInterceptor {
  val queue = ArrayDeque<() -> Unit>()

  override fun <T> interceptContinuation(continuation: Continuation<T>): Continuation<T> {
    return object : Continuation<T> {
      override val context: CoroutineContext = continuation.context

      override fun resumeWith(result: Result<T>) {
        queue.add {
          continuation.resumeWith(result)
        }
      }
    }
  }
}

fun main() {
  var outcome = "pending"
  var cleanup = "clean"
  val dispatcher = QueueDispatcher()
  val events = mutableListOf<String>()
  val block: suspend () -> Int = {
    try {
      val first = suspendCoroutine<Int> { continuation ->
        savedContinuation = continuation
      }
      try {
        val second = suspendCoroutine<Int> { continuation ->
          savedContinuation = continuation
        }
        first * 10 + second
      } finally {
        cleanup += ">inner"
      }
    } finally {
      cleanup += ">outer"
    }
  }
  block.startCoroutine(object : Continuation<Int> {
    override val context: CoroutineContext = dispatcher

    override fun resumeWith(result: Result<Int>) {
      outcome = "result=" + result.getOrThrow()
    }
  })

  events += outcome
  var drainCount = 0
  while (dispatcher.queue.isNotEmpty()) {
    dispatcher.queue.removeFirst().invoke()
    drainCount++
  }
  events += drainCount.toString()
  events += outcome

  val first = savedContinuation ?: error("missing-first")
  savedContinuation = null
  first.resume(2)
  events += outcome
  drainCount = 0
  while (dispatcher.queue.isNotEmpty()) {
    dispatcher.queue.removeFirst().invoke()
    drainCount++
  }
  events += drainCount.toString()
  events += outcome

  val second = savedContinuation ?: error("missing-second")
  savedContinuation = null
  second.resume(7)
  events += outcome
  drainCount = 0
  while (dispatcher.queue.isNotEmpty()) {
    dispatcher.queue.removeFirst().invoke()
    drainCount++
  }
  events += drainCount.toString()
  events += outcome
  events += cleanup

  println(events.joinToString("|"))
}
