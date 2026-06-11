package java.util.concurrent;

import java.util.function.BiConsumer;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.function.Supplier;

final class CompletableFuture$DoppioFactories {
  private CompletableFuture$DoppioFactories() {}

  public static <U> CompletionStage<U> completedStage(U value) {
    CompletableFuture$DoppioMinimalStage<U> stage = new CompletableFuture$DoppioMinimalStage<U>();
    stage.internalComplete(value);
    return stage;
  }

  public static <U> CompletableFuture<U> completeAsync(
      final CompletableFuture<U> source,
      final Supplier<? extends U> supplier) {
    return completeAsync(source, supplier, ForkJoinPool.commonPool());
  }

  public static <U> CompletableFuture<U> completeAsync(
      final CompletableFuture<U> source,
      final Supplier<? extends U> supplier,
      Executor executor) {
    if (supplier == null) {
      throw new NullPointerException();
    }
    if (executor == null) {
      throw new NullPointerException();
    }
    if (source.isDone()) {
      return source;
    }
    executor.execute(new Runnable() {
      public void run() {
        try {
          source.complete(supplier.get());
        } catch (Throwable t) {
          source.completeExceptionally(t);
        }
      }
    });
    return source;
  }

  public static Executor delayedExecutor(long delay, TimeUnit unit) {
    return delayedExecutor(delay, unit, ForkJoinPool.commonPool());
  }

  public static Executor delayedExecutor(long delay, TimeUnit unit, Executor executor) {
    if (unit == null) {
      throw new NullPointerException();
    }
    if (executor == null) {
      throw new NullPointerException();
    }
    return new CompletableFuture$DoppioDelayedExecutor(delay, unit, executor);
  }

  public static <U> CompletableFuture<U> exceptionallyAsync(
      CompletableFuture<U> source,
      final Function<Throwable, ? extends U> fn) {
    return exceptionallyAsync(source, fn, ForkJoinPool.commonPool());
  }

  public static <U> CompletableFuture<U> exceptionallyAsync(
      CompletableFuture<U> source,
      final Function<Throwable, ? extends U> fn,
      Executor executor) {
    if (fn == null) {
      throw new NullPointerException();
    }
    if (executor == null) {
      throw new NullPointerException();
    }
    return source.handleAsync(new BiFunction<U, Throwable, U>() {
      public U apply(U value, Throwable throwable) {
        return throwable == null ? value : fn.apply(throwable);
      }
    }, executor);
  }

  public static <U> CompletableFuture<U> exceptionallyCompose(
      CompletableFuture<U> source,
      final Function<Throwable, ? extends CompletionStage<U>> fn) {
    if (fn == null) {
      throw new NullPointerException();
    }
    return source.handle(exceptionallyComposeHandler(fn)).thenCompose(identityStage());
  }

  public static <U> CompletableFuture<U> exceptionallyComposeAsync(
      CompletableFuture<U> source,
      final Function<Throwable, ? extends CompletionStage<U>> fn) {
    return exceptionallyComposeAsync(source, fn, ForkJoinPool.commonPool());
  }

  public static <U> CompletableFuture<U> exceptionallyComposeAsync(
      CompletableFuture<U> source,
      final Function<Throwable, ? extends CompletionStage<U>> fn,
      Executor executor) {
    if (fn == null) {
      throw new NullPointerException();
    }
    if (executor == null) {
      throw new NullPointerException();
    }
    return source.handleAsync(exceptionallyComposeHandler(fn), executor).thenCompose(identityStage());
  }

  public static <U> CompletableFuture<U> copy(CompletableFuture<U> source) {
    final CompletableFuture<U> copy = new CompletableFuture<U>();
    source.whenComplete(new BiConsumer<U, Throwable>() {
      public void accept(U value, Throwable throwable) {
        if (throwable == null) {
          copy.complete(value);
        } else {
          copy.completeExceptionally(throwable);
        }
      }
    });
    return copy;
  }

  public static Executor defaultExecutor(CompletableFuture<?> source) {
    return ForkJoinPool.commonPool();
  }

  public static <U> CompletableFuture<U> failedFuture(Throwable ex) {
    if (ex == null) {
      throw new NullPointerException();
    }
    CompletableFuture<U> future = new CompletableFuture<U>();
    future.completeExceptionally(ex);
    return future;
  }

  public static <U> CompletionStage<U> failedStage(Throwable ex) {
    if (ex == null) {
      throw new NullPointerException();
    }
    CompletableFuture$DoppioMinimalStage<U> stage = new CompletableFuture$DoppioMinimalStage<U>();
    stage.internalCompleteExceptionally(ex);
    return stage;
  }

