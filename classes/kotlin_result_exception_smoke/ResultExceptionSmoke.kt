private class ResultSmokeException(message: String) : RuntimeException(message)

private inline fun <T> captureResult(
  label: String,
  events: MutableList<String>,
  block: () -> T
): Result<T> =
  runCatching {
    events += "enter:$label"
    block()
  }.onSuccess {
    events += "ok:$label"
  }.onFailure { throwable ->
    events += "fail:$label:${throwable::class.java.simpleName}:${throwable.message}"
  }

fun resultExceptionSummary(): String {
  val events = mutableListOf<String>()

  val success = captureResult("a", events) { 21 }
    .map { it + 1 }
    .mapCatching { value -> if (value > 20) value * 2 else error("small") }
    .onSuccess { events += "mapped:$it" }
    .getOrThrow()

  val recovered = captureResult<Int>("b", events) {
    throw ResultSmokeException("boom")
  }.recover { throwable ->
    events += "recover:${throwable.message}"
    5
  }.map { it + 7 }
    .getOrElse { -1 }

  val caught = captureResult("c", events) { 4 }
    .mapCatching { value ->
      if (value == 4) throw IllegalArgumentException("bad$value")
      value
    }.recoverCatching { throwable ->
      events += "recoverCatching:${throwable.message}"
      throw IllegalStateException("again")
    }
  val failureName = caught.exceptionOrNull()?.javaClass?.simpleName ?: "none"
  val defaulted = caught.getOrDefault(99)
  val elseValue = caught.getOrElse { throwable ->
    events += "else:${throwable.message}"
    77
  }

  val boxed = listOf(
    Result.success(success),
    caught,
    Result.failure(UnsupportedOperationException("manual"))
  )
  val boxedSummary = boxed.mapIndexed { index, result ->
    result.fold(
      onSuccess = { value -> "$index=ok$value" },
      onFailure = { throwable -> "$index=err${throwable::class.java.simpleName}:${throwable.message}" }
    )
  }.joinToString(",")

  val finalLog = mutableListOf<String>()
  val finallyValue = try {
    runCatching {
      finalLog += "body"
      error("inner")
    }.recover { throwable ->
      finalLog += "recover:${throwable.message}"
      6
    }.getOrThrow()
  } finally {
    finalLog += "finally"
  }

  val causeSummary = runCatching {
    throw IllegalArgumentException("wrap", ResultSmokeException("root"))
  }.exceptionOrNull()?.let { throwable ->
    "${throwable::class.java.simpleName}:${throwable.cause?.message}"
  } ?: "none"

  val labelValue = runCatching found@{
    listOf(1, 2, 3).forEach { value ->
      if (value == 2) return@found "two"
    }
    "none"
  }.getOrThrow()

  return success.toString() + "|" +
    recovered + "|" +
    failureName + "/" + defaulted + "/" + elseValue + "|" +
    boxedSummary + "|" +
    finallyValue + ":" + finalLog.joinToString(">") + "|" +
    causeSummary + "|" +
    labelValue + "|" +
    events.joinToString(">")
}
