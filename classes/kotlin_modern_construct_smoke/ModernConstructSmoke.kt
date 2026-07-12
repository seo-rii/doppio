fun interface StageMapper {
  fun map(value: Int): Int
}

sealed interface StageNode {
  fun score(): Int
}

data object EmptyStage : StageNode {
  override fun score(): Int = 1
}

data class ValueStage(val value: Int) : StageNode {
  override fun score(): Int = value
}

enum class StageKind { ALPHA, BETA, GAMMA }

class StagePayload(val title: String, val count: Int)

fun modernConstructSummary(): String {
  val mapper = StageMapper { value -> value * value + 1 }
  val nodes = listOf<StageNode>(EmptyStage, ValueStage(4), ValueStage(mapper.map(3)))
  val nodeScore = nodes.sumOf { node ->
    when (node) {
      EmptyStage -> node.score()
      is ValueStage -> node.score()
    }
  }
  val entries = StageKind.entries.joinToString("") { entry ->
    entry.name.first().toString()
  }
  val payload = StagePayload("kt", 5)
  val title = StagePayload::title
  val count = StagePayload::count
  val sameObject = EmptyStage == EmptyStage
  return entries + ":" +
      StageKind.entries[1].ordinal + ":" +
      nodeScore + ":" +
      title(payload) + count(payload) + ":" +
      StagePayload::class.java.simpleName + ":" +
      EmptyStage.toString() + ":" +
      sameObject + ":" +
      contextParameterSummary()
}
