import java.util.concurrent.Executors
import kotlin.coroutines.AbstractCoroutineContextElement
import kotlin.coroutines.Continuation
import kotlin.coroutines.ContinuationInterceptor
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.resume
import kotlin.coroutines.startCoroutine
import kotlin.coroutines.suspendCoroutine

private var delayedContinuation: Continuation<Int>? = null
private var failingContinuation: Continuation<Int>? = null
private var threadedContinuation: Continuation<Int>? = null
private var executorContinuation: Continuation<Int>? = null
private var dispatchedContinuation: Continuation<Int>? = null

private class SmokeQueueDispatcher :
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

suspend fun delayedStateValue(seed: Int): Int {
  val resumed = suspendCoroutine<Int> { continuation ->
    delayedContinuation = continuation
  }
  return resumed + seed
}

fun delayedStateSummary(): String {
  var outcome = "pending"
  val block: suspend () -> Int = { delayedStateValue(10) }
  block.startCoroutine(object : Continuation<Int> {
    override val context = EmptyCoroutineContext

    override fun resumeWith(result: Result<Int>) {
      outcome = "delayed=" + result.getOrThrow()
    }
  })
  val beforeResume = outcome
  val continuation = delayedContinuation ?: return "missing-delayed"
  delayedContinuation = null
  continuation.resume(5)
  return beforeResume + "->" + outcome
}

suspend fun failingStateValue(): Int {
  val resumed = suspendCoroutine<Int> { continuation ->
    failingContinuation = continuation
  }
  if (resumed > 0) {
    throw IllegalStateException("resume$resumed")
  }
  return resumed
}

fun stateExceptionSummary(): String {
  var outcome = "pending"
  val block: suspend () -> Int = { failingStateValue() }
  block.startCoroutine(object : Continuation<Int> {
    override val context = EmptyCoroutineContext

    override fun resumeWith(result: Result<Int>) {
      val failure = result.exceptionOrNull()
      outcome = if (failure == null) {
        "ok=" + result.getOrThrow()
      } else {
        "fail=" + (failure.message ?: failure.javaClass.simpleName)
      }
    }
  })
  val beforeResume = outcome
  val continuation = failingContinuation ?: return "missing-failing"
  failingContinuation = null
  continuation.resume(3)
  return beforeResume + "->" + outcome
}

suspend fun threadedStateValue(seed: Int): Int {
  val resumed = suspendCoroutine<Int> { continuation ->
    threadedContinuation = continuation
  }
  return seed * resumed
}

fun threadedStateSummary(): String {
  var outcome = "pending"
  val block: suspend () -> Int = { threadedStateValue(6) }
  block.startCoroutine(object : Continuation<Int> {
    override val context = EmptyCoroutineContext

    override fun resumeWith(result: Result<Int>) {
      outcome = "thread=" + result.getOrThrow()
    }
  })
  val beforeResume = outcome
  val thread = Thread {
    val continuation = threadedContinuation ?: return@Thread
    threadedContinuation = null
    continuation.resume(4)
  }
  thread.start()
  thread.join()
  return beforeResume + "->" + outcome
}

suspend fun executorStateValue(seed: Int): Int {
  val resumed = suspendCoroutine<Int> { continuation ->
    executorContinuation = continuation
  }
  return seed + resumed
}

fun executorStateSummary(): String {
  var outcome = "pending"
  val executor = Executors.newSingleThreadExecutor()
  try {
    val block: suspend () -> Int = { executorStateValue(5) }
    block.startCoroutine(object : Continuation<Int> {
      override val context = EmptyCoroutineContext

      override fun resumeWith(result: Result<Int>) {
        outcome = "executor=" + result.getOrThrow()
      }
    })
    val beforeResume = outcome
    val future = executor.submit {
      val continuation = executorContinuation ?: return@submit
      executorContinuation = null
      continuation.resume(8)
    }
    future.get()
    return beforeResume + "->" + outcome
  } finally {
    executor.shutdown()
  }
}

fun dispatchedStateSummary(): String {
  var outcome = "pending"
  val dispatcher = SmokeQueueDispatcher()
  val block: suspend () -> Int = {
    val first = suspendCoroutine<Int> { continuation ->
      dispatchedContinuation = continuation
    }
    val second = suspendCoroutine<Int> { continuation ->
      dispatchedContinuation = continuation
    }
    2 + first * 10 + second
  }
  block.startCoroutine(object : Continuation<Int> {
    override val context: CoroutineContext = dispatcher

    override fun resumeWith(result: Result<Int>) {
      outcome = "dispatch=" + result.getOrThrow()
    }
  })

  val beforeStart = outcome
  var startSteps = 0
  while (dispatcher.queue.isNotEmpty()) {
    dispatcher.queue.removeFirst().invoke()
    startSteps++
  }
  val afterStart = outcome
  val first = dispatchedContinuation ?: return "missing-first"
  dispatchedContinuation = null
  first.resume(3)
  val afterFirstResume = outcome
  var firstSteps = 0
  while (dispatcher.queue.isNotEmpty()) {
    dispatcher.queue.removeFirst().invoke()
    firstSteps++
  }
  val afterFirstDrain = outcome
  val second = dispatchedContinuation ?: return "missing-second"
  dispatchedContinuation = null
  second.resume(4)
  val afterSecondResume = outcome
  var secondSteps = 0
  while (dispatcher.queue.isNotEmpty()) {
    dispatcher.queue.removeFirst().invoke()
    secondSteps++
  }
  return beforeStart + ">" +
      startSteps + ">" +
      afterStart + ">" +
      afterFirstResume + ">" +
      firstSteps + ">" +
      afterFirstDrain + ">" +
      afterSecondResume + ">" +
      secondSteps + ">" +
      outcome
}
