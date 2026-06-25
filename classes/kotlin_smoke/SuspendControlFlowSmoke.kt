import kotlin.coroutines.AbstractCoroutineContextElement
import kotlin.coroutines.Continuation
import kotlin.coroutines.ContinuationInterceptor
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.startCoroutine
import kotlin.coroutines.suspendCoroutine

private var suspendControlContinuation: Continuation<Int>? = null
private var suspendUnwindContinuation: Continuation<Int>? = null

private class SuspendControlDispatcher :
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

private suspend fun suspendCheckpoint(label: String, events: MutableList<String>): Int {
  events += "wait:$label"
  return suspendCoroutine { continuation ->
    suspendControlContinuation = continuation
  }
}

private suspend fun suspendControlMachine(seed: Int, events: MutableList<String>): Int {
  var total = seed
  try {
    outer@ for (index in 0..2) {
      events += "loop$index"
      val value = suspendCheckpoint("v$index", events)
      try {
        when {
          value < 0 -> throw IllegalArgumentException("neg$index")
          value == 0 -> continue@outer
          value > 5 -> break@outer
          else -> total += value * (index + 1)
        }
      } catch (e: IllegalArgumentException) {
        events += "catch:${e.message}"
        total += 7
      } finally {
        events += "finally$index:$total"
      }
    }
  } finally {
    events += "outer:$total"
  }
  return total
}

fun suspendControlFlowSummary(): String {
  val events = mutableListOf<String>()
  val dispatcher = SuspendControlDispatcher()
  var outcome = "pending"
  val states = mutableListOf<String>()
  val block: suspend () -> Int = { suspendControlMachine(2, events) }

  fun drain(): Int {
    var count = 0
    while (dispatcher.queue.isNotEmpty()) {
      dispatcher.queue.removeFirst().invoke()
      count++
    }
    return count
  }

  block.startCoroutine(object : Continuation<Int> {
    override val context: CoroutineContext = dispatcher

    override fun resumeWith(result: Result<Int>) {
      outcome = "done" + result.getOrThrow()
    }
  })

  states += outcome
  states += "d${drain()}:$outcome"

  val first = suspendControlContinuation ?: return "missing-first"
  suspendControlContinuation = null
  first.resume(3)
  states += "r1:$outcome"
  states += "d${drain()}:$outcome"

  val second = suspendControlContinuation ?: return "missing-second"
  suspendControlContinuation = null
  second.resume(-1)
  states += "r2:$outcome"
  states += "d${drain()}:$outcome"

  val third = suspendControlContinuation ?: return "missing-third"
  suspendControlContinuation = null
  third.resume(8)
  states += "r3:$outcome"
  states += "d${drain()}:$outcome"

  return states.joinToString("|") + "|" + events.joinToString(">")
}

fun suspendExceptionUnwindSummary(): String {
  val events = mutableListOf<String>()
  val dispatcher = SuspendControlDispatcher()
  var outcome = "pending"
  val states = mutableListOf<String>()
  val block: suspend () -> Int = {
    var total = 0
    try {
      try {
        events += "wait:first"
        total += suspendCoroutine<Int> { continuation ->
          suspendUnwindContinuation = continuation
        }
        events += "after-first:$total"
        events += "wait:second"
        total += suspendCoroutine<Int> { continuation ->
          suspendUnwindContinuation = continuation
        }
        events += "after-second:$total"
        total
      } catch (e: IllegalStateException) {
        events += "catch:${e.message}"
        total += 10
        total
      } finally {
        events += "inner-finally:$total"
        total += 100
      }
    } finally {
      events += "outer-finally:$total"
    }
  }

  block.startCoroutine(object : Continuation<Int> {
    override val context: CoroutineContext = dispatcher

    override fun resumeWith(result: Result<Int>) {
      outcome = "done" + result.getOrThrow()
    }
  })

  states += outcome
  var startSteps = 0
  while (dispatcher.queue.isNotEmpty()) {
    dispatcher.queue.removeFirst().invoke()
    startSteps++
  }
  states += "d$startSteps:$outcome"

  val first = suspendUnwindContinuation ?: return "missing-unwind-first"
  suspendUnwindContinuation = null
  first.resume(2)
  states += "r1:$outcome"

  var firstSteps = 0
  while (dispatcher.queue.isNotEmpty()) {
    dispatcher.queue.removeFirst().invoke()
    firstSteps++
  }
  states += "d$firstSteps:$outcome"

  val second = suspendUnwindContinuation ?: return "missing-unwind-second"
  suspendUnwindContinuation = null
  second.resumeWithException(IllegalStateException("bad"))
  states += "x2:$outcome"

  var secondSteps = 0
  while (dispatcher.queue.isNotEmpty()) {
    dispatcher.queue.removeFirst().invoke()
    secondSteps++
  }
  states += "d$secondSteps:$outcome"

  return states.joinToString("|") + "|" + events.joinToString(">")
}
