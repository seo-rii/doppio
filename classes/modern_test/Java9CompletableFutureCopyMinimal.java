package classes.modern_test;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.CompletionStage;

public class Java9CompletableFutureCopyMinimal {
  public static void main(String[] args) {
    CompletableFuture<String> done = CompletableFuture.completedFuture("ok");
    CompletableFuture<String> copy = done.copy();
    System.out.println(copy.join());
    System.out.println(copy.getClass().getName());
    System.out.println(copy.complete("changed"));
    System.out.println(copy.join());

    CompletionStage<String> minimal = done.minimalCompletionStage();
    System.out.println(minimal.toCompletableFuture().join());
    System.out.println(minimal instanceof CompletableFuture);
    printFailure("minimal-isDone", () -> ((CompletableFuture<String>) minimal).isDone());

    CompletableFuture<String> pending = new CompletableFuture<String>();
    CompletableFuture<String> pendingCopy = pending.copy();
    CompletionStage<String> pendingMinimal = pending.minimalCompletionStage();
    System.out.println(pendingCopy.isDone());
    System.out.println(pendingMinimal.toCompletableFuture().isDone());
    System.out.println(pending.complete("later"));
    System.out.println(pendingCopy.join());
    System.out.println(pendingMinimal.toCompletableFuture().join());

    CompletableFuture<String> failed = CompletableFuture.failedFuture(new IllegalStateException("bad"));
    printFailure("copy-failed", () -> failed.copy().join());
    printFailure("minimal-failed", () -> failed.minimalCompletionStage().toCompletableFuture().join());
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
