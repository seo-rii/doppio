import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

fun completableFutureSummary(): String {
  val executor = Executors.newSingleThreadExecutor()
  return try {
    val chained = CompletableFuture.supplyAsync({ "kt" }, executor)
      .thenApply { value -> value.uppercase() + value.length }
      .thenCompose { text -> CompletableFuture.completedFuture("$text!") }
    val recovered = CompletableFuture.supplyAsync<Int>({
      throw IllegalStateException("boom")
    }, executor).handle { value, error ->
      if (error == null) value else 5
    }
    val raced = CompletableFuture.completedFuture("left")
      .applyToEither(CompletableFuture<String>()) { value -> value.take(1) }
    val combined = chained.thenCombine(recovered) { text, value -> "$text:$value" }
    CompletableFuture.allOf(combined, raced)
      .thenApply { "${combined.join()}:${raced.join()}" }
      .get(10, TimeUnit.SECONDS)
  } finally {
    executor.shutdown()
  }
}
