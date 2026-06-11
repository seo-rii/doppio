package java.net.http;

import java.io.IOException;
import java.net.Authenticator;
import java.net.CookieHandler;
import java.net.InetSocketAddress;
import java.net.ProxySelector;
import java.net.SocketAddress;
import java.net.URI;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;

public abstract class HttpClient {
  protected HttpClient() {}

  public static HttpClient newHttpClient() {
    return newBuilder().build();
  }

  public static Builder newBuilder() {
    return new ClientBuilder();
  }

  public abstract Optional<CookieHandler> cookieHandler();
  public abstract Optional<Duration> connectTimeout();
  public abstract Redirect followRedirects();
  public abstract Optional<ProxySelector> proxy();
  public abstract SSLContext sslContext();
  public abstract SSLParameters sslParameters();
  public abstract Optional<Authenticator> authenticator();
  public abstract Version version();
  public abstract Optional<Executor> executor();

  public abstract <T> HttpResponse<T> send(HttpRequest request, HttpResponse.BodyHandler<T> responseBodyHandler)
    throws IOException, InterruptedException;

  public abstract <T> CompletableFuture<HttpResponse<T>> sendAsync(
    HttpRequest request,
    HttpResponse.BodyHandler<T> responseBodyHandler);

  public abstract <T> CompletableFuture<HttpResponse<T>> sendAsync(
    HttpRequest request,
    HttpResponse.BodyHandler<T> responseBodyHandler,
    HttpResponse.PushPromiseHandler<T> pushPromiseHandler);

  public WebSocket.Builder newWebSocketBuilder() {
    return new WebSocketBuilder();
  }

  public enum Redirect {
    NEVER,
    ALWAYS,
    NORMAL
  }

  public enum Version {
    HTTP_1_1,
    HTTP_2
  }

  public static interface Builder {
    public static final ProxySelector NO_PROXY = NoProxySelector.INSTANCE;

    public Builder cookieHandler(CookieHandler cookieHandler);
    public Builder connectTimeout(Duration duration);
    public Builder sslContext(SSLContext sslContext);
    public Builder sslParameters(SSLParameters sslParameters);
    public Builder executor(Executor executor);
    public Builder followRedirects(Redirect policy);
    public Builder version(Version version);
    public Builder priority(int priority);
    public Builder proxy(ProxySelector proxySelector);
    public Builder authenticator(Authenticator authenticator);
    public HttpClient build();
  }

  private static final class ClientBuilder implements Builder {
    private CookieHandler cookieHandler;
    private Duration connectTimeout;
    private Redirect redirect = Redirect.NEVER;
    private ProxySelector proxy;
    private SSLContext sslContext;
    private SSLParameters sslParameters = new SSLParameters();
    private Authenticator authenticator;
    private Version version = Version.HTTP_2;
    private Executor executor;
    private int priority = 1;

    public Builder cookieHandler(CookieHandler cookieHandler) {
      this.cookieHandler = Objects.requireNonNull(cookieHandler);
      return this;
    }

    public Builder connectTimeout(Duration duration) {
      Objects.requireNonNull(duration);
      if (duration.isZero() || duration.isNegative()) {
        throw new IllegalArgumentException();
      }
      this.connectTimeout = duration;
      return this;
    }

    public Builder sslContext(SSLContext sslContext) {
      this.sslContext = Objects.requireNonNull(sslContext);
      return this;
    }

    public Builder sslParameters(SSLParameters sslParameters) {
      this.sslParameters = copySSLParameters(Objects.requireNonNull(sslParameters));
      return this;
    }

    public Builder executor(Executor executor) {
      this.executor = Objects.requireNonNull(executor);
      return this;
    }

    public Builder followRedirects(Redirect policy) {
      this.redirect = Objects.requireNonNull(policy);
      return this;
    }

    public Builder version(Version version) {
      this.version = Objects.requireNonNull(version);
      return this;
    }

    public Builder priority(int priority) {
      if (priority < 1 || priority > 256) {
        throw new IllegalArgumentException();
      }
      this.priority = priority;
      return this;
    }

    public Builder proxy(ProxySelector proxySelector) {
      this.proxy = Objects.requireNonNull(proxySelector);
      return this;
    }

    public Builder authenticator(Authenticator authenticator) {
      this.authenticator = Objects.requireNonNull(authenticator);
      return this;
    }

    public HttpClient build() {
      return new BuiltHttpClient(this);
    }
  }

  private static final class BuiltHttpClient extends HttpClient {
    private final CookieHandler cookieHandler;
    private final Duration connectTimeout;
    private final Redirect redirect;
    private final ProxySelector proxy;
    private final SSLContext sslContext;
    private final SSLParameters sslParameters;
    private final Authenticator authenticator;
    private final Version version;
    private final Executor executor;
    private final int priority;

