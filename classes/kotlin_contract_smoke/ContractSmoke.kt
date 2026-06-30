import kotlin.contracts.ExperimentalContracts
import kotlin.contracts.InvocationKind
import kotlin.contracts.contract

@OptIn(ExperimentalContracts::class)
inline fun <T> requirePresent(value: T?, label: String, block: (T) -> String): String {
  contract {
    returns() implies (value != null)
    callsInPlace(block, InvocationKind.AT_MOST_ONCE)
  }
  if (value == null) {
    throw IllegalArgumentException(label)
  }
  return block(value)
}

@OptIn(ExperimentalContracts::class)
fun isNonBlank(value: String?): Boolean {
  contract {
    returns(true) implies (value != null)
  }
  return value != null && value.isNotBlank()
}

@OptIn(ExperimentalContracts::class)
inline fun exactlyOnce(events: MutableList<String>, block: () -> Unit) {
  contract {
    callsInPlace(block, InvocationKind.EXACTLY_ONCE)
  }
  events += "before"
  block()
  events += "after"
}

fun contractSmokeSummary(): String {
  val events = mutableListOf<String>()
  var captured = 0
  exactlyOnce(events) {
    captured += 7
    events += "body$captured"
  }
  val present = requirePresent("kt", "missing") { value ->
    value.uppercase() + value.length
  }
  val failure = try {
    requirePresent(null as String?, "missing") { it }
  } catch (e: IllegalArgumentException) {
    e.message ?: "?"
  }
  val smartCastLengths = listOf("a", " ", null, "bb").joinToString("") { value ->
    if (isNonBlank(value)) value.length.toString() else "0"
  }
  return present + "|" +
    failure + "|" +
    events.joinToString(">") + "|" +
    captured + "|" +
    smartCastLengths
}
