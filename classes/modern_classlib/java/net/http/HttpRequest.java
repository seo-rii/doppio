package java.net.http;

import java.io.FileNotFoundException;
import java.io.InputStream;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.Flow;
import java.util.function.BiPredicate;
import java.util.function.Supplier;

public abstract class HttpRequest {
  protected HttpRequest() {}

  public static Builder newBuilder(URI uri) {
    return new RequestBuilder().uri(uri);
  }

  public static Builder newBuilder(HttpRequest request, BiPredicate<String, String> filter) {
    Objects.requireNonNull(request);
    Objects.requireNonNull(filter);
    RequestBuilder builder = new RequestBuilder();
    builder.uri(request.uri());
    builder.expectContinue(request.expectContinue());
    if (request.timeout().isPresent()) {
      builder.timeout(request.timeout().get());
    }
    if (request.version().isPresent()) {
      builder.version(request.version().get());
    }
    if (request.bodyPublisher().isPresent()) {
      builder.method(request.method(), request.bodyPublisher().get());
    } else {
      builder.setMethod(request.method(), null);
    }
    Map<String, java.util.List<String>> headers = request.headers().map();
    for (Map.Entry<String, java.util.List<String>> entry : headers.entrySet()) {
      for (int i = 0; i < entry.getValue().size(); i++) {
        String value = entry.getValue().get(i);
        if (filter.test(entry.getKey(), value)) {
          builder.header(entry.getKey(), value);
        }
      }
    }
    return builder;
  }

  public static Builder newBuilder() {
    return new RequestBuilder();
  }

  public abstract Optional<BodyPublisher> bodyPublisher();
  public abstract String method();
  public abstract Optional<Duration> timeout();
  public abstract boolean expectContinue();
  public abstract URI uri();
  public abstract Optional<HttpClient.Version> version();
  public abstract HttpHeaders headers();

  public final boolean equals(Object obj) {
    return super.equals(obj);
  }

  public final int hashCode() {
    return super.hashCode();
  }

  public static interface Builder {
    public Builder uri(URI uri);
    public Builder expectContinue(boolean enable);
    public Builder version(HttpClient.Version version);
    public Builder header(String name, String value);
    public Builder headers(String... headers);
    public Builder timeout(Duration duration);
    public Builder setHeader(String name, String value);
    public Builder GET();
    public Builder POST(BodyPublisher bodyPublisher);
    public Builder PUT(BodyPublisher bodyPublisher);
    public Builder DELETE();
    public Builder method(String method, BodyPublisher bodyPublisher);
    public HttpRequest build();
    public Builder copy();
  }

  public static interface BodyPublisher extends Flow.Publisher<ByteBuffer> {
    public long contentLength();
  }

  public static class BodyPublishers {
    public static BodyPublisher fromPublisher(Flow.Publisher<? extends ByteBuffer> publisher) {
      Objects.requireNonNull(publisher);
      return new UnknownLengthPublisher(publisher);
    }

    public static BodyPublisher fromPublisher(Flow.Publisher<? extends ByteBuffer> publisher, long contentLength) {
      Objects.requireNonNull(publisher);
      if (contentLength < 0L) {
        throw new IllegalArgumentException();
      }
      return new FixedLengthPublisher(publisher, contentLength);
    }

    public static BodyPublisher ofString(String body) {
      return ofString(body, StandardCharsets.UTF_8);
    }

    public static BodyPublisher ofString(String body, Charset charset) {
      Objects.requireNonNull(body);
      Objects.requireNonNull(charset);
      return ofByteArray(body.getBytes(charset));
    }

    public static BodyPublisher ofInputStream(Supplier<? extends InputStream> streamSupplier) {
      Objects.requireNonNull(streamSupplier);
      return new InputStreamPublisher(streamSupplier);
    }

    public static BodyPublisher ofByteArray(byte[] body) {
      Objects.requireNonNull(body);
      return ofByteArray(body, 0, body.length);
    }

