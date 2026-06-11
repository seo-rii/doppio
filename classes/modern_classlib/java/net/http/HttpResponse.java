package java.net.http;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.OpenOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Flow;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.Stream;
import javax.net.ssl.SSLSession;

public interface HttpResponse<T> {
  public int statusCode();
  public HttpRequest request();
  public Optional<HttpResponse<T>> previousResponse();
  public HttpHeaders headers();
  public T body();
  public Optional<SSLSession> sslSession();
  public URI uri();
  public HttpClient.Version version();

  public static interface ResponseInfo {
    public int statusCode();
    public HttpHeaders headers();
    public HttpClient.Version version();
  }

  public static interface BodyHandler<T> {
    public BodySubscriber<T> apply(ResponseInfo responseInfo);
  }

  public static interface BodySubscriber<T> extends Flow.Subscriber<List<ByteBuffer>> {
    public CompletionStage<T> getBody();
  }

  public static interface PushPromiseHandler<T> {
    public void applyPushPromise(
      HttpRequest initiatingRequest,
      HttpRequest pushPromiseRequest,
      Function<BodyHandler<T>, CompletableFuture<HttpResponse<T>>> acceptor);

    public static <T> PushPromiseHandler<T> of(
      Function<HttpRequest, BodyHandler<T>> pushPromiseHandler,
      ConcurrentMap<HttpRequest, CompletableFuture<HttpResponse<T>>> pushPromisesMap) {
      Objects.requireNonNull(pushPromiseHandler);
      Objects.requireNonNull(pushPromisesMap);
      return new PushPromiseHandler<T>() {
        public void applyPushPromise(
          HttpRequest initiatingRequest,
          HttpRequest pushPromiseRequest,
          Function<BodyHandler<T>, CompletableFuture<HttpResponse<T>>> acceptor) {
          Objects.requireNonNull(initiatingRequest);
          Objects.requireNonNull(pushPromiseRequest);
          Objects.requireNonNull(acceptor);
          BodyHandler<T> handler = pushPromiseHandler.apply(pushPromiseRequest);
          if (handler != null) {
            pushPromisesMap.put(pushPromiseRequest, acceptor.apply(handler));
          }
        }
      };
    }
  }

  private static ArrayList<String> splitLines(String text) {
    return splitLines(text, null);
  }

  private static Charset responseCharset(ResponseInfo responseInfo) {
    Optional<String> contentType = responseInfo.headers().firstValue("Content-Type");
    if (!contentType.isPresent()) {
      return StandardCharsets.UTF_8;
    }
    String[] parts = contentType.get().split(";");
    for (int i = 1; i < parts.length; i++) {
      String part = parts[i].trim();
      int equalsIndex = part.indexOf('=');
      if (equalsIndex >= 0 && part.substring(0, equalsIndex).trim().equalsIgnoreCase("charset")) {
        String name = part.substring(equalsIndex + 1).trim();
        if (name.length() >= 2 && name.charAt(0) == '"' && name.charAt(name.length() - 1) == '"') {
          name = name.substring(1, name.length() - 1);
        }
        return Charset.forName(name);
      }
    }
    return StandardCharsets.UTF_8;
  }

  private static ArrayList<String> splitLines(String text, String lineSeparator) {
    if (lineSeparator != null) {
      if (lineSeparator.length() == 0) {
        throw new IllegalArgumentException();
      }
      ArrayList<String> lines = new ArrayList<String>();
      int start = 0;
      int separatorIndex;
      while ((separatorIndex = text.indexOf(lineSeparator, start)) >= 0) {
        lines.add(text.substring(start, separatorIndex));
        start = separatorIndex + lineSeparator.length();
      }
      if (start < text.length()) {
        lines.add(text.substring(start));
      }
      return lines;
    }
    ArrayList<String> lines = new ArrayList<String>();
    int start = 0;
    for (int i = 0; i < text.length(); i++) {
      char ch = text.charAt(i);
      if (ch == '\r' || ch == '\n') {
        lines.add(text.substring(start, i));
        if (ch == '\r' && i + 1 < text.length() && text.charAt(i + 1) == '\n') {
          i++;
        }
        start = i + 1;
      }
    }
    if (start < text.length()) {
      lines.add(text.substring(start));
    }
    return lines;
  }

