package classes.modern_test;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;

public class Java16HttpBodyPublisherConcat {
  public static void main(String[] args) throws Exception {
    HttpRequest filteredSource = HttpRequest.newBuilder(URI.create("https://example.com/filter"))
      .timeout(Duration.ofMillis(700))
      .version(HttpClient.Version.HTTP_1_1)
      .expectContinue(true)
      .headers("X-Keep", "one", "X-Keep", "two", "X-Drop", "gone")
      .POST(HttpRequest.BodyPublishers.ofString("seed"))
      .build();
    final ArrayList<String> filterEvents = new ArrayList<String>();
    HttpRequest filteredCopy = HttpRequest.newBuilder(filteredSource, (name, value) -> {
      filterEvents.add(name.toLowerCase(java.util.Locale.ROOT) + "=" + value);
      return name.equalsIgnoreCase("X-Keep") && value.equals("two");
    }).build();
    System.out.println(filterEvents.size());
    System.out.println(filterEvents.contains("x-keep=one"));
    System.out.println(filterEvents.contains("x-keep=two"));
    System.out.println(filterEvents.contains("x-drop=gone"));
    System.out.println(filteredCopy.uri());
    System.out.println(filteredCopy.method());
    System.out.println(filteredCopy.expectContinue());
    System.out.println(filteredCopy.timeout().get().toMillis());
    System.out.println(filteredCopy.version().get());
    System.out.println(filteredCopy.headers().allValues("X-Keep"));
    System.out.println(filteredCopy.headers().allValues("X-Drop"));
    System.out.println(filteredCopy.bodyPublisher().get().contentLength());

    HttpRequest.BodyPublisher fixedConcat = HttpRequest.BodyPublishers.concat(
      HttpRequest.BodyPublishers.ofByteArray(new byte[] { 7 }),
      HttpRequest.BodyPublishers.noBody(),
      HttpRequest.BodyPublishers.ofByteArray(new byte[] { 8 }));
    System.out.println(fixedConcat.contentLength());
    System.out.println(collect(fixedConcat));

    HttpRequest.BodyPublisher unknownConcat = HttpRequest.BodyPublishers.concat(
      HttpRequest.BodyPublishers.ofByteArray(new byte[] { 9 }),
      HttpRequest.BodyPublishers.ofInputStream(() -> new ByteArrayInputStream(new byte[] { 10 })),
      HttpRequest.BodyPublishers.ofByteArrays(Arrays.asList(new byte[] { 11 })));
    System.out.println(unknownConcat.contentLength());
    System.out.println(collect(unknownConcat));

    try {
      HttpRequest.BodyPublishers.concat((HttpRequest.BodyPublisher[]) null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      HttpRequest.BodyPublishers.concat(HttpRequest.BodyPublishers.noBody(), null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }

  private static String collect(HttpRequest.BodyPublisher publisher) throws Exception {
    RecordingSubscriber subscriber = new RecordingSubscriber();
    publisher.subscribe(subscriber);
    subscriber.await();
    if (subscriber.error != null) {
      return subscriber.bytes + ":error:" + subscriber.error.getClass().getName();
    }
    return subscriber.bytes + ":complete:" + subscriber.completed;
  }

  private static class RecordingSubscriber implements Flow.Subscriber<ByteBuffer> {
    final ArrayList<Integer> bytes = new ArrayList<Integer>();
    final CountDownLatch done = new CountDownLatch(1);
    Throwable error;
    boolean completed;

    public void onSubscribe(Flow.Subscription subscription) {
      subscription.request(Long.MAX_VALUE);
    }

    public void onNext(ByteBuffer item) {
      ByteBuffer copy = item.duplicate();
      while (copy.hasRemaining()) {
        bytes.add(copy.get() & 0xff);
      }
    }

    public void onError(Throwable throwable) {
      error = throwable;
      done.countDown();
    }

    public void onComplete() {
      completed = true;
      done.countDown();
    }

    void await() throws InterruptedException {
      done.await(5, TimeUnit.SECONDS);
    }
  }
}
