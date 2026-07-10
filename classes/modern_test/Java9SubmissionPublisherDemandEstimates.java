package classes.modern_test;

import java.util.concurrent.Executor;
import java.util.concurrent.Flow;
import java.util.concurrent.SubmissionPublisher;
import java.util.function.BiPredicate;

public class Java9SubmissionPublisherDemandEstimates {
  public static void main(String[] args) {
    DirectExecutor direct = new DirectExecutor();
    BiPredicate<Flow.Subscriber<? super String>, String> rejectDrop =
        new BiPredicate<Flow.Subscriber<? super String>, String>() {
          public boolean test(Flow.Subscriber<? super String> subscriber, String item) {
            return false;
          }
        };

    SubmissionPublisher<String> queued = new SubmissionPublisher<String>(direct, 2);
    PassiveSubscriber passive = new PassiveSubscriber();
    queued.subscribe(passive);
    System.out.println(queued.estimateMinimumDemand());
    System.out.println(queued.offer("one", rejectDrop));
    System.out.println(queued.estimateMaximumLag());
    System.out.println(queued.estimateMinimumDemand());
    passive.subscription.request(1L);
    System.out.println(passive.events());
    System.out.println(queued.estimateMaximumLag());
    System.out.println(queued.estimateMinimumDemand());

    SubmissionPublisher<String> demanded = new SubmissionPublisher<String>(direct, 4);
    PassiveSubscriber active = new PassiveSubscriber();
    demanded.subscribe(active);
    active.subscription.request(3L);
    System.out.println(demanded.estimateMinimumDemand());
    System.out.println(demanded.offer("two", rejectDrop));
    System.out.println(active.events());
    System.out.println(demanded.estimateMaximumLag());
    System.out.println(demanded.estimateMinimumDemand());
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
