import kotlin.properties.Delegates

object InitializationRecorder {
  private val events = mutableListOf<String>()

  fun reset() {
    events.clear()
  }

  fun add(event: String): Int {
    events += event
    return events.size
  }

  fun snapshot(): String = events.joinToString(">")
}

class InitializationDelegateOwner(private val seed: String) {
  companion object {
    val companionMark: Int = InitializationRecorder.add("companion")
  }

  object Nested {
    val nestedMark: Int = InitializationRecorder.add("nested")
  }

  lateinit var late: String
  var required: Int by Delegates.notNull()
  val lazyValue: String by lazy(LazyThreadSafetyMode.NONE) {
    InitializationRecorder.add("lazy")
    late + ":" + required + ":" + companionMark
  }
  var observed: String by Delegates.observable("start") { property, old, new ->
    InitializationRecorder.add(property.name + ":" + old + "->" + new)
  }
  var guarded: Int by Delegates.vetoable(seed.length) { property, old, new ->
    InitializationRecorder.add(property.name + ":" + old + "?" + new)
    new >= old
  }

  fun summarize(): String {
    val before = this::late.isInitialized
    late = seed.uppercase()
    required = seed.length + 3
    val after = this::late.isInitialized
    observed = seed
    guarded = 1
    val rejected = guarded
    guarded = 9
    val accepted = guarded
    val first = lazyValue
    val second = lazyValue
    val nested = Nested.nestedMark
    return before.toString() + "/" + after + "|" +
      first + "|" +
      second + "|" +
      observed + "|" +
      rejected + "/" + accepted + "/" + nested + "|" +
      InitializationRecorder.snapshot()
  }
}

fun initializationDelegateSummary(): String {
  InitializationRecorder.reset()
  return InitializationDelegateOwner("kt").summarize()
}
