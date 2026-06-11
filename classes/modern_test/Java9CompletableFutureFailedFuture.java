package classes.modern_test;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;

public class Java9CompletableFutureFailedFuture {
  public static void main(String[] args) {
    IllegalArgumentException failure = new IllegalArgumentException("bad");
    CompletableFuture<String> future = CompletableFuture.failedFuture(failure);
    System.out.println(future.isDone());
    System.out.println(future.isCompletedExceptionally());
    System.out.println(future.exceptionally(t -> t.getClass().getName() + ":" + t.getMessage()).join());
    printFailure("get", () -> {
      try {
        future.get();
      } catch (ExecutionException e) {
        System.out.println("get-cause:" + e.getCause().getClass().getName() + ":" + e.getCause().getMessage());
        throw e;
      }
    });
    printFailure("join", () -> future.join());
    printFailure("null", () -> CompletableFuture.failedFuture(null));
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
    void run() throws Exception;
  }
}
