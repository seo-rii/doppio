package classes.modern_test;

import java.io.ByteArrayInputStream;
import java.net.http.HttpRequest;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class Java11HttpBodyPublishers {
  public static void main(String[] args) throws Exception {
    byte[] mutableBody = new byte[] { 9, 10 };
    HttpRequest.BodyPublisher byteArray = HttpRequest.BodyPublishers.ofByteArray(mutableBody);
    mutableBody[0] = 99;
    System.out.println(byteArray.contentLength());
    System.out.println(collect(byteArray));

    byte[] mutableSlice = new byte[] { 11, 12, 13, 14 };
    HttpRequest.BodyPublisher slicedByteArray = HttpRequest.BodyPublishers.ofByteArray(mutableSlice, 1, 2);
    mutableSlice[1] = 88;
    System.out.println(slicedByteArray.contentLength());
    System.out.println(collect(slicedByteArray));

    System.out.println(collect(HttpRequest.BodyPublishers.ofString("\u00e9", java.nio.charset.StandardCharsets.ISO_8859_1)));
    System.out.println(collect(HttpRequest.BodyPublishers.noBody()));

    HttpRequest.BodyPublisher arrays = HttpRequest.BodyPublishers.ofByteArrays(
      Arrays.asList(new byte[] { 1, 2 }, new byte[] { 3 }));
    System.out.println(arrays.contentLength());
    System.out.println(collect(arrays));

    HttpRequest.BodyPublisher input = HttpRequest.BodyPublishers.ofInputStream(
      () -> new ByteArrayInputStream(new byte[] { 4, 5 }));
    System.out.println(input.contentLength());
    System.out.println(collect(input));

    AtomicInteger calls = new AtomicInteger();
    HttpRequest.BodyPublisher repeatedInput = HttpRequest.BodyPublishers.ofInputStream(
      () -> {
        calls.incrementAndGet();
        return new ByteArrayInputStream(new byte[] { 6 });
      });
    System.out.println(collect(repeatedInput));
    System.out.println(collect(repeatedInput));
    System.out.println(calls.get());

    HttpRequest.BodyPublisher arraysWithNullElement = HttpRequest.BodyPublishers.ofByteArrays(
      Arrays.asList(new byte[] { 7 }, null, new byte[] { 8 }));
    System.out.println(collect(arraysWithNullElement));

    HttpRequest.BodyPublisher nullInput = HttpRequest.BodyPublishers.ofInputStream(() -> null);
    System.out.println(collect(nullInput));

    HttpRequest.BodyPublisher throwingInput = HttpRequest.BodyPublishers.ofInputStream(
      () -> {
        throw new IllegalStateException("boom");
      });
    try {
      System.out.println(collect(throwingInput));
    } catch (IllegalStateException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      HttpRequest.BodyPublishers.ofString(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      HttpRequest.BodyPublishers.ofString("x", null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      HttpRequest.BodyPublishers.ofByteArray(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      HttpRequest.BodyPublishers.ofByteArray(new byte[] { 1 }, -1, 1);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      HttpRequest.BodyPublishers.ofByteArray(new byte[] { 1 }, 0, -1);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      HttpRequest.BodyPublishers.ofByteArray(new byte[] { 1 }, 1, 1);
      System.out.println(false);
    } catch (IndexOutOfBoundsException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      HttpRequest.BodyPublishers.ofByteArrays(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      HttpRequest.BodyPublishers.ofInputStream(null);
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
