package java.net.http;

import java.net.URI;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

public interface WebSocket {
  public static final int NORMAL_CLOSURE = 1000;

  public CompletableFuture<WebSocket> sendText(CharSequence data, boolean last);
  public CompletableFuture<WebSocket> sendBinary(ByteBuffer data, boolean last);
  public CompletableFuture<WebSocket> sendPing(ByteBuffer message);
  public CompletableFuture<WebSocket> sendPong(ByteBuffer message);
  public CompletableFuture<WebSocket> sendClose(int statusCode, String reason);
  public void request(long n);
  public String getSubprotocol();
  public boolean isOutputClosed();
  public boolean isInputClosed();
  public void abort();

  public static interface Builder {
    public Builder header(String name, String value);
    public Builder connectTimeout(Duration timeout);
    public Builder subprotocols(String mostPreferred, String... lesserPreferred);
    public CompletableFuture<WebSocket> buildAsync(URI uri, Listener listener);
  }

  public static interface Listener {
    public default void onOpen(WebSocket webSocket) {
      Objects.requireNonNull(webSocket).request(1L);
    }

    public default CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
      Objects.requireNonNull(webSocket).request(1L);
      return null;
    }

    public default CompletionStage<?> onBinary(WebSocket webSocket, ByteBuffer data, boolean last) {
      Objects.requireNonNull(webSocket).request(1L);
      return null;
    }

    public default CompletionStage<?> onPing(WebSocket webSocket, ByteBuffer message) {
      Objects.requireNonNull(webSocket).request(1L);
      return null;
    }

    public default CompletionStage<?> onPong(WebSocket webSocket, ByteBuffer message) {
      Objects.requireNonNull(webSocket).request(1L);
      return null;
    }

    public default CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
      return null;
    }

    public default void onError(WebSocket webSocket, Throwable error) {}
  }
}