    public static BodyPublisher ofByteArray(byte[] body, int offset, int length) {
      Objects.requireNonNull(body);
      if (offset < 0 || length < 0 || offset > body.length - length) {
        throw new IndexOutOfBoundsException();
      }
      return new ByteArrayPublisher(body, offset, length);
    }

    public static BodyPublisher ofFile(Path path) throws FileNotFoundException {
      Objects.requireNonNull(path);
      try {
        byte[] bytes = java.nio.file.Files.readAllBytes(path);
        return new ByteArrayPublisher(bytes, 0, bytes.length);
      } catch (java.io.IOException e) {
        FileNotFoundException exception = new FileNotFoundException(path.toString());
        exception.initCause(e);
        throw exception;
      }
    }

    public static BodyPublisher ofByteArrays(Iterable<byte[]> iter) {
      Objects.requireNonNull(iter);
      return new ByteArraysPublisher(iter);
    }

    public static BodyPublisher noBody() {
      return new ByteArrayPublisher(new byte[0], 0, 0);
    }

    public static BodyPublisher concat(BodyPublisher... publishers) {
      Objects.requireNonNull(publishers);
      long total = 0L;
      for (int i = 0; i < publishers.length; i++) {
        BodyPublisher publisher = Objects.requireNonNull(publishers[i]);
        long length = publisher.contentLength();
        if (length < 0L || total < 0L) {
          total = -1L;
        } else {
          total += length;
        }
      }
      return new ConcatPublisher(publishers.clone(), total);
    }
  }

  private static final class RequestBuilder implements Builder {
    private URI uri;
    private BodyPublisher bodyPublisher;
    private String method = "GET";
    private Duration timeout;
    private boolean expectContinue;
    private HttpClient.Version version;
    private final Map<String, java.util.List<String>> headers = new LinkedHashMap<String, java.util.List<String>>();

    public Builder uri(URI uri) {
      this.uri = Objects.requireNonNull(uri);
      return this;
    }

    public Builder expectContinue(boolean enable) {
      this.expectContinue = enable;
      return this;
    }

    public Builder version(HttpClient.Version version) {
      this.version = Objects.requireNonNull(version);
      return this;
    }

    public Builder header(String name, String value) {
      HttpHeaders.add(headers, requireHeaderName(name), requireHeaderValue(value));
      return this;
    }

    public Builder headers(String... headers) {
      Objects.requireNonNull(headers);
      if (headers.length % 2 != 0) {
        throw new IllegalArgumentException();
      }
      for (int i = 0; i < headers.length; i += 2) {
        header(headers[i], headers[i + 1]);
      }
      return this;
    }

    public Builder timeout(Duration duration) {
      Objects.requireNonNull(duration);
      if (duration.isZero() || duration.isNegative()) {
        throw new IllegalArgumentException();
      }
      this.timeout = duration;
      return this;
    }

    public Builder setHeader(String name, String value) {
      HttpHeaders.set(headers, requireHeaderName(name), requireHeaderValue(value));
      return this;
    }

    public Builder GET() {
      return setMethod("GET", null);
    }

    public Builder POST(BodyPublisher bodyPublisher) {
      return method("POST", Objects.requireNonNull(bodyPublisher));
    }

    public Builder PUT(BodyPublisher bodyPublisher) {
      return method("PUT", Objects.requireNonNull(bodyPublisher));
    }

    public Builder DELETE() {
      return setMethod("DELETE", null);
    }

    public Builder method(String method, BodyPublisher bodyPublisher) {
      Objects.requireNonNull(bodyPublisher);
      return setMethod(method, bodyPublisher);
    }

    private Builder setMethod(String method, BodyPublisher bodyPublisher) {
      this.method = requireMethod(method);
      this.bodyPublisher = bodyPublisher;
      return this;
    }

    public HttpRequest build() {
      if (uri == null) {
        throw new IllegalStateException();
      }
      return new BuiltHttpRequest(uri, bodyPublisher, method, timeout, expectContinue, version, HttpHeaders.fromBuilderMap(headers));
    }