  public static class BodyHandlers {
    public static BodyHandler<Void> fromSubscriber(Flow.Subscriber<? super List<ByteBuffer>> subscriber) {
      Objects.requireNonNull(subscriber);
      return new BodyHandler<Void>() {
        public BodySubscriber<Void> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          return BodySubscribers.fromSubscriber(subscriber);
        }
      };
    }

    public static <S extends Flow.Subscriber<? super List<ByteBuffer>>, T> BodyHandler<T> fromSubscriber(
      S subscriber,
      Function<? super S, ? extends T> finisher) {
      Objects.requireNonNull(subscriber);
      Objects.requireNonNull(finisher);
      return new BodyHandler<T>() {
        public BodySubscriber<T> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          return BodySubscribers.fromSubscriber(subscriber, finisher);
        }
      };
    }

    public static BodyHandler<Void> fromLineSubscriber(Flow.Subscriber<? super String> subscriber) {
      Objects.requireNonNull(subscriber);
      return new BodyHandler<Void>() {
        public BodySubscriber<Void> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          return BodySubscribers.fromLineSubscriber(subscriber);
        }
      };
    }

    public static <S extends Flow.Subscriber<? super String>, T> BodyHandler<T> fromLineSubscriber(
      S subscriber,
      Function<? super S, ? extends T> finisher,
      String lineSeparator) {
      Objects.requireNonNull(subscriber);
      Objects.requireNonNull(finisher);
      return new BodyHandler<T>() {
        public BodySubscriber<T> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          return BodySubscribers.fromLineSubscriber(subscriber, finisher, StandardCharsets.UTF_8, lineSeparator);
        }
      };
    }

    public static BodyHandler<Void> discarding() {
      return replacing(null);
    }

    public static <U> BodyHandler<U> replacing(U value) {
      return new BodyHandler<U>() {
        public BodySubscriber<U> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          return new FixedBodySubscriber<U>(value);
        }
      };
    }

    public static BodyHandler<String> ofString(Charset charset) {
      Objects.requireNonNull(charset);
      return new BodyHandler<String>() {
        public BodySubscriber<String> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          return BodySubscribers.ofString(charset);
        }
      };
    }

    public static BodyHandler<Path> ofFile(Path file, OpenOption... openOptions) {
      Objects.requireNonNull(file);
      final OpenOption[] options = copyOpenOptions(openOptions);
      return new BodyHandler<Path>() {
        public BodySubscriber<Path> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          return BodySubscribers.ofFile(file, options);
        }
      };
    }

    public static BodyHandler<Path> ofFile(Path file) {
      return ofFile(file, new OpenOption[0]);
    }

    public static BodyHandler<Path> ofFileDownload(Path directory, OpenOption... openOptions) {
      Objects.requireNonNull(directory);
      final OpenOption[] options = copyOpenOptions(openOptions);
      return new BodyHandler<Path>() {
        public BodySubscriber<Path> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          Optional<String> contentDisposition = responseInfo.headers().firstValue("Content-Disposition");
          if (!contentDisposition.isPresent()) {
            throw new UncheckedIOException(new IOException());
          }
          String[] parts = contentDisposition.get().split(";");
          String filename = null;
          for (int i = 0; i < parts.length; i++) {
            String part = parts[i].trim();
            if (part.startsWith("filename=")) {
              filename = part.substring("filename=".length());
              if (filename.length() >= 2 && filename.charAt(0) == '"' && filename.charAt(filename.length() - 1) == '"') {
                filename = filename.substring(1, filename.length() - 1);
                StringBuilder unescaped = new StringBuilder();
                for (int j = 0; j < filename.length(); j++) {
                  char ch = filename.charAt(j);
                  if (ch == '\\' && j + 1 < filename.length()) {
                    j++;
                    ch = filename.charAt(j);
                  }
                  unescaped.append(ch);
                }
                filename = unescaped.toString();
              }
            }
          }
          if (filename == null || filename.length() == 0) {
            throw new UncheckedIOException(new IOException());
          }
          Path file = directory.resolve(filename);
          if (!directory.equals(file.getParent())) {
            throw new UncheckedIOException(new IOException());
          }
          return BodySubscribers.ofFile(file, options);
        }
      };
    }

    public static BodyHandler<java.io.InputStream> ofInputStream() {
      return new BodyHandler<java.io.InputStream>() {
        public BodySubscriber<java.io.InputStream> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          return BodySubscribers.ofInputStream();
        }
      };
    }

    public static BodyHandler<Stream<String>> ofLines() {
      return new BodyHandler<Stream<String>>() {
        public BodySubscriber<Stream<String>> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          return BodySubscribers.ofLines(responseCharset(responseInfo));
        }
      };
    }

    public static BodyHandler<Void> ofByteArrayConsumer(Consumer<Optional<byte[]>> consumer) {
      Objects.requireNonNull(consumer);
      return new BodyHandler<Void>() {
        public BodySubscriber<Void> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          return BodySubscribers.ofByteArrayConsumer(consumer);
        }
      };
    }

    public static BodyHandler<byte[]> ofByteArray() {
      return new BodyHandler<byte[]>() {
        public BodySubscriber<byte[]> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          return BodySubscribers.ofByteArray();
        }
      };
    }

    public static BodyHandler<String> ofString() {
      return new BodyHandler<String>() {
        public BodySubscriber<String> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          return BodySubscribers.ofString(responseCharset(responseInfo));
        }
      };
    }

    public static BodyHandler<Flow.Publisher<List<ByteBuffer>>> ofPublisher() {
      return new BodyHandler<Flow.Publisher<List<ByteBuffer>>>() {
        public BodySubscriber<Flow.Publisher<List<ByteBuffer>>> apply(ResponseInfo responseInfo) {
          Objects.requireNonNull(responseInfo);
          return BodySubscribers.ofPublisher();
        }
      };
    }

    public static <T> BodyHandler<T> buffering(BodyHandler<T> downstreamHandler, int bufferSize) {
      Objects.requireNonNull(downstreamHandler);
      if (bufferSize <= 0) {
        throw new IllegalArgumentException();
      }
      return new BodyHandler<T>() {
        public BodySubscriber<T> apply(ResponseInfo responseInfo) {
          return BodySubscribers.buffering(downstreamHandler.apply(responseInfo), bufferSize);
        }
      };
    }
  }

  public static class BodySubscribers {
    public static BodySubscriber<Void> fromSubscriber(Flow.Subscriber<? super List<ByteBuffer>> subscriber) {
      Objects.requireNonNull(subscriber);
      return new SubscriberAdapter<Void>(subscriber, null);
    }

    public static <S extends Flow.Subscriber<? super List<ByteBuffer>>, T> BodySubscriber<T> fromSubscriber(
      S subscriber,
      Function<? super S, ? extends T> finisher) {
      Objects.requireNonNull(subscriber);
      Objects.requireNonNull(finisher);
      return new SubscriberAdapter<T>(subscriber, new Function<Flow.Subscriber<? super List<ByteBuffer>>, T>() {
        public T apply(Flow.Subscriber<? super List<ByteBuffer>> ignored) {
          return finisher.apply(subscriber);
        }
      });
    }

    public static BodySubscriber<Void> fromLineSubscriber(Flow.Subscriber<? super String> subscriber) {
      Objects.requireNonNull(subscriber);
      return new LineSubscriberAdapter<Void>(subscriber, null, StandardCharsets.UTF_8, null);
    }

    public static <S extends Flow.Subscriber<? super String>, T> BodySubscriber<T> fromLineSubscriber(
      S subscriber,
      Function<? super S, ? extends T> finisher,
      Charset charset,
      String lineSeparator) {
      Objects.requireNonNull(subscriber);
      Objects.requireNonNull(finisher);
      Objects.requireNonNull(charset);
      return new LineSubscriberAdapter<T>(
        subscriber,
        new Function<Flow.Subscriber<? super String>, T>() {
          public T apply(Flow.Subscriber<? super String> ignored) {
            return finisher.apply(subscriber);
          }
        },
        charset,
        lineSeparator);
    }

    public static BodySubscriber<String> ofString(Charset charset) {
      Objects.requireNonNull(charset);
      return new CollectingBodySubscriber<String>(new Function<byte[], String>() {
        public String apply(byte[] bytes) {
          return new String(bytes, charset);
        }
      });
    }

    public static BodySubscriber<byte[]> ofByteArray() {
      return new CollectingBodySubscriber<byte[]>(new Function<byte[], byte[]>() {
        public byte[] apply(byte[] bytes) {
          return bytes;
        }
      });
    }

    public static BodySubscriber<Path> ofFile(Path file, OpenOption... openOptions) {
      Objects.requireNonNull(file);
      return new FileBodySubscriber(file, copyOpenOptions(openOptions));
    }

    public static BodySubscriber<Path> ofFile(Path file) {
      return ofFile(file, new OpenOption[0]);
    }

    public static BodySubscriber<Void> ofByteArrayConsumer(Consumer<Optional<byte[]>> consumer) {
      Objects.requireNonNull(consumer);
      return new ByteArrayConsumerBodySubscriber(consumer);
    }

    public static BodySubscriber<java.io.InputStream> ofInputStream() {
      return new CollectingBodySubscriber<java.io.InputStream>(new Function<byte[], java.io.InputStream>() {
        public java.io.InputStream apply(byte[] bytes) {
          return new java.io.ByteArrayInputStream(bytes);
        }
      });
    }

    public static BodySubscriber<Stream<String>> ofLines(Charset charset) {
      Objects.requireNonNull(charset);
      return new CollectingBodySubscriber<Stream<String>>(new Function<byte[], Stream<String>>() {
        public Stream<String> apply(byte[] bytes) {
          return splitLines(new String(bytes, charset)).stream();
        }
      });
    }

    public static BodySubscriber<Flow.Publisher<List<ByteBuffer>>> ofPublisher() {
      return new PublisherBodySubscriber();
    }

    public static <U> BodySubscriber<U> replacing(U value) {
      return new FixedBodySubscriber<U>(value);
    }

    public static BodySubscriber<Void> discarding() {
      return replacing(null);
    }

    public static <T> BodySubscriber<T> buffering(BodySubscriber<T> downstreamSubscriber, int bufferSize) {
      Objects.requireNonNull(downstreamSubscriber);
      if (bufferSize <= 0) {
        throw new IllegalArgumentException();
      }
      return new DelegatingBodySubscriber<T>(downstreamSubscriber);
    }

    public static <T, U> BodySubscriber<U> mapping(
      BodySubscriber<T> upstream,
      Function<? super T, ? extends U> mapper) {
      Objects.requireNonNull(upstream);
      Objects.requireNonNull(mapper);
      return new MappingBodySubscriber<T, U>(upstream, mapper);
    }
  }

  public static final class FixedBodySubscriber<T> implements BodySubscriber<T> {
    private final T value;
    private final CompletableFuture<T> body;

    private FixedBodySubscriber(T value) {
      this.value = value;
      this.body = new CompletableFuture<T>();
    }

    public CompletionStage<T> getBody() {
      return body;
    }

    public void onSubscribe(Flow.Subscription subscription) {
      Objects.requireNonNull(subscription).request(Long.MAX_VALUE);
    }

    public void onNext(List<ByteBuffer> item) {}
    public void onError(Throwable throwable) {
      body.completeExceptionally(throwable);
    }
    public void onComplete() {
      body.complete(value);
    }
  }

  public static final class CollectingBodySubscriber<T> implements BodySubscriber<T> {
    private final Function<byte[], T> finisher;
    private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    private final CompletableFuture<T> body = new CompletableFuture<T>();

    private CollectingBodySubscriber(Function<byte[], T> finisher) {
      this.finisher = finisher;
    }

    public CompletionStage<T> getBody() {
      return body;
    }

    public void onSubscribe(Flow.Subscription subscription) {
      Objects.requireNonNull(subscription).request(Long.MAX_VALUE);
    }

    public void onNext(List<ByteBuffer> item) {
      Objects.requireNonNull(item);
      for (int i = 0; i < item.size(); i++) {
        ByteBuffer buffer = Objects.requireNonNull(item.get(i)).duplicate();
        byte[] chunk = new byte[buffer.remaining()];
        buffer.get(chunk);
        bytes.write(chunk, 0, chunk.length);
      }
    }

    public void onError(Throwable throwable) {
      body.completeExceptionally(throwable);
    }

    public void onComplete() {
      try {
        body.complete(finisher.apply(bytes.toByteArray()));
      } catch (Throwable throwable) {
        body.completeExceptionally(throwable);
      }
    }
  }

  public static final class LineSubscriberAdapter<T> implements BodySubscriber<T> {
    private final Flow.Subscriber<? super String> subscriber;
    private final Function<Flow.Subscriber<? super String>, T> finisher;
    private final Charset charset;
    private final String lineSeparator;
    private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    private final CompletableFuture<T> body = new CompletableFuture<T>();

    private LineSubscriberAdapter(
      Flow.Subscriber<? super String> subscriber,
      Function<Flow.Subscriber<? super String>, T> finisher,
      Charset charset,
      String lineSeparator) {
      this.subscriber = subscriber;
      this.finisher = finisher;
      this.charset = charset;
      this.lineSeparator = lineSeparator;
    }

    public CompletionStage<T> getBody() {
      return body;
    }

    public void onSubscribe(Flow.Subscription subscription) {
      final Flow.Subscription upstream = Objects.requireNonNull(subscription);
      subscriber.onSubscribe(new Flow.Subscription() {
        public void request(long n) {
          upstream.request(n);
        }

        public void cancel() {
          upstream.cancel();
        }
      });
      upstream.request(Long.MAX_VALUE);
    }

    public void onNext(List<ByteBuffer> item) {
      Objects.requireNonNull(item);
      for (int i = 0; i < item.size(); i++) {
        ByteBuffer buffer = Objects.requireNonNull(item.get(i)).duplicate();
        byte[] chunk = new byte[buffer.remaining()];
        buffer.get(chunk);
        bytes.write(chunk, 0, chunk.length);
      }
    }

    public void onError(Throwable throwable) {
      Objects.requireNonNull(throwable);
      try {
        subscriber.onError(throwable);
      } finally {
        body.completeExceptionally(throwable);
      }
    }

    public void onComplete() {
      try {
        ArrayList<String> lines = splitLines(new String(bytes.toByteArray(), charset), lineSeparator);
        for (int i = 0; i < lines.size(); i++) {
          subscriber.onNext(lines.get(i));
        }
        subscriber.onComplete();
        body.complete(finisher == null ? null : finisher.apply(subscriber));
      } catch (Throwable throwable) {
        body.completeExceptionally(throwable);
      }
    }
  }

  public static final class ByteArrayConsumerBodySubscriber implements BodySubscriber<Void> {
    private final Consumer<Optional<byte[]>> consumer;
    private final CompletableFuture<Void> body = new CompletableFuture<Void>();

    private ByteArrayConsumerBodySubscriber(Consumer<Optional<byte[]>> consumer) {
      this.consumer = consumer;
    }

    public CompletionStage<Void> getBody() {
      return body;
    }

    public void onSubscribe(Flow.Subscription subscription) {
      Objects.requireNonNull(subscription).request(Long.MAX_VALUE);
    }

    public void onNext(List<ByteBuffer> item) {
      Objects.requireNonNull(item);
      for (int i = 0; i < item.size(); i++) {
        ByteBuffer buffer = Objects.requireNonNull(item.get(i)).duplicate();
        byte[] chunk = new byte[buffer.remaining()];
        buffer.get(chunk);
        consumer.accept(Optional.of(chunk));
      }
    }

    public void onError(Throwable throwable) {
      body.completeExceptionally(throwable);
    }

    public void onComplete() {
      try {
        consumer.accept(Optional.<byte[]>empty());
        body.complete(null);
      } catch (Throwable throwable) {
        body.completeExceptionally(throwable);
      }
    }
  }

  public static final class FileBodySubscriber implements BodySubscriber<Path> {
    private final Path file;
    private final OpenOption[] openOptions;
    private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    private final CompletableFuture<Path> body = new CompletableFuture<Path>();

    private FileBodySubscriber(Path file, OpenOption[] openOptions) {
      this.file = file;
      this.openOptions = openOptions;
    }

    public CompletionStage<Path> getBody() {
      return body;
    }

    public void onSubscribe(Flow.Subscription subscription) {
      Objects.requireNonNull(subscription).request(Long.MAX_VALUE);
    }

    public void onNext(List<ByteBuffer> item) {
      Objects.requireNonNull(item);
      for (int i = 0; i < item.size(); i++) {
        ByteBuffer buffer = Objects.requireNonNull(item.get(i)).duplicate();
        byte[] chunk = new byte[buffer.remaining()];
        buffer.get(chunk);
        bytes.write(chunk, 0, chunk.length);
      }
    }

    public void onError(Throwable throwable) {
      body.completeExceptionally(throwable);
    }

    public void onComplete() {
      try {
        Files.write(file, bytes.toByteArray(), openOptions);
        body.complete(file);
      } catch (Throwable throwable) {
        body.completeExceptionally(throwable);
      }
    }
  }

  public static final class PublisherBodySubscriber implements BodySubscriber<Flow.Publisher<List<ByteBuffer>>> {
    private final BodyPublisherBridge publisher = new BodyPublisherBridge();
    private final CompletableFuture<Flow.Publisher<List<ByteBuffer>>> body =
      new CompletableFuture<Flow.Publisher<List<ByteBuffer>>>();

    public CompletionStage<Flow.Publisher<List<ByteBuffer>>> getBody() {
      return body;
    }

    public void onSubscribe(Flow.Subscription subscription) {
      Objects.requireNonNull(subscription).request(Long.MAX_VALUE);
      body.complete(publisher);
    }

    public void onNext(List<ByteBuffer> item) {
      publisher.publish(item);
    }

    public void onError(Throwable throwable) {
      publisher.fail(throwable);
      body.completeExceptionally(throwable);
    }

    public void onComplete() {
      publisher.complete();
    }
  }

  static final class BodyPublisherBridge implements Flow.Publisher<List<ByteBuffer>> {
    private final ArrayList<List<ByteBuffer>> pending = new ArrayList<List<ByteBuffer>>();
    private Flow.Subscriber<? super List<ByteBuffer>> subscriber;
    private boolean completed;
    private Throwable error;

    public void subscribe(Flow.Subscriber<? super List<ByteBuffer>> subscriber) {
      Objects.requireNonNull(subscriber);
      if (this.subscriber != null) {
        subscriber.onSubscribe(new Flow.Subscription() {
          public void request(long n) {}
          public void cancel() {}
        });
        subscriber.onError(new IllegalStateException());
        return;
      }
      this.subscriber = subscriber;
      subscriber.onSubscribe(new Flow.Subscription() {
        public void request(long n) {}
        public void cancel() {}
      });
      for (int i = 0; i < pending.size(); i++) {
        subscriber.onNext(pending.get(i));
      }
      pending.clear();
      if (error != null) {
        subscriber.onError(error);
      } else if (completed) {
        subscriber.onComplete();
      }
    }

    private void publish(List<ByteBuffer> item) {
      Objects.requireNonNull(item);
      ArrayList<ByteBuffer> copy = new ArrayList<ByteBuffer>();
      for (int i = 0; i < item.size(); i++) {
        copy.add(Objects.requireNonNull(item.get(i)).duplicate());
      }
      if (subscriber != null) {
        subscriber.onNext(copy);
      } else {
        pending.add(copy);
      }
    }

    private void fail(Throwable throwable) {
      error = throwable;
      if (subscriber != null) {
        subscriber.onError(throwable);
      }
    }

    private void complete() {
      completed = true;
      if (subscriber != null) {
        subscriber.onComplete();
      }
    }
  }

  public static final class DelegatingBodySubscriber<T> implements BodySubscriber<T> {
    private final BodySubscriber<T> downstream;

    private DelegatingBodySubscriber(BodySubscriber<T> downstream) {
      this.downstream = downstream;
    }

    public CompletionStage<T> getBody() {
      return downstream.getBody();
    }

    public void onSubscribe(Flow.Subscription subscription) {
      downstream.onSubscribe(subscription);
    }

    public void onNext(List<ByteBuffer> item) {
      downstream.onNext(item);
    }

    public void onError(Throwable throwable) {
      downstream.onError(throwable);
    }

    public void onComplete() {
      downstream.onComplete();
    }
  }

  public static final class MappingBodySubscriber<T, U> implements BodySubscriber<U> {
    private final BodySubscriber<T> upstream;
    private final Function<? super T, ? extends U> mapper;

    private MappingBodySubscriber(BodySubscriber<T> upstream, Function<? super T, ? extends U> mapper) {
      this.upstream = upstream;
      this.mapper = mapper;
    }

    public CompletionStage<U> getBody() {
      return upstream.getBody().thenApply(mapper);
    }

    public void onSubscribe(Flow.Subscription subscription) {
      upstream.onSubscribe(subscription);
    }

    public void onNext(List<ByteBuffer> item) {
      upstream.onNext(item);
    }

    public void onError(Throwable throwable) {
      upstream.onError(throwable);
    }

    public void onComplete() {
      upstream.onComplete();
    }
  }

  static final class SubscriberAdapter<T> implements BodySubscriber<T> {
    private final Flow.Subscriber<? super List<ByteBuffer>> subscriber;
    private final Function<Flow.Subscriber<? super List<ByteBuffer>>, ? extends T> finisher;
    private final CompletableFuture<T> body;

    private SubscriberAdapter(
      Flow.Subscriber<? super List<ByteBuffer>> subscriber,
      Function<Flow.Subscriber<? super List<ByteBuffer>>, ? extends T> finisher) {
      this.subscriber = subscriber;
      this.finisher = finisher;
      this.body = new CompletableFuture<T>();
    }

    public CompletionStage<T> getBody() {
      return body;
    }

    public void onSubscribe(Flow.Subscription subscription) {
      subscriber.onSubscribe(subscription);
    }

    public void onNext(List<ByteBuffer> item) {
      subscriber.onNext(item);
    }

    public void onError(Throwable throwable) {
      subscriber.onError(throwable);
      body.completeExceptionally(throwable);
    }

    public void onComplete() {
      try {
        subscriber.onComplete();
        body.complete(finisher == null ? null : finisher.apply(subscriber));
      } catch (Throwable throwable) {
        body.completeExceptionally(throwable);
      }
    }
  }

  private static OpenOption[] copyOpenOptions(OpenOption[] openOptions) {
    Objects.requireNonNull(openOptions);
    OpenOption[] options = openOptions.length == 0
      ? new OpenOption[] { StandardOpenOption.CREATE, StandardOpenOption.WRITE }
      : openOptions.clone();
    for (int i = 0; i < options.length; i++) {
      Objects.requireNonNull(options[i]);
    }
    return options;
  }
}
