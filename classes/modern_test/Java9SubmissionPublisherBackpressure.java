package classes.modern_test;

import java.util.concurrent.Executor;
import java.util.concurrent.Flow;
import java.util.concurrent.SubmissionPublisher;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BiPredicate;

public class Java9SubmissionPublisherBackpressure {
  public static void main(String[] args) {
    DirectExecutor direct = new DirectExecutor();
    SubmissionPublisher<String> publisher = new SubmissionPublisher<String>(direct, 1);
    PassiveSubscriber subscriber = new PassiveSubscriber();
    AtomicInteger drops = new AtomicInteger();
    StringBuilder dropped = new StringBuilder();
    BiPredicate<Flow.Subscriber<? super String>, String> rejectDrop =
        new BiPredicate<Flow.Subscriber<? super String>, String>() {
          public boolean test(Flow.Subscriber<? super String> dropSubscriber, String item) {
            drops.incrementAndGet();
            System.out.println(dropSubscriber == subscriber);
            dropped.append(item);
            return false;
          }
        };

    publisher.subscribe(subscriber);
    System.out.println(publisher.getMaxBufferCapacity());
    System.out.println(publisher.offer("one", rejectDrop));
    System.out.println(drops.get());
    System.out.println(subscriber.events());
    System.out.println(publisher.estimateMaximumLag());
    System.out.println(publisher.offer("two", rejectDrop));
    System.out.println(drops.get());
    System.out.println(dropped.toString());
    System.out.println(subscriber.events());
    System.out.println(publisher.estimateMaximumLag());
    subscriber.subscription.request(1L);
    System.out.println(subscriber.events());
    System.out.println(publisher.estimateMaximumLag());
    System.out.println(publisher.offer("three", 1L, TimeUnit.MILLISECONDS, rejectDrop));
    System.out.println(drops.get());
    subscriber.subscription.request(1L);
    System.out.println(subscriber.events());

    SubmissionPublisher<String> invalidRequestPublisher = new SubmissionPublisher<String>(direct, 1);
    PassiveSubscriber invalid = new PassiveSubscriber();
    invalidRequestPublisher.subscribe(invalid);
    invalid.subscription.request(0L);
    System.out.println(invalid.events());
    System.out.println(invalidRequestPublisher.isSubscribed(invalid));
    System.out.println(invalidRequestPublisher.hasSubscribers());
  }

  private static final class DirectExecutor implements Executor {
    public void execute(Runnable command) {
      command.run();
    }
  }

  private static final class PassiveSubscriber implements Flow.Subscriber<String> {
    private final StringBuilder events = new StringBuilder();
    private Flow.Subscription subscription;

    public void onSubscribe(Flow.Subscription subscription) {
      this.subscription = subscription;
      events.append("subscribe");
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
  }
}
