package classes.modern_test;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;

public class Java12CompletableFutureExceptionally {
  public static void main(String[] args) throws Exception {
    Executor direct = new Executor() {
      public void execute(Runnable command) {
        command.run();
      }
    };

    CompletableFuture<String> ok = CompletableFuture.completedFuture("ok");
    final AtomicInteger okCalls = new AtomicInteger();
    CompletableFuture<String> okResult = ok.exceptionallyAsync(new Function<Throwable, String>() {
      public String apply(Throwable throwable) {
        okCalls.incrementAndGet();
        return "bad";
      }
    }, direct);
    System.out.println("async-success=" + okResult.join() + ":" + okCalls.get());

    CompletableFuture<String> failed = new CompletableFuture<String>();
    failed.completeExceptionally(new IllegalStateException("bad"));
    CompletableFuture<String> recovered = failed.exceptionallyAsync(new Function<Throwable, String>() {
      public String apply(Throwable throwable) {
        return throwable.getClass().getName() + ":" + throwable.getMessage();
      }
    }, direct);
    System.out.println("async-failed=" + recovered.join());

    CompletableFuture<String> defaultRecovered = failed.exceptionallyAsync(new Function<Throwable, String>() {
      public String apply(Throwable throwable) {
        return "default:" + throwable.getClass().getSimpleName();
      }
    });
    System.out.println("async-default=" + defaultRecovered.get(5, TimeUnit.SECONDS));

    final CompletableFuture<String> thrown = failed.exceptionallyAsync(new Function<Throwable, String>() {
      public String apply(Throwable throwable) {
        throw new IllegalArgumentException("handler");
      }
    }, direct);
    printFailure("async-throw", new CheckedRunnable() {
      public void run() {
        thrown.join();
      }
    }, true);

    CompletableFuture<String> composed = failed.exceptionallyCompose(new Function<Throwable, CompletionStage<String>>() {
      public CompletionStage<String> apply(Throwable throwable) {
        return CompletableFuture.completedFuture("compose:" + throwable.getMessage());
      }
    });
    System.out.println("compose=" + composed.join());

    CompletableFuture<String> composedAsync = failed.exceptionallyComposeAsync(new Function<Throwable, CompletionStage<String>>() {
      public CompletionStage<String> apply(Throwable throwable) {
        return CompletableFuture.completedFuture("composeAsync:" + throwable.getClass().getSimpleName());
      }
    }, direct);
    System.out.println("compose-async=" + composedAsync.join());

    final CompletableFuture<String> composeFailed = failed.exceptionallyCompose(new Function<Throwable, CompletionStage<String>>() {
      public CompletionStage<String> apply(Throwable throwable) {
        return CompletableFuture.failedFuture(new UnsupportedOperationException("nested"));
      }
    });
    printFailure("compose-failed", new CheckedRunnable() {
      public void run() {
        composeFailed.join();
      }
    }, true);

    final CompletableFuture<String> composeNull = failed.exceptionallyCompose(new Function<Throwable, CompletionStage<String>>() {
      public CompletionStage<String> apply(Throwable throwable) {
        return null;
      }
    });
    printFailure("compose-null", new CheckedRunnable() {
      public void run() {
        composeNull.join();
      }
    }, false);

    printFailure("null-async", new CheckedRunnable() {
      public void run() {
        ok.exceptionallyAsync(null);
      }
    }, false);
    printFailure("null-executor", new CheckedRunnable() {
      public void run() {
        ok.exceptionallyAsync(new Function<Throwable, String>() {
          public String apply(Throwable throwable) {
            return "unused";
          }
        }, null);
      }
    }, false);
    printFailure("null-compose", new CheckedRunnable() {
      public void run() {
        ok.exceptionallyCompose(null);
      }
    }, false);

    Executor rejecting = new Executor() {
      public void execute(Runnable command) {
        throw new RejectedExecutionException("reject");
      }
    };
    final CompletableFuture<String> rejected = failed.exceptionallyAsync(new Function<Throwable, String>() {
      public String apply(Throwable throwable) {
        return "unused";
      }
    }, rejecting);
    printFailure("reject-async", new CheckedRunnable() {
      public void run() {
        rejected.join();
      }
    }, true);

    final AtomicInteger successRejectCalls = new AtomicInteger();
    Executor successRejecting = new Executor() {
      public void execute(Runnable command) {
        successRejectCalls.incrementAndGet();
        throw new RejectedExecutionException("success-reject");
      }
    };
    final CompletableFuture<String> successRejected = ok.exceptionallyAsync(new Function<Throwable, String>() {
      public String apply(Throwable throwable) {
        return "unused";
      }
    }, successRejecting);
    printFailure("success-reject", new CheckedRunnable() {
      public void run() {
        successRejected.join();
      }
    }, true, ":" + successRejectCalls.get());
  }

  private static void printFailure(String label, CheckedRunnable runnable, boolean includeMessage) {
    printFailure(label, runnable, includeMessage, "");
  }

  private static void printFailure(String label, CheckedRunnable runnable, boolean includeMessage, String suffix) {
    try {
      runnable.run();
      System.out.println(label + ":no-failure" + suffix);
    } catch (Throwable t) {
      String text = label + ":" + t.getClass().getName();
      if (t.getCause() != null) {
        text += ":" + t.getCause().getClass().getName();
        if (includeMessage && t.getCause().getMessage() != null) {
          text += ":" + t.getCause().getMessage();
        }
      } else if (includeMessage && t.getMessage() != null) {
        text += ":" + t.getMessage();
      }
      System.out.println(text + suffix);
    }
  }

  private interface CheckedRunnable {
    void run() throws Exception;
  }
}
