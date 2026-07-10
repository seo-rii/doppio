package classes.modern_test;

import java.util.ArrayDeque;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Executor;
import java.util.function.Function;
import java.util.function.Supplier;

public class Java12CompletableFutureSubclassHooks {
  public static void main(String[] args) throws Exception {
    RecordingExecutor executor = new RecordingExecutor();

    HookedFuture<String> source = new HookedFuture<String>(executor);
    CompletableFuture<String> created = source.newIncompleteFuture();
    System.out.println(created.getClass().getName().endsWith("HookedFuture"));
    System.out.println(((HookedFuture<?>) created).executor == executor);
    System.out.println(source.newIncompleteCalls);

    CompletableFuture<String> copied = source.copy();
    System.out.println(copied.getClass().getName().endsWith("HookedFuture"));
    System.out.println(source.newIncompleteCalls);
    source.complete("copy");
    System.out.println(copied.join());

    HookedFuture<String> async = new HookedFuture<String>(executor);
    System.out.println(async.completeAsync(new Supplier<String>() {
      public String get() {
        return "async";
      }
    }) == async);
    System.out.println(executor.size());
    System.out.println(async.isDone());
    executor.runNext();
    System.out.println(async.join());

    HookedFuture<String> failed = new HookedFuture<String>(executor);
    failed.completeExceptionally(new IllegalArgumentException("bad"));
    CompletableFuture<String> recovered = failed.exceptionallyAsync(new Function<Throwable, String>() {
      public String apply(Throwable throwable) {
        return "recovered:" + throwable.getClass().getSimpleName();
      }
    });
    System.out.println(recovered.getClass().getName().endsWith("HookedFuture"));
    System.out.println(executor.size());
    executor.runNext();
    System.out.println(recovered.join());

    HookedFuture<String> composeFailed = new HookedFuture<String>(executor);
    composeFailed.completeExceptionally(new IllegalStateException("compose"));
    CompletableFuture<String> composed =
        composeFailed.exceptionallyComposeAsync(new Function<Throwable, CompletionStage<String>>() {
          public CompletionStage<String> apply(Throwable throwable) {
            return CompletableFuture.completedFuture("compose:" + throwable.getMessage());
          }
        });
    System.out.println(composed.getClass().getName().endsWith("HookedFuture"));
    System.out.println(executor.size());
    executor.runNext();
    System.out.println(composed.join());
  }

  private static final class HookedFuture<T> extends CompletableFuture<T> {
    private final RecordingExecutor executor;
    private int newIncompleteCalls;

    HookedFuture(RecordingExecutor executor) {
      this.executor = executor;
    }

    public Executor defaultExecutor() {
      return executor;
    }

    public <U> CompletableFuture<U> newIncompleteFuture() {
      newIncompleteCalls++;
      return new HookedFuture<U>(executor);
    }
  }

  private static final class RecordingExecutor implements Executor {
    private final ArrayDeque<Runnable> tasks = new ArrayDeque<Runnable>();

    public void execute(Runnable command) {
      tasks.addLast(command);
    }

    int size() {
      return tasks.size();
    }

    void runNext() {
      tasks.removeFirst().run();
    }
  }
}
