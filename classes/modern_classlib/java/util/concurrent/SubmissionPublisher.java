package java.util.concurrent;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BiConsumer;
import java.util.function.BiPredicate;
import java.util.function.Consumer;

public class SubmissionPublisher<T> implements Flow.Publisher<T>, AutoCloseable {
  private final Executor executor;
  private final int maxBufferCapacity;
  private final BiConsumer<? super Flow.Subscriber<? super T>, ? super Throwable> exceptionHandler;
  private final ArrayList<BufferedSubscription> subscriptions = new ArrayList<BufferedSubscription>();
  private boolean closed;
  private Throwable closedException;

  public SubmissionPublisher() {
    this(ForkJoinPool.commonPool(), Flow.defaultBufferSize(), null);
  }

  public SubmissionPublisher(Executor executor, int maxBufferCapacity) {
    this(executor, maxBufferCapacity, null);
  }

  public SubmissionPublisher(
      Executor executor,
      int maxBufferCapacity,
      BiConsumer<? super Flow.Subscriber<? super T>, ? super Throwable> handler) {
    this.executor = Objects.requireNonNull(executor);
    if (maxBufferCapacity <= 0) {
      throw new IllegalArgumentException("maxBufferCapacity must be positive");
    }
    int roundedCapacity = 1;
    while (roundedCapacity < maxBufferCapacity && roundedCapacity < (1 << 30)) {
      roundedCapacity <<= 1;
    }
    this.maxBufferCapacity = roundedCapacity;
    this.exceptionHandler = handler;
  }

  public void subscribe(Flow.Subscriber<? super T> subscriber) {
    Objects.requireNonNull(subscriber);
    BufferedSubscription subscription = new BufferedSubscription(subscriber);
    if (!closed) {
      subscriptions.add(subscription);
    }
    try {
      subscriber.onSubscribe(subscription);
    } catch (Throwable throwable) {
      subscription.canceled = true;
      removeSubscription(subscription);
      handleSubscriberException(subscriber, throwable);
      return;
    }
    if (closed) {
      subscription.signalTerminal(closedException);
    }
  }

  public int submit(T item) {
    Objects.requireNonNull(item);
    if (closed) {
      throw new IllegalStateException("closed");
    }
    int maxLag = 0;
    for (BufferedSubscription subscription : snapshotSubscriptions()) {
      if (!subscription.canceled) {
        subscription.queue.addLast(item);
        subscription.drain();
        maxLag = Math.max(maxLag, subscription.queue.size());
      }
    }
    return maxLag;
  }

  public int offer(T item, BiPredicate<Flow.Subscriber<? super T>, ? super T> onDrop) {
    return submit(item);
  }

  public int offer(
      T item,
      long timeout,
      TimeUnit unit,
      BiPredicate<Flow.Subscriber<? super T>, ? super T> onDrop) {
    Objects.requireNonNull(unit);
    return submit(item);
  }

  public void close() {
    if (closed) {
      return;
    }
    closed = true;
    for (BufferedSubscription subscription : snapshotSubscriptions()) {
      subscription.signalTerminal(null);
    }
    subscriptions.clear();
  }

  public void closeExceptionally(Throwable error) {
    Objects.requireNonNull(error);
    if (closed) {
      return;
    }
    closed = true;
    closedException = error;
    for (BufferedSubscription subscription : snapshotSubscriptions()) {
      subscription.signalTerminal(error);
    }
    subscriptions.clear();
  }

  public boolean isClosed() {
    return closed;
  }

  public Throwable getClosedException() {
    return closedException;
  }

  public boolean hasSubscribers() {
    return getNumberOfSubscribers() > 0;
  }

  public int getNumberOfSubscribers() {
    int count = 0;
    for (BufferedSubscription subscription : subscriptions) {
      if (!subscription.isCanceled()) {
        count++;
      }
    }
    return count;
  }

  public List<Flow.Subscriber<? super T>> getSubscribers() {
    ArrayList<Flow.Subscriber<? super T>> subscribers = new ArrayList<Flow.Subscriber<? super T>>();
    for (BufferedSubscription subscription : subscriptions) {
      if (!subscription.isCanceled()) {
        subscribers.add(subscription.subscriber);
      }
    }
    return Collections.unmodifiableList(subscribers);
  }

  public boolean isSubscribed(Flow.Subscriber<? super T> subscriber) {
    Objects.requireNonNull(subscriber);
    for (BufferedSubscription subscription : subscriptions) {
      if (!subscription.isCanceled() && subscription.subscriber == subscriber) {
        return true;
      }
    }
    return false;
  }

