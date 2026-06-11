package classes.modern_test;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

public class Java9CompletableFutureCompleteAsync {
  public static void main(String[] args) throws Exception {
    CompletableFuture<String> defaultFuture = new CompletableFuture<String>();
    CompletableFuture<String> defaultReturned = defaultFuture.completeAsync(new Supplier<String>() {
      public String get() {
        return "default";
      }
    });
    System.out.println(defaultReturned == defaultFuture);
    System.out.println(defaultFuture.get(5, TimeUnit.SECONDS));

    Executor direct = new Executor() {
      public void execute(Runnable command) {
        command.run();
      }
    };
    CompletableFuture<String> directFuture = new CompletableFuture<String>();
    System.out.println(directFuture.completeAsync(new Supplier<String>() {
      public String get() {
        return "direct";
      }
    }, direct) == directFuture);
    System.out.println(directFuture.join());

    CompletableFuture<String> failed = new CompletableFuture<String>();
    failed.completeAsync(new Supplier<String>() {
      public String get() {
        throw new IllegalStateException("boom");
      }
    }, direct);
    printFailure("supplier", new CheckedRunnable() {
      public void run() {
        failed.join();
      }
    });

    final AtomicInteger calls = new AtomicInteger();
    CompletableFuture<String> completed = CompletableFuture.completedFuture("done");
    CompletableFuture<String> completedReturned = completed.completeAsync(new Supplier<String>() {
      public String get() {
        calls.incrementAndGet();
        return "changed";
      }
    }, direct);
    System.out.println(completedReturned == completed);
    System.out.println(completed.join() + ":" + calls.get());

    printFailure("null-supplier", new CheckedRunnable() {
      public void run() {
        new CompletableFuture<String>().completeAsync(null);
      }
    });
    printFailure("null-executor", new CheckedRunnable() {
      public void run() {
        new CompletableFuture<String>().completeAsync(new Supplier<String>() {
          public String get() {
            return "unused";
          }
        }, null);
      }
    });
    printFailure("null-both", new CheckedRunnable() {
      public void run() {
        new CompletableFuture<String>().completeAsync(null, null);
      }
    });

    Executor rejecting = new Executor() {
      public void execute(Runnable command) {
        throw new RejectedExecutionException("reject");
      }
    };
    final CompletableFuture<String> rejected = new CompletableFuture<String>();
    printFailure("reject", new CheckedRunnable() {
      public void run() {
        rejected.completeAsync(new Supplier<String>() {
          public String get() {
            return "unused";
          }
        }, rejecting);
      }
    });
    System.out.println(rejected.isDone());
  }

  private static void printFailure(String label, CheckedRunnable runnable) {
    try {
      runnable.run();
      System.out.println(label + ":no-failure");
    } catch (Throwable t) {
      String text = label + ":" + t.getClass().getName();
      if (t.getCause() != null) {
        text += ":" + t.getCause().getClass().getName() + ":" + t.getCause().getMessage();
      } else if (t.getMessage() != null) {
        text += ":" + t.getMessage();
      }
      System.out.println(text);
    }
  }

  private interface CheckedRunnable {
    void run() throws Exception;
  }
}