  public static <U> CompletableFuture<U> completeOnTimeout(
      final CompletableFuture<U> source,
      final U value,
      long timeout,
      TimeUnit unit) {
    if (unit == null) {
      throw new NullPointerException();
    }
    delayedExecutor(timeout, unit, new Executor() {
      public void execute(Runnable command) {
        command.run();
      }
    }).execute(new Runnable() {
      public void run() {
        source.complete(value);
      }
    });
    return source;
  }

  public static <U> CompletionStage<U> minimalCompletionStage(CompletableFuture<U> source) {
    final CompletableFuture$DoppioMinimalStage<U> stage = new CompletableFuture$DoppioMinimalStage<U>();
    source.whenComplete(new BiConsumer<U, Throwable>() {
      public void accept(U value, Throwable throwable) {
        if (throwable == null) {
          stage.internalComplete(value);
        } else {
          stage.internalCompleteExceptionally(throwable);
        }
      }
    });
    return stage;
  }

  public static <U> CompletableFuture<U> newIncompleteFuture(CompletableFuture<?> source) {
    return new CompletableFuture<U>();
  }

  public static <U> CompletableFuture<U> orTimeout(
      final CompletableFuture<U> source,
      long timeout,
      TimeUnit unit) {
    if (unit == null) {
      throw new NullPointerException();
    }
    delayedExecutor(timeout, unit, new Executor() {
      public void execute(Runnable command) {
        command.run();
      }
    }).execute(new Runnable() {
      public void run() {
        source.completeExceptionally(new TimeoutException());
      }
    });
    return source;
  }

  private static <U> BiFunction<U, Throwable, CompletionStage<U>> exceptionallyComposeHandler(
      final Function<Throwable, ? extends CompletionStage<U>> fn) {
    return new BiFunction<U, Throwable, CompletionStage<U>>() {
      public CompletionStage<U> apply(U value, Throwable throwable) {
        return throwable == null ? CompletableFuture.completedFuture(value) : fn.apply(throwable);
      }
    };
  }

  private static <U> Function<CompletionStage<U>, CompletionStage<U>> identityStage() {
    return new Function<CompletionStage<U>, CompletionStage<U>>() {
      public CompletionStage<U> apply(CompletionStage<U> stage) {
        return stage;
      }
    };
  }
}

final class CompletableFuture$DoppioDelayedExecutor implements Executor {
  private final long delay;
  private final TimeUnit unit;
  private final Executor executor;

  CompletableFuture$DoppioDelayedExecutor(long delay, TimeUnit unit, Executor executor) {
    this.delay = delay;
    this.unit = unit;
    this.executor = executor;
  }

  public void execute(final Runnable command) {
    Thread worker = new Thread(new Runnable() {
      public void run() {
        long millis = unit.toMillis(delay);
        if (millis > 0) {
          try {
            Thread.sleep(millis);
          } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
          }
        }
        executor.execute(command);
      }
    }, "Doppio CompletableFuture delayed executor");
    worker.setDaemon(true);
    worker.start();
  }
}

final class CompletableFuture$DoppioMinimalStage<T> extends CompletableFuture<T> {
  void internalComplete(T value) {
    super.complete(value);
  }

  void internalCompleteExceptionally(Throwable ex) {
    super.completeExceptionally(ex);
  }

  public CompletableFuture<T> toCompletableFuture() {
    final CompletableFuture<T> copy = new CompletableFuture<T>();
    super.whenComplete(new BiConsumer<T, Throwable>() {
      public void accept(T value, Throwable throwable) {
        if (throwable == null) {
          copy.complete(value);
        } else {
          copy.completeExceptionally(throwable);
        }
      }
    });
    return copy;
  }

  public boolean complete(T value) {
    throw new UnsupportedOperationException();
  }

  public boolean completeExceptionally(Throwable ex) {
    throw new UnsupportedOperationException();
  }

  public boolean cancel(boolean mayInterruptIfRunning) {
    throw new UnsupportedOperationException();
  }

  public boolean isCancelled() {
    throw new UnsupportedOperationException();
  }

  public boolean isDone() {
    throw new UnsupportedOperationException();
  }

  public boolean isCompletedExceptionally() {
    throw new UnsupportedOperationException();
  }

  public T get() throws InterruptedException, ExecutionException {
    throw new UnsupportedOperationException();
  }

  public T get(long timeout, TimeUnit unit) throws InterruptedException, ExecutionException, TimeoutException {
    throw new UnsupportedOperationException();
  }

  public T join() {
    throw new UnsupportedOperationException();
  }

  public T getNow(T valueIfAbsent) {
    throw new UnsupportedOperationException();
  }

  public void obtrudeValue(T value) {
    throw new UnsupportedOperationException();
  }

  public void obtrudeException(Throwable ex) {
    throw new UnsupportedOperationException();
  }
}