    public Builder copy() {
      RequestBuilder builder = new RequestBuilder();
      builder.uri = uri;
      builder.bodyPublisher = bodyPublisher;
      builder.method = method;
      builder.timeout = timeout;
      builder.expectContinue = expectContinue;
      builder.version = version;
      for (Map.Entry<String, java.util.List<String>> entry : headers.entrySet()) {
        builder.headers.put(entry.getKey(), new java.util.ArrayList<String>(entry.getValue()));
      }
      return builder;
    }
  }

  private static final class BuiltHttpRequest extends HttpRequest {
    private final URI uri;
    private final BodyPublisher bodyPublisher;
    private final String method;
    private final Duration timeout;
    private final boolean expectContinue;
    private final HttpClient.Version version;
    private final HttpHeaders headers;

    private BuiltHttpRequest(
      URI uri,
      BodyPublisher bodyPublisher,
      String method,
      Duration timeout,
      boolean expectContinue,
      HttpClient.Version version,
      HttpHeaders headers) {
      this.uri = uri;
      this.bodyPublisher = bodyPublisher;
      this.method = method;
      this.timeout = timeout;
      this.expectContinue = expectContinue;
      this.version = version;
      this.headers = headers;
    }

    public Optional<BodyPublisher> bodyPublisher() {
      return Optional.ofNullable(bodyPublisher);
    }

    public String method() {
      return method;
    }

    public Optional<Duration> timeout() {
      return Optional.ofNullable(timeout);
    }

    public boolean expectContinue() {
      return expectContinue;
    }

    public URI uri() {
      return uri;
    }

    public Optional<HttpClient.Version> version() {
      return Optional.ofNullable(version);
    }

    public HttpHeaders headers() {
      return headers;
    }
  }

  private static class ByteArrayPublisher implements BodyPublisher {
    private final byte[] bytes;
    private final int offset;
    private final int length;

    private ByteArrayPublisher(byte[] bytes, int offset, int length) {
      this.bytes = bytes;
      this.offset = offset;
      this.length = length;
    }

    public long contentLength() {
      return length;
    }

    public void subscribe(Flow.Subscriber<? super ByteBuffer> subscriber) {
      Objects.requireNonNull(subscriber);
      subscriber.onSubscribe(new EmptySubscription());
      if (length > 0) {
        subscriber.onNext(ByteBuffer.wrap(bytes, offset, length));
      }
      subscriber.onComplete();
    }
  }

  private static final class ByteArraysPublisher implements BodyPublisher {
    private final Iterable<byte[]> iterable;

    private ByteArraysPublisher(Iterable<byte[]> iterable) {
      this.iterable = iterable;
    }

    public long contentLength() {
      return -1L;
    }

    public void subscribe(Flow.Subscriber<? super ByteBuffer> subscriber) {
      Objects.requireNonNull(subscriber);
      subscriber.onSubscribe(new EmptySubscription());
      try {
        Iterator<byte[]> iterator = iterable.iterator();
        while (iterator.hasNext()) {
          byte[] bytes = Objects.requireNonNull(iterator.next());
          if (bytes.length > 0) {
            subscriber.onNext(ByteBuffer.wrap(bytes));
          }
        }
        subscriber.onComplete();
      } catch (Throwable throwable) {
        subscriber.onError(throwable);
      }
    }
  }

  private static final class InputStreamPublisher implements BodyPublisher {
    private final Supplier<? extends InputStream> streamSupplier;

    private InputStreamPublisher(Supplier<? extends InputStream> streamSupplier) {
      this.streamSupplier = streamSupplier;
    }

    public long contentLength() {
      return -1L;
    }

    public void subscribe(Flow.Subscriber<? super ByteBuffer> subscriber) {
      Objects.requireNonNull(subscriber);
      subscriber.onSubscribe(new EmptySubscription());
      InputStream stream = streamSupplier.get();
      if (stream == null) {
        subscriber.onError(new java.io.IOException("streamSupplier returned null"));
        return;
      }
      try {
        try {
          byte[] bytes = stream.readAllBytes();
          if (bytes.length > 0) {
            subscriber.onNext(ByteBuffer.wrap(bytes));
          }
        } finally {
          stream.close();
        }
        subscriber.onComplete();
      } catch (Throwable throwable) {
        subscriber.onError(throwable);
      }
    }
  }

