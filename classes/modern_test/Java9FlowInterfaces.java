package classes.modern_test;

import java.util.concurrent.Flow;

public class Java9FlowInterfaces {
  private static class RecordingSubscription implements Flow.Subscription {
    private long requested;
    private boolean canceled;

    public void request(long n) {
      requested += n;
    }

    public void cancel() {
      canceled = true;
    }
  }

  private static class RecordingSubscriber implements Flow.Subscriber<String> {
    private Flow.Subscription subscription;
    private String events = "";

    public void onSubscribe(Flow.Subscription subscription) {
      this.subscription = subscription;
      events += "subscribe";
      subscription.request(2);
    }

    public void onNext(String item) {
      events += ":" + item;
    }

    public void onError(Throwable throwable) {
      events += ":error:" + throwable.getClass().getName();
    }

    public void onComplete() {
      events += ":complete";
      subscription.cancel();
    }
  }

  private static class RecordingPublisher implements Flow.Publisher<String> {
    private final RecordingSubscription subscription = new RecordingSubscription();

    public void subscribe(Flow.Subscriber<? super String> subscriber) {
      subscriber.onSubscribe(subscription);
      subscriber.onNext("one");
      subscriber.onNext("two");
      subscriber.onComplete();
    }
  }

  private static class PassthroughProcessor implements Flow.Processor<String, Integer> {
    private Flow.Subscriber<? super Integer> downstream;

    public void subscribe(Flow.Subscriber<? super Integer> subscriber) {
      downstream = subscriber;
      subscriber.onSubscribe(new RecordingSubscription());
    }

    public void onSubscribe(Flow.Subscription subscription) {
      subscription.request(1);
    }

    public void onNext(String item) {
      downstream.onNext(item.length());
    }

    public void onError(Throwable throwable) {
      downstream.onError(throwable);
    }

    public void onComplete() {
      downstream.onComplete();
    }
  }

  private static class IntegerSubscriber implements Flow.Subscriber<Integer> {
    private String events = "";

    public void onSubscribe(Flow.Subscription subscription) {
      events += "ready";
    }

    public void onNext(Integer item) {
      events += ":" + item.intValue();
    }

    public void onError(Throwable throwable) {
      events += ":error";
    }

    public void onComplete() {
      events += ":done";
    }
  }

  public static void main(String[] args) {
    RecordingPublisher publisher = new RecordingPublisher();
    RecordingSubscriber subscriber = new RecordingSubscriber();
    publisher.subscribe(subscriber);
    System.out.println(subscriber.events);
    System.out.println(publisher.subscription.requested);
    System.out.println(publisher.subscription.canceled);

    PassthroughProcessor processor = new PassthroughProcessor();
    IntegerSubscriber integerSubscriber = new IntegerSubscriber();
    processor.subscribe(integerSubscriber);
    processor.onSubscribe(new RecordingSubscription());
    processor.onNext("three");
    processor.onComplete();
    System.out.println(integerSubscriber.events);
    System.out.println(processor instanceof Flow.Publisher);
    System.out.println(processor instanceof Flow.Subscriber);
    System.out.println(Flow.defaultBufferSize());
  }
}
