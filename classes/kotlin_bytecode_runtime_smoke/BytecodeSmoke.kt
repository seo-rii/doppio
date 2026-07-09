import java.io.Closeable

private object BytecodeLock

class ClosingSmoke : Closeable {
  var closed: Boolean = false

  fun payload(): Int = 7

  override fun close() {
    closed = true
  }
}

class ThrowingCloseSmoke : Closeable {
  fun fail(): Nothing {
    throw IllegalStateException("body")
  }

  override fun close() {
    throw IllegalArgumentException("close")
  }
}

class ComponentSmoke(private val first: Int, private val second: String) {
  operator fun component1(): Int = first
  operator fun component2(): String = second
}

fun stackTraceSourceSummary(): String {
  val frame = try {
    throw IllegalStateException("stack")
  } catch (e: IllegalStateException) {
    e.stackTrace.first { it.className == "BytecodeSmokeKt" && it.methodName == "stackTraceSourceSummary" }
  }
  return frame.fileName + ":" + (frame.lineNumber > 0)
}

fun bytecodeSummary(): String {
  val trace = mutableListOf<String>()
  val caught = try {
    trace += "try"
    throw IllegalArgumentException("boom")
  } catch (e: IllegalArgumentException) {
    trace += "catch"
    e.message ?: "missing"
  } finally {
    trace += "finally"
  }

  val closeable = ClosingSmoke()
  val useValue = closeable.use { it.payload() + 1 }
  val suppressedSummary = try {
    ThrowingCloseSmoke().use { it.fail() }
  } catch (e: IllegalStateException) {
    e.message + "/" + e.suppressed.single().message
  }

  val (number, label) = ComponentSmoke(3, "x")
  var rangeTotal = 0
  for (i in 1..4) {
    rangeTotal += i
  }
  var steppedTotal = 0
  for (i in 6 downTo 2 step 2) {
    steppedTotal += i
  }
  val indexed = listOf("a", "bb").mapIndexed { index, value -> index + value.length }.sum()
  val sync = synchronized(BytecodeLock) { "sync" }

  return trace.joinToString(">") + ":" + caught + ":" + useValue + ":" + closeable.closed +
    ":" + suppressedSummary + ":" + label + number + ":" + rangeTotal + ":" + steppedTotal +
    ":" + indexed + ":" + sync + ":" + stackTraceSourceSummary()
}