  public Executor getExecutor() {
    return executor;
  }

  public int getMaxBufferCapacity() {
    return maxBufferCapacity;
  }

  public int estimateMaximumLag() {
    int maxLag = 0;
    for (BufferedSubscription subscription : subscriptions) {
      maxLag = Math.max(maxLag, subscription.queue.size());
    }
    return maxLag;
  }

  public long estimateMinimumDemand() {
    if (subscriptions.isEmpty()) {
      return 0L;
    }
    long minDemand = Long.MAX_VALUE;
    for (BufferedSubscription subscription : subscriptions) {
      if (!subscription.isCanceled()) {
        minDemand = Math.min(minDemand, Math.max(0L, subscription.demand - subscription.queue.size()));
      }
    }
    return minDemand == Long.MAX_VALUE ? 0L : minDemand;
  }

  public CompletableFuture<Void> consume(final Consumer<? super T> consumer) {
    Objects.requireNonNull(consumer);
    final CompletableFuture<Void> future = new CompletableFuture<Void>();
    subscribe(new Flow.Subscriber<T>() {
      public void onSubscribe(Flow.Subscription subscription) {
        subscription.request(Long.MAX_VALUE);
      }

      public void onNext(T item) {
        try {
          consumer.accept(item);
        } catch (RuntimeException exception) {
          future.completeExceptionally(exception);
          throw exception;
        } catch (Error error) {
          future.completeExceptionally(error);
          throw error;
        }
      }

      public void onError(Throwable throwable) {
        future.completeExceptionally(throwable);
      }

      public void onComplete() {
        future.complete(null);
      }
    });
    return future;
  }

  private ArrayList<BufferedSubscription> snapshotSubscriptions() {
    return new ArrayList<BufferedSubscription>(subscriptions);
  }

  private void removeSubscription(BufferedSubscription subscription) {
    subscriptions.remove(subscription);
  }

  private void handleSubscriberException(Flow.Subscriber<? super T> subscriber, Throwable throwable) {
    if (exceptionHandler != null) {
      exceptionHandler.accept(subscriber, throwable);
    }
  }

  private final class BufferedSubscription implements Flow.Subscription {
    private final Flow.Subscriber<? super T> subscriber;
    private final ArrayDeque<T> queue = new ArrayDeque<T>();
    private long demand;
    private boolean canceled;
    private final AtomicBoolean draining = new AtomicBoolean();

    BufferedSubscription(Flow.Subscriber<? super T> subscriber) {
      this.subscriber = subscriber;
    }

    boolean isCanceled() {
      return canceled;
    }

    public void request(long n) {
      if (canceled) {
        return;
      }
      if (n <= 0L) {
        final Throwable throwable = new IllegalArgumentException("non-positive subscription request");
        canceled = true;
        queue.clear();
        removeSubscription(this);
        executor.execute(new Runnable() {
          public void run() {
            try {
              subscriber.onError(throwable);
            } catch (Throwable callbackError) {
              handleSubscriberException(subscriber, callbackError);
            }
          }
        });
        return;
      }
      long newDemand = demand + n;
      demand = newDemand < 0L ? Long.MAX_VALUE : newDemand;
      drain();
    }

    public void cancel() {
      if (!canceled) {
        canceled = true;
        queue.clear();
        removeSubscription(this);
      }
    }

    void signalTerminal(final Throwable throwable) {
      if (canceled) {
        return;
      }
      canceled = true;
      queue.clear();
      executor.execute(new Runnable() {
        public void run() {
          try {
            if (throwable == null) {
              subscriber.onComplete();
            } else {
              subscriber.onError(throwable);
            }
          } catch (Throwable callbackError) {
            handleSubscriberException(subscriber, callbackError);
          }
        }
      });
    }

    private void drain() {
      if (!draining.compareAndSet(false, true)) {
        return;
      }
      try {
        while (!canceled && demand > 0L && !queue.isEmpty()) {
          final T item = queue.removeFirst();
          if (demand != Long.MAX_VALUE) {
            demand--;
          }
          executor.execute(new Runnable() {
            public void run() {
              if (canceled) {
                return;
              }
              try {
                subscriber.onNext(item);
              } catch (Throwable throwable) {
                cancel();
                handleSubscriberException(subscriber, throwable);
              }
            }
          });
        }
      } finally {
        draining.set(false);
      }
    }
  }
}
