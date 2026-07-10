package classes.modern_test;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class Java9CompletableFutureTimeouts {
  public static void main(String[] args) throws Exception {
    CompletableFuture<String> timedOut = new CompletableFuture<String>();
    CompletableFuture<String> timeoutReturned = timedOut.orTimeout(50, TimeUnit.MILLISECONDS);
    System.out.println(timeoutReturned == timedOut);
    printFailure("or-timeout", new CheckedRunnable() {
      public void run() throws Exception {
        timedOut.get(5, TimeUnit.SECONDS);
      }
    });

    CompletableFuture<String> completedOnTimeout = new CompletableFuture<String>();
    CompletableFuture<String> completedReturned =
      completedOnTimeout.completeOnTimeout("fallback", 50, TimeUnit.MILLISECONDS);
    System.out.println(completedReturned == completedOnTimeout);
    System.out.println(completedOnTimeout.get(5, TimeUnit.SECONDS));

    CompletableFuture<String> already = CompletableFuture.completedFuture("done");
    already.orTimeout(20, TimeUnit.MILLISECONDS).completeOnTimeout("fallback", 20, TimeUnit.MILLISECONDS);
    Thread.sleep(120);
    System.out.println(already.join());

    Executor direct = new Executor() {
      public void execute(Runnable command) {
        command.run();
      }
    };
    final CompletableFuture<Integer> delayedDone = new CompletableFuture<Integer>();
    CompletableFuture.delayedExecutor(50, TimeUnit.MILLISECONDS, direct).execute(new Runnable() {
      public void run() {
        delayedDone.complete(1);
      }
    });
    System.out.println(delayedDone.get(5, TimeUnit.SECONDS));

    final CompletableFuture<Integer> defaultDelayedDone = new CompletableFuture<Integer>();
    CompletableFuture.delayedExecutor(0, TimeUnit.MILLISECONDS).execute(new Runnable() {
      public void run() {
        defaultDelayedDone.complete(1);
      }
    });
    System.out.println(defaultDelayedDone.get(5, TimeUnit.SECONDS));

    printFailure("delayed-null-command", new CheckedRunnable() {
      public void run() {
        CompletableFuture.delayedExecutor(1, TimeUnit.MILLISECONDS, direct).execute(null);
      }
    });
    printFailure("delayed-throwing-command", new CheckedRunnable() {
      public void run() {
        CompletableFuture.delayedExecutor(1, TimeUnit.MILLISECONDS, direct).execute(new Runnable() {
          public void run() {
            throw new IllegalStateException("delayed");
          }
        });
      }
    });

    final AtomicInteger negativeDelayCalls = new AtomicInteger();
    CompletableFuture.delayedExecutor(-1, TimeUnit.MILLISECONDS, direct).execute(new Runnable() {
      public void run() {
        negativeDelayCalls.incrementAndGet();
      }
    });
    Thread.sleep(120);
    System.out.println(negativeDelayCalls.get());

    printFailure("or-null-unit", new CheckedRunnable() {
      public void run() {
        new CompletableFuture<String>().orTimeout(1, null);
      }
    });
    printFailure("complete-null-unit", new CheckedRunnable() {
      public void run() {
        new CompletableFuture<String>().completeOnTimeout("x", 1, null);
      }
    });
    printFailure("delayed-null-unit", new CheckedRunnable() {
      public void run() {
        CompletableFuture.delayedExecutor(1, null);
      }
    });
    printFailure("delayed-null-executor", new CheckedRunnable() {
      public void run() {
        CompletableFuture.delayedExecutor(1, TimeUnit.MILLISECONDS, null);
      }
    });
    printFailure("delayed-null-both", new CheckedRunnable() {
      public void run() {
        CompletableFuture.delayedExecutor(1, null, null);
      }
    });

    final CompletableFuture<String> negativeTimeout = new CompletableFuture<String>();
    negativeTimeout.orTimeout(-1, TimeUnit.MILLISECONDS);
    printFailure("or-negative", new CheckedRunnable() {
      public void run() throws Exception {
        negativeTimeout.get(5, TimeUnit.SECONDS);
      }
    });

    CompletableFuture<String> negativeComplete = new CompletableFuture<String>();
    negativeComplete.completeOnTimeout("negative", -1, TimeUnit.MILLISECONDS);
    System.out.println(negativeComplete.get(5, TimeUnit.SECONDS));
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
