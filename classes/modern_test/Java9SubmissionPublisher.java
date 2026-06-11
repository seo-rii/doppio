package classes.modern_test;

import java.util.concurrent.Executor;
import java.util.concurrent.Flow;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.SubmissionPublisher;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BiConsumer;
import java.util.function.BiPredicate;

public class Java9SubmissionPublisher {
  private static class DirectExecutor implements Executor {
    public void execute(Runnable command) {
      command.run();
    }
  }

  private static class RecordingSubscriber implements Flow.Subscriber<String> {
    private final StringBuilder events = new StringBuilder();
    private Flow.Subscription subscription;

    public void onSubscribe(Flow.Subscription subscription) {
      this.subscription = subscription;
      events.append("subscribe");
      subscription.request(10L);
    }

    public void onNext(String item) {
      events.append(":").append(item);
    }

    public void onError(Throwable throwable) {
      events.append(":error:").append(throwable.getClass().getName());
    }

    public void onComplete() {
      events.append(":complete");
    }

    String events() {
      return events.toString();
    }

    void cancel() {
      subscription.cancel();
    }
  }

  private static class ThrowingSubscriber implements Flow.Subscriber<String> {
    public void onSubscribe(Flow.Subscription subscription) {
      subscription.request(1L);
    }

    public void onNext(String item) {
      throw new RuntimeException(item);
    }

    public void onError(Throwable throwable) {}

    public void onComplete() {}
  }

  public static void main(String[] args) {
    DirectExecutor direct = new DirectExecutor();
    AtomicInteger handlerCalls = new AtomicInteger();
    BiConsumer<Flow.Subscriber<? super String>, Throwable> handler =
        new BiConsumer<Flow.Subscriber<? super String>, Throwable>() {
          public void accept(Flow.Subscriber<? super String> subscriber, Throwable throwable) {
            handlerCalls.incrementAndGet();
          }
        };
    AtomicInteger drops = new AtomicInteger();
    BiPredicate<Flow.Subscriber<? super String>, String> dropHandler =
        new BiPredicate<Flow.Subscriber<? super String>, String>() {
          public boolean test(Flow.Subscriber<? super String> subscriber, String item) {
            drops.incrementAndGet();
            return false;
          }
        };

    SubmissionPublisher<String> publisher = new SubmissionPublisher<String>(direct, 4, handler);
    System.out.println(publisher.getMaxBufferCapacity());
    System.out.println(publisher.getExecutor() == direct);
    System.out.println(new SubmissionPublisher<String>(direct, 3).getMaxBufferCapacity());
    System.out.println(new SubmissionPublisher<String>(direct, 5).getMaxBufferCapacity());
    System.out.println(new SubmissionPublisher<String>(direct, 257).getMaxBufferCapacity());

    RecordingSubscriber subscriber = new RecordingSubscriber();
    System.out.println(publisher.isSubscribed(subscriber));
    publisher.subscribe(subscriber);
    System.out.println(publisher.isSubscribed(subscriber));
    System.out.println(publisher.hasSubscribers());
    System.out.println(publisher.getNumberOfSubscribers());
    System.out.println(publisher.getSubscribers().get(0) == subscriber);
    System.out.println(publisher.estimateMinimumDemand() >= 0L);

    publisher.submit("one");
    publisher.offer("two", dropHandler);
    publisher.offer("three", 1L, TimeUnit.MILLISECONDS, dropHandler);
    System.out.println(drops.get());
    System.out.println(subscriber.events());
    System.out.println(publisher.estimateMaximumLag() >= 0);

    publisher.close();
    System.out.println(publisher.isClosed());
    System.out.println(publisher.getClosedException() == null);
    System.out.println(publisher.isSubscribed(subscriber));
    System.out.println(publisher.hasSubscribers());
    System.out.println(subscriber.events());

    RecordingSubscriber lateSubscriber = new RecordingSubscriber();
    publisher.subscribe(lateSubscriber);
    System.out.println(lateSubscriber.events());

    SubmissionPublisher<String> failed = new SubmissionPublisher<String>(direct, 1);
    RecordingSubscriber errorSubscriber = new RecordingSubscriber();
    failed.subscribe(errorSubscriber);
    RuntimeException boom = new RuntimeException("boom");
    failed.closeExceptionally(boom);
    System.out.println(failed.isClosed());
    System.out.println(failed.getClosedException() == boom);
    System.out.println(errorSubscriber.events());

    SubmissionPublisher<String> handled = new SubmissionPublisher<String>(direct, 1, handler);
    handled.subscribe(new ThrowingSubscriber());
    handled.submit("explode");
    System.out.println(handlerCalls.get());

    SubmissionPublisher<String> canceled = new SubmissionPublisher<String>(direct, 1);
    RecordingSubscriber canceledSubscriber = new RecordingSubscriber();
    canceled.subscribe(canceledSubscriber);
    System.out.println(canceled.isSubscribed(canceledSubscriber));
    canceledSubscriber.cancel();
    System.out.println(canceled.isSubscribed(canceledSubscriber));
    System.out.println(canceled.hasSubscribers());

    SubmissionPublisher<String> consumed = new SubmissionPublisher<String>(direct, 2);
    final StringBuilder consumedEvents = new StringBuilder();
    CompletableFuture<Void> consumedFuture = consumed.consume(item -> consumedEvents.append(item));
    System.out.println(consumedFuture.isDone());
    consumed.submit("a");
    consumed.submit("b");
    System.out.println(consumedEvents.toString());
    System.out.println(consumedFuture.isDone());
    consumed.close();
    System.out.println(consumedFuture.isDone());
    System.out.println(consumedFuture.isCompletedExceptionally());

    SubmissionPublisher<String> throwingConsumed = new SubmissionPublisher<String>(direct, 2);
    CompletableFuture<Void> throwingFuture = throwingConsumed.consume(item -> {
      throw new RuntimeException(item);
    });
    System.out.println(throwingFuture.isDone());
    throwingConsumed.submit("boom");
    System.out.println(throwingFuture.isDone());
    System.out.println(throwingFuture.isCompletedExceptionally());
    try {
      throwingFuture.join();
      System.out.println(false);
    } catch (CompletionException e) {
      System.out.println(e.getCause().getClass().getName());
    }

    try {
      new SubmissionPublisher<String>(null, 1);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      new SubmissionPublisher<String>(direct, 0);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      publisher.subscribe(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      publisher.isSubscribed(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      publisher.consume(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      failed.closeExceptionally(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      new SubmissionPublisher<String>(direct, 1).submit(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      new SubmissionPublisher<String>(direct, 1).offer("x", null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      new SubmissionPublisher<String>(direct, 1).offer("x", 1L, null, dropHandler);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