  private static final class ConcatPublisher implements BodyPublisher {
    private final BodyPublisher[] publishers;
    private final long contentLength;

    private ConcatPublisher(BodyPublisher[] publishers, long contentLength) {
      this.publishers = publishers;
      this.contentLength = contentLength;
    }

    public long contentLength() {
      return contentLength;
    }

    public void subscribe(Flow.Subscriber<? super ByteBuffer> subscriber) {
      Objects.requireNonNull(subscriber);
      subscriber.onSubscribe(new EmptySubscription());
      try {
        for (int i = 0; i < publishers.length; i++) {
          ConcatForwardingSubscriber forwarding = new ConcatForwardingSubscriber(subscriber);
          publishers[i].subscribe(forwarding);
          if (forwarding.error != null) {
            throw forwarding.error;
          }
        }
        subscriber.onComplete();
      } catch (Throwable throwable) {
        subscriber.onError(throwable);
      }
    }
  }

  private static final class ConcatForwardingSubscriber implements Flow.Subscriber<ByteBuffer> {
    private final Flow.Subscriber<? super ByteBuffer> target;
    private Throwable error;

    private ConcatForwardingSubscriber(Flow.Subscriber<? super ByteBuffer> target) {
      this.target = target;
    }

    public void onSubscribe(Flow.Subscription subscription) {
      subscription.request(Long.MAX_VALUE);
    }

    public void onNext(ByteBuffer item) {
      target.onNext(item);
    }

    public void onError(Throwable throwable) {
      error = throwable;
    }

    public void onComplete() {}
  }

  private static final class UnknownLengthPublisher implements BodyPublisher {
    private final Flow.Publisher<? extends ByteBuffer> publisher;

    private UnknownLengthPublisher(Flow.Publisher<? extends ByteBuffer> publisher) {
      this.publisher = publisher;
    }

    public long contentLength() {
      return -1L;
    }

    public void subscribe(Flow.Subscriber<? super ByteBuffer> subscriber) {
      publisher.subscribe(subscriber);
    }
  }

  private static final class FixedLengthPublisher implements BodyPublisher {
    private final Flow.Publisher<? extends ByteBuffer> publisher;
    private final long contentLength;

    private FixedLengthPublisher(Flow.Publisher<? extends ByteBuffer> publisher, long contentLength) {
      this.publisher = publisher;
      this.contentLength = contentLength;
    }

    public long contentLength() {
      return contentLength;
    }

    public void subscribe(Flow.Subscriber<? super ByteBuffer> subscriber) {
      publisher.subscribe(subscriber);
    }
  }

  private static final class EmptySubscription implements Flow.Subscription {
    public void request(long n) {}
    public void cancel() {}
  }

  private static String requireHeaderName(String name) {
    Objects.requireNonNull(name);
    if (name.length() == 0) {
      throw new IllegalArgumentException();
    }
    String separators = "()<>@,;:\\\"/[]?={}";
    for (int i = 0; i < name.length(); i++) {
      char ch = name.charAt(i);
      if (ch <= ' ' || ch >= 127 || separators.indexOf(ch) >= 0) {
        throw new IllegalArgumentException();
      }
    }
    return name;
  }

  private static String requireHeaderValue(String value) {
    Objects.requireNonNull(value);
    for (int i = 0; i < value.length(); i++) {
      char ch = value.charAt(i);
      if (ch == '\r' || ch == '\n') {
        throw new IllegalArgumentException();
      }
    }
    return value;
  }

  private static String requireMethod(String method) {
    Objects.requireNonNull(method);
    if (method.length() == 0) {
      throw new IllegalArgumentException();
    }
    String separators = "()<>@,;:\\\"/[]?={}";
    for (int i = 0; i < method.length(); i++) {
      char ch = method.charAt(i);
      if (ch <= ' ' || ch >= 127 || separators.indexOf(ch) >= 0) {
        throw new IllegalArgumentException();
      }
    }
    return method;
  }
}
