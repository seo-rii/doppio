package classes.modern_test;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.CompletionStage;

public class Java9CompletableFutureStageFactories {
  public static void main(String[] args) {
    CompletionStage<String> completed = CompletableFuture.completedStage("ok");
    System.out.println(completed.toCompletableFuture().join());
    System.out.println(completed.toCompletableFuture().getClass().getName());
    System.out.println(completed instanceof CompletableFuture);
    System.out.println(completed.thenApply(value -> value + "!").toCompletableFuture().join());
    printFailure("completed-isDone", () -> ((CompletableFuture<String>) completed).isDone());
    printFailure("completed-complete", () -> ((CompletableFuture<String>) completed).complete("changed"));
    printFailure("completed-cancel", () -> ((CompletableFuture<String>) completed).cancel(true));
    printFailure("completed-obtrude", () -> ((CompletableFuture<String>) completed).obtrudeValue("changed"));
    printFailure("completed-complete-async", () -> ((CompletableFuture<String>) completed).completeAsync(() -> "changed"));
    printFailure("completed-complete-async-executor", () -> ((CompletableFuture<String>) completed).completeAsync(
        () -> "changed",
        command -> command.run()));
    printFailure("completed-or-timeout", () -> ((CompletableFuture<String>) completed).orTimeout(1, java.util.concurrent.TimeUnit.MILLISECONDS));
    printFailure("completed-complete-on-timeout", () -> ((CompletableFuture<String>) completed).completeOnTimeout("changed", 1, java.util.concurrent.TimeUnit.MILLISECONDS));
    printFailure("completed-dependents", () -> ((CompletableFuture<String>) completed).getNumberOfDependents());
    System.out.println(CompletableFuture.completedStage(null).toCompletableFuture().join() == null);

    CompletionStage<String> failed = CompletableFuture.failedStage(new IllegalArgumentException("bad"));
    System.out.println(failed.toCompletableFuture().isCompletedExceptionally());
    System.out.println(failed.exceptionally(t -> t.getClass().getName() + ":" + t.getMessage()).toCompletableFuture().join());
    printFailure("failed-join", () -> failed.toCompletableFuture().join());
    printFailure("failed-complete", () -> ((CompletableFuture<String>) failed).complete("changed"));
    printFailure("failed-null", () -> CompletableFuture.failedStage(null));
  }

  private static void printFailure(String label, Throwing action) {
    try {
      action.run();
      System.out.println(label + ":ok");
    } catch (Throwable t) {
      Throwable cause = t instanceof CompletionException ? t.getCause() : t;
      System.out.println(label + ":" + t.getClass().getName() + ":" + (cause == null ? "null" : cause.getClass().getName()));
    }
  }

  private interface Throwing {
    void run();
  }
}
