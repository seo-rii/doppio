enum class PipelineState { PARSE, LOWER, CODEGEN, EMIT }

enum class DiagnosticKind { INFO, WARN, ERROR }

fun stateScore(state: PipelineState): Int {
  return when (state) {
    PipelineState.PARSE -> 1
    PipelineState.LOWER -> 3
    PipelineState.CODEGEN -> 5
    PipelineState.EMIT -> 7
  }
}

fun nullableStateLabel(state: PipelineState?): String {
  return when (state) {
    null -> "nil"
    PipelineState.PARSE -> "p"
    PipelineState.LOWER -> "l"
    PipelineState.CODEGEN -> "c"
    PipelineState.EMIT -> "e"
  }
}

fun diagnosticWeight(kind: DiagnosticKind): Int {
  return when (kind) {
    DiagnosticKind.INFO -> 2
    DiagnosticKind.WARN -> 4
    DiagnosticKind.ERROR -> 8
  }
}

fun routePhase(name: String): Int {
  return when (name) {
    "parse" -> 10
    "lower" -> 20
    "codegen" -> 30
    "emit" -> 40
    else -> -1
  }
}

fun rangeBucket(value: Int): String {
  return when {
    value < 0 -> "neg"
    value == 0 -> "zero"
    value in 1..3 -> "small"
    else -> "big"
  }
}

fun whenMappingSummary(): String {
  val scores = PipelineState.entries.joinToString("") { state ->
    stateScore(state).toString()
  }
  val labels = listOf(null, PipelineState.PARSE, PipelineState.EMIT).joinToString("") { state ->
    nullableStateLabel(state)
  }
  val diagnostics = DiagnosticKind.entries.sumOf { kind ->
    diagnosticWeight(kind)
  }
  val routes = listOf("parse", "codegen", "missing", "emit").map { name ->
    routePhase(name)
  }.joinToString(",")
  val buckets = listOf(-1, 0, 2, 9).joinToString("|") { value ->
    rangeBucket(value)
  }
  return scores + ":" + labels + ":" + diagnostics + ":" + routes + ":" + buckets
}