    private BuiltHttpClient(ClientBuilder builder) {
      this.cookieHandler = builder.cookieHandler;
      this.connectTimeout = builder.connectTimeout;
      this.redirect = builder.redirect;
      this.proxy = builder.proxy;
      if (builder.sslContext == null) {
        try {
          this.sslContext = SSLContext.getDefault();
        } catch (NoSuchAlgorithmException e) {
          throw new RuntimeException(e);
        }
      } else {
        this.sslContext = builder.sslContext;
      }
      this.sslParameters = copySSLParameters(builder.sslParameters);
      this.authenticator = builder.authenticator;
      this.version = builder.version;
      this.executor = builder.executor;
      this.priority = builder.priority;
    }

    public Optional<CookieHandler> cookieHandler() {
      return Optional.ofNullable(cookieHandler);
    }

    public Optional<Duration> connectTimeout() {
      return Optional.ofNullable(connectTimeout);
    }

    public Redirect followRedirects() {
      return redirect;
    }

    public Optional<ProxySelector> proxy() {
      return Optional.ofNullable(proxy);
    }

    public SSLContext sslContext() {
      return sslContext;
    }

    public SSLParameters sslParameters() {
      return copySSLParameters(sslParameters);
    }

    public Optional<Authenticator> authenticator() {
      return Optional.ofNullable(authenticator);
    }

    public Version version() {
      return version;
    }

    public Optional<Executor> executor() {
      return Optional.ofNullable(executor);
    }

    public <T> HttpResponse<T> send(HttpRequest request, HttpResponse.BodyHandler<T> responseBodyHandler)
      throws IOException, InterruptedException {
      Objects.requireNonNull(request);
      Objects.requireNonNull(responseBodyHandler);
      throw new UnsupportedOperationException("HTTP send is not implemented");
    }

    public <T> CompletableFuture<HttpResponse<T>> sendAsync(
      HttpRequest request,
      HttpResponse.BodyHandler<T> responseBodyHandler) {
      Objects.requireNonNull(request);
      Objects.requireNonNull(responseBodyHandler);
      return failedFuture(new UnsupportedOperationException("HTTP send is not implemented"));
    }

    public <T> CompletableFuture<HttpResponse<T>> sendAsync(
      HttpRequest request,
      HttpResponse.BodyHandler<T> responseBodyHandler,
      HttpResponse.PushPromiseHandler<T> pushPromiseHandler) {
      Objects.requireNonNull(pushPromiseHandler);
      return sendAsync(request, responseBodyHandler);
    }
  }

  private static final class NoProxySelector extends ProxySelector {
    private static final NoProxySelector INSTANCE = new NoProxySelector();

    public List<java.net.Proxy> select(URI uri) {
      Objects.requireNonNull(uri);
      return Collections.singletonList(java.net.Proxy.NO_PROXY);
    }

    public void connectFailed(URI uri, SocketAddress sa, IOException ioe) {
      Objects.requireNonNull(uri);
      Objects.requireNonNull(sa);
      Objects.requireNonNull(ioe);
    }
  }

  private static final class WebSocketBuilder implements WebSocket.Builder {
    public WebSocket.Builder header(String name, String value) {
      Objects.requireNonNull(name);
      Objects.requireNonNull(value);
      return this;
    }

    public WebSocket.Builder connectTimeout(Duration timeout) {
      Objects.requireNonNull(timeout);
      if (timeout.isZero() || timeout.isNegative()) {
        throw new IllegalArgumentException();
      }
      return this;
    }

    public WebSocket.Builder subprotocols(String mostPreferred, String... lesserPreferred) {
      Objects.requireNonNull(mostPreferred);
      Objects.requireNonNull(lesserPreferred);
      return this;
    }

    public CompletableFuture<WebSocket> buildAsync(URI uri, WebSocket.Listener listener) {
      Objects.requireNonNull(uri);
      Objects.requireNonNull(listener);
      return failedFuture(new UnsupportedOperationException("WebSocket is not implemented"));
    }
  }

  private static <T> CompletableFuture<T> failedFuture(Throwable failure) {
    CompletableFuture<T> future = new CompletableFuture<T>();
    future.completeExceptionally(failure);
    return future;
  }

  private static SSLParameters copySSLParameters(SSLParameters input) {
    SSLParameters copy = new SSLParameters(input.getCipherSuites(), input.getProtocols());
    copy.setAlgorithmConstraints(input.getAlgorithmConstraints());
    copy.setEndpointIdentificationAlgorithm(input.getEndpointIdentificationAlgorithm());
    copy.setServerNames(input.getServerNames());
    copy.setSNIMatchers(input.getSNIMatchers());
    copy.setUseCipherSuitesOrder(input.getUseCipherSuitesOrder());
    if (input.getNeedClientAuth()) {
      copy.setNeedClientAuth(true);
    } else if (input.getWantClientAuth()) {
      copy.setWantClientAuth(true);
    }
    return copy;
  }
}
