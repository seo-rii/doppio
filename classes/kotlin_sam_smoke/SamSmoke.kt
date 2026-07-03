import java.util.Comparator
import java.util.concurrent.Callable
import java.util.function.IntUnaryOperator
import java.util.function.Predicate
import java.util.function.Supplier

fun interface SamLabeler {
  fun label(value: Int): String
}

class SamBox(private val prefix: String) {
  fun label(value: Int): String = "$prefix${value + 1}"
}

fun samSummary(): String {
  val labeler = SamLabeler { value -> "L${value * 2}" }
  val methodLabeler = SamLabeler(SamBox("M")::label)
  val unary = IntUnaryOperator { value -> value + 3 }
  val supplier = Supplier { labeler.label(unary.applyAsInt(4)) }

  val log = StringBuilder()
  val runnable = Runnable { log.append("run") }
  runnable.run()

  val comparator = Comparator<String> { left, right ->
    val byLength = left.length.compareTo(right.length)
    if (byLength != 0) byLength else left.compareTo(right)
  }
  val sorted = listOf("bb", "a", "cc").sortedWith(comparator).joinToString("")

  val callable = Callable { methodLabeler.label(5) }
  val predicate = Predicate<String> { value -> value.length == 2 }
  val filtered = listOf("a", "bb", "cc").filter(predicate::test).joinToString("")

  return "${supplier.get()}|$log|$sorted|${callable.call()}|$filtered"
}
