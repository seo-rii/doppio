package classes.modern_test;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;

public class Java12CompletionStageExceptionally {
  public static void main(String[] args) {
    Executor direct = new Executor() {
      public void execute(Runnable command) {
        command.run();
      }
    };

    CompletionStage<String> ok = CompletableFuture.completedFuture("ok");
    final AtomicInteger okCalls = new AtomicInteger();
    CompletionStage<String> okResult = ok.exceptionallyAsync(new Function<Throwable, String>() {
      public String apply(Throwable throwable) {
        okCalls.incrementAndGet();
        return "bad";
      }
    }, direct);
    System.out.println(okResult.toCompletableFuture().join() + ":" + okCalls.get() + ":" + (okResult instanceof CompletableFuture));

    CompletableFuture<String> failedFuture = new CompletableFuture<String>();
    failedFuture.completeExceptionally(new IllegalStateException("bad"));
    CompletionStage<String> failed = failedFuture;
    System.out.println(failed.exceptionallyAsync(new Function<Throwable, String>() {
      public String apply(Throwable throwable) {
        return throwable.getClass().getName() + ":" + throwable.getMessage();
      }
    }, direct).toCompletableFuture().join());

    System.out.println(failed.exceptionallyCompose(new Function<Throwable, CompletionStage<String>>() {
      public CompletionStage<String> apply(Throwable throwable) {
        return CompletableFuture.completedFuture("compose:" + throwable.getMessage());
      }
    }).toCompletableFuture().join());

    System.out.println(failed.exceptionallyComposeAsync(new Function<Throwable, CompletionStage<String>>() {
      public CompletionStage<String> apply(Throwable throwable) {
        return CompletableFuture.completedFuture("composeAsync:" + throwable.getClass().getSimpleName());
      }
    }, direct).toCompletableFuture().join());

    final CompletionStage<String> composeNull = failed.exceptionallyCompose(new Function<Throwable, CompletionStage<String>>() {
      public CompletionStage<String> apply(Throwable throwable) {
        return null;
      }
    });
    printFailure("compose-null", new CheckedRunnable() {
      public void run() {
        composeNull.toCompletableFuture().join();
      }
    });

    printFailure("null-async", new CheckedRunnable() {
      public void run() {
        ok.exceptionallyAsync(null);
      }
    });
    printFailure("null-executor", new CheckedRunnable() {
      public void run() {
        ok.exceptionallyAsync(new Function<Throwable, String>() {
          public String apply(Throwable throwable) {
            return "unused";
          }
        }, null);
      }
    });
    printFailure("null-compose", new CheckedRunnable() {
      public void run() {
        ok.exceptionallyCompose(null);
      }
    });
  }

  private static void printFailure(String label, CheckedRunnable runnable) {
    try {
      runnable.run();
      System.out.println(label + ":no-failure");
    } catch (Throwable t) {
      String text = label + ":" + t.getClass().getName();
      if (t.getCause() != null) {
        text += ":" + t.getCause().getClass().getName();
      }
      System.out.println(text);
    }
  }

  private interface CheckedRunnable {
    void run() throws Exception;
  }
}
