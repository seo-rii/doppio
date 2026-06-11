package classes.modern_test;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.SSLParameters;

public class Java11HttpClient {
  public static void main(String[] args) throws Exception {
    HttpClient client = HttpClient.newBuilder()
      .version(HttpClient.Version.HTTP_1_1)
      .connectTimeout(Duration.ofSeconds(3))
      .followRedirects(HttpClient.Redirect.NORMAL)
      .build();
    System.out.println(client.version());
    System.out.println(client.followRedirects());
    System.out.println(client.connectTimeout().isPresent());
    System.out.println(client.connectTimeout().get().getSeconds());
    HttpClient defaultClient = HttpClient.newHttpClient();
    System.out.println(defaultClient.sslContext() != null);
    System.out.println(defaultClient.sslParameters() != null);
    SSLParameters sslParameters = new SSLParameters();
    sslParameters.setEndpointIdentificationAlgorithm("HTTPS");
    HttpClient sslParametersClient = HttpClient.newBuilder()
      .sslParameters(sslParameters)
      .build();
    System.out.println(sslParametersClient.sslParameters() == sslParameters);
    System.out.println(sslParametersClient.sslParameters().getEndpointIdentificationAlgorithm());
    sslParameters.setEndpointIdentificationAlgorithm("mutated");
    System.out.println(sslParametersClient.sslParameters().getEndpointIdentificationAlgorithm());
    SSLParameters returnedSSLParameters = sslParametersClient.sslParameters();
    returnedSSLParameters.setEndpointIdentificationAlgorithm("returned");
    System.out.println(sslParametersClient.sslParameters().getEndpointIdentificationAlgorithm());
    java.util.List<java.net.Proxy> noProxySelection =
      HttpClient.Builder.NO_PROXY.select(URI.create("https://example.com"));
    System.out.println(noProxySelection);
    try {
      noProxySelection.add(java.net.Proxy.NO_PROXY);
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
    java.net.CookieManager cookieManager = new java.net.CookieManager();
    java.net.ProxySelector proxySelector = new java.net.ProxySelector() {
      public java.util.List<java.net.Proxy> select(URI uri) {
        return java.util.Collections.singletonList(java.net.Proxy.NO_PROXY);
      }

      public void connectFailed(URI uri, java.net.SocketAddress address, java.io.IOException exception) {}
    };
    java.net.Authenticator authenticator = new java.net.Authenticator() {};
    java.util.concurrent.Executor executor = new java.util.concurrent.Executor() {
      public void execute(Runnable command) {
        command.run();
      }
    };
    HttpClient metadataClient = HttpClient.newBuilder()
      .cookieHandler(cookieManager)
      .proxy(proxySelector)
      .authenticator(authenticator)
      .executor(executor)
      .priority(16)
      .build();
    System.out.println(metadataClient.cookieHandler().get() == cookieManager);
    System.out.println(metadataClient.proxy().get() == proxySelector);
    System.out.println(metadataClient.authenticator().get() == authenticator);
    System.out.println(metadataClient.executor().get() == executor);

    HttpRequest request = HttpRequest.newBuilder(URI.create("https://example.com/api"))
      .timeout(Duration.ofMillis(250))
      .header("X-Test", "a")
      .header("X-Test", "b")
      .POST(HttpRequest.BodyPublishers.noBody())
      .build();
    System.out.println(request.method());
    System.out.println(request.uri());
    System.out.println(request.timeout().get().toMillis());
    System.out.println(request.headers().allValues("X-Test"));
    System.out.println(request.bodyPublisher().isPresent());
    System.out.println(request.bodyPublisher().get().contentLength());
    HttpRequest.Builder copySourceBuilder = HttpRequest.newBuilder(URI.create("https://example.com/copy"))
      .timeout(Duration.ofMillis(500))
      .version(HttpClient.Version.HTTP_1_1)
      .expectContinue(true)
      .headers("X-Copy", "one", "X-Copy", "two")
      .POST(HttpRequest.BodyPublishers.ofString("copy"));
    HttpRequest.Builder copiedBuilder = copySourceBuilder.copy();
    copySourceBuilder
      .uri(URI.create("https://example.com/mutated"))
      .setHeader("X-Copy", "mutated")
      .expectContinue(false)
      .DELETE();
    HttpRequest copiedRequest = copiedBuilder.build();
    System.out.println(copiedRequest.uri());
    System.out.println(copiedRequest.method());
    System.out.println(copiedRequest.expectContinue());
    System.out.println(copiedRequest.timeout().get().toMillis());
    System.out.println(copiedRequest.version().get());
    System.out.println(copiedRequest.headers().allValues("X-Copy"));
    System.out.println(copiedRequest.bodyPublisher().get().contentLength());
    HttpRequest defaultBuilderRequest = HttpRequest.newBuilder()
      .uri(URI.create("https://example.com/defaults"))
      .build();
    System.out.println(defaultBuilderRequest.method());
    System.out.println(defaultBuilderRequest.bodyPublisher().isPresent());
    System.out.println(defaultBuilderRequest.timeout().isPresent());
    System.out.println(defaultBuilderRequest.version().isPresent());
    System.out.println(defaultBuilderRequest.expectContinue());
    System.out.println(defaultBuilderRequest.headers().map().isEmpty());
    HttpRequest replacedHeaderRequest = HttpRequest.newBuilder(URI.create("https://example.com/replace"))
      .header("X-Replace", "a")
      .header("X-Replace", "b")
      .setHeader("X-Replace", "c")
      .headers("X-Other", "one", "X-Other", "two")
      .PUT(HttpRequest.BodyPublishers.ofString("put"))
      .build();
    System.out.println(replacedHeaderRequest.headers().allValues("X-Replace"));
    System.out.println(replacedHeaderRequest.headers().allValues("X-Other"));
    System.out.println(replacedHeaderRequest.method());
    System.out.println(replacedHeaderRequest.bodyPublisher().get().contentLength());
    HttpRequest deleteRequest = HttpRequest.newBuilder(URI.create("https://example.com/delete"))
      .DELETE()
      .build();
    System.out.println(deleteRequest.method());
    System.out.println(deleteRequest.bodyPublisher().isPresent());
    java.util.LinkedHashMap<String, java.util.List<String>> headerSource =
      new java.util.LinkedHashMap<String, java.util.List<String>>();
    ArrayList<String> numberValues = new ArrayList<String>();
    numberValues.add("41");
    numberValues.add("42");
    headerSource.put("X-Number", numberValues);
    headerSource.put("X-Word", Arrays.asList("keep", "drop"));
    final ArrayList<String> headerFilterEvents = new ArrayList<String>();
    java.net.http.HttpHeaders filteredHeaders = java.net.http.HttpHeaders.of(
      headerSource,
      (name, value) -> {
        headerFilterEvents.add(name + "=" + value);
        return !value.equals("drop");
      });
    numberValues.add("99");
    System.out.println(headerFilterEvents);
    System.out.println(filteredHeaders.firstValue("x-number").get());
    System.out.println(filteredHeaders.firstValueAsLong("X-Number").getAsLong());
    System.out.println(filteredHeaders.allValues("X-Number"));
    System.out.println(filteredHeaders.allValues("x-word"));
    System.out.println(filteredHeaders.allValues("missing").isEmpty());
    System.out.println(filteredHeaders.map().containsKey("X-Number"));
    System.out.println(filteredHeaders.map().containsKey("x-number"));
    try {
      filteredHeaders.map().put("X-New", Arrays.asList("v"));
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      filteredHeaders.allValues("X-Number").add("100");
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      filteredHeaders.firstValueAsLong("X-Word");
      System.out.println(false);
    } catch (NumberFormatException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      filteredHeaders.firstValue(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      java.net.http.HttpHeaders.of(null, (name, value) -> true);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      java.net.http.HttpHeaders.of(headerSource, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    System.out.println(HttpRequest.BodyPublishers.ofString("hello").contentLength());
    System.out.println(HttpRequest.BodyPublishers.ofString("\u00e9").contentLength());
    System.out.println(HttpRequest.BodyPublishers.ofByteArray(new byte[] { 1, 2, 3, 4 }, 1, 2).contentLength());
    File bodyFile = File.createTempFile("doppio-http", ".bin");
    FileOutputStream fileOut = new FileOutputStream(bodyFile);
    fileOut.write(new byte[] { 1, 2, 3, 4, 5 });
    fileOut.close();
    try {
      System.out.println(HttpRequest.BodyPublishers.ofFile(bodyFile.toPath()).contentLength());
    } finally {
      bodyFile.delete();
    }

    Flow.Subscription subscription = new Flow.Subscription() {
      public void request(long n) {}
      public void cancel() {}
    };
    Flow.Publisher<ByteBuffer> sourcePublisher = subscriber -> {
      subscriber.onSubscribe(subscription);
      subscriber.onNext(ByteBuffer.wrap(new byte[] { 40 }));
      subscriber.onNext(ByteBuffer.wrap(new byte[] { 41, 42 }));
      subscriber.onComplete();
    };
    class RecordingByteBufferSubscriber implements Flow.Subscriber<ByteBuffer> {
      private final ArrayList<String> events;

      RecordingByteBufferSubscriber(ArrayList<String> events) {
        this.events = events;
      }

      public void onSubscribe(Flow.Subscription subscription) {
        events.add("subscribed");
        subscription.request(Long.MAX_VALUE);
      }

      public void onNext(ByteBuffer item) {
        ArrayList<Integer> bytes = new ArrayList<Integer>();
        ByteBuffer copy = item.duplicate();
        while (copy.hasRemaining()) {
          bytes.add(copy.get() & 0xff);
        }
        events.add(bytes.toString());
      }

      public void onError(Throwable throwable) {
        events.add("error:" + throwable.getClass().getName());
      }

      public void onComplete() {
        events.add("complete");
      }
    }
    HttpRequest.BodyPublisher unknownLengthPublisher =
      HttpRequest.BodyPublishers.fromPublisher(sourcePublisher);
    System.out.println(unknownLengthPublisher.contentLength());
    ArrayList<String> unknownLengthPublisherEvents = new ArrayList<String>();
    unknownLengthPublisher.subscribe(new RecordingByteBufferSubscriber(unknownLengthPublisherEvents));
    System.out.println(unknownLengthPublisherEvents);
    HttpRequest.BodyPublisher fixedLengthPublisher =
      HttpRequest.BodyPublishers.fromPublisher(sourcePublisher, 3L);
    System.out.println(fixedLengthPublisher.contentLength());
    ArrayList<String> fixedLengthPublisherEvents = new ArrayList<String>();
    fixedLengthPublisher.subscribe(new RecordingByteBufferSubscriber(fixedLengthPublisherEvents));
    System.out.println(fixedLengthPublisherEvents);
    try {
      HttpRequest.BodyPublishers.fromPublisher((Flow.Publisher<ByteBuffer>) null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.BodyPublishers.fromPublisher(sourcePublisher, -1L);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    HttpResponse.BodySubscriber<String> replaced = HttpResponse.BodySubscribers.replacing("body");
    replaced.onSubscribe(subscription);
    replaced.onComplete();
    System.out.println(replaced.getBody().toCompletableFuture().join());
    HttpResponse.BodySubscriber<Void> discarded = HttpResponse.BodySubscribers.discarding();
    discarded.onSubscribe(subscription);
    discarded.onComplete();
    System.out.println(discarded.getBody().toCompletableFuture().join() == null);
    HttpResponse.BodySubscriber<Integer> mapped = HttpResponse.BodySubscribers.mapping(
      HttpResponse.BodySubscribers.replacing("mapped"),
      value -> value.length());
    mapped.onSubscribe(subscription);
    mapped.onComplete();
    System.out.println(mapped.getBody().toCompletableFuture().join());
    System.out.println(HttpResponse.BodySubscribers.buffering(mapped, 8) == mapped);

    HttpResponse.BodySubscriber<byte[]> bytesSubscriber = HttpResponse.BodySubscribers.ofByteArray();
    bytesSubscriber.onSubscribe(subscription);
    bytesSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 1, 2 }), ByteBuffer.wrap(new byte[] { 3 })));
    bytesSubscriber.onComplete();
    System.out.println(Arrays.toString(bytesSubscriber.getBody().toCompletableFuture().join()));
    HttpResponse.BodySubscriber<String> stringSubscriber = HttpResponse.BodySubscribers.ofString(StandardCharsets.UTF_8);
    stringSubscriber.onSubscribe(subscription);
    stringSubscriber.onNext(Arrays.asList(ByteBuffer.wrap("hi".getBytes(StandardCharsets.UTF_8))));
    stringSubscriber.onComplete();
    System.out.println(stringSubscriber.getBody().toCompletableFuture().join());
    final HttpResponse.BodySubscriber<java.util.stream.Stream<String>> linesSubscriber =
      HttpResponse.BodySubscribers.ofLines(StandardCharsets.UTF_8);
    final java.util.concurrent.CompletableFuture<Object[]> linesResult =
      new java.util.concurrent.CompletableFuture<Object[]>();
    Thread linesThread = new Thread(new Runnable() {
      public void run() {
        try {
          linesResult.complete(linesSubscriber.getBody().toCompletableFuture().get(1, TimeUnit.SECONDS).toArray());
        } catch (Throwable throwable) {
          linesResult.completeExceptionally(throwable);
        }
      }
    });
    byte[] linesBytes = "alpha\nb\u00e9ta\r\ngamma\rdelta\n\n".getBytes(StandardCharsets.UTF_8);
    linesSubscriber.onSubscribe(subscription);
    linesThread.start();
    linesSubscriber.onNext(Arrays.asList(
      ByteBuffer.wrap(linesBytes, 0, 9),
      ByteBuffer.wrap(linesBytes, 9, linesBytes.length - 9)));
    Thread.sleep(50);
    linesSubscriber.onComplete();
    System.out.println(Arrays.toString(linesResult.get(2, TimeUnit.SECONDS)));
    linesThread.join();
    HttpResponse.BodySubscriber<InputStream> inputStreamSubscriber = HttpResponse.BodySubscribers.ofInputStream();
    inputStreamSubscriber.onSubscribe(subscription);
    inputStreamSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 4 }), ByteBuffer.wrap(new byte[] { 5, 6 })));
    inputStreamSubscriber.onComplete();
    System.out.println(Arrays.toString(inputStreamSubscriber.getBody().toCompletableFuture().join().readAllBytes()));
    ArrayList<String> consumerEvents = new ArrayList<String>();
    HttpResponse.BodySubscriber<Void> consumerSubscriber = HttpResponse.BodySubscribers.ofByteArrayConsumer(
      bytes -> consumerEvents.add(bytes.isPresent() ? Arrays.toString(bytes.get()) : "empty"));
    consumerSubscriber.onSubscribe(subscription);
    consumerSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 9 }), ByteBuffer.wrap(new byte[] { 10, 11 })));
    consumerSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 12 })));
    consumerSubscriber.onComplete();
    System.out.println(consumerEvents);
    System.out.println(consumerSubscriber.getBody().toCompletableFuture().join() == null);
    Path subscriberFile = Files.createTempFile("doppio-http-response", ".bin");
    try {
      HttpResponse.BodySubscriber<Path> fileSubscriber = HttpResponse.BodySubscribers.ofFile(
        subscriberFile,
        StandardOpenOption.WRITE,
        StandardOpenOption.TRUNCATE_EXISTING);
      fileSubscriber.onSubscribe(subscription);
      fileSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 15 }), ByteBuffer.wrap(new byte[] { 16, 17 })));
      fileSubscriber.onComplete();
      System.out.println(fileSubscriber.getBody().toCompletableFuture().join().equals(subscriberFile));
      System.out.println(Arrays.toString(Files.readAllBytes(subscriberFile)));
    } finally {
      Files.deleteIfExists(subscriberFile);
    }
    HttpResponse.ResponseInfo responseInfo = new HttpResponse.ResponseInfo() {
      public int statusCode() { return 200; }
      public java.net.http.HttpHeaders headers() { return java.net.http.HttpHeaders.of(java.util.Collections.emptyMap(), (a, b) -> true); }
      public HttpClient.Version version() { return HttpClient.Version.HTTP_1_1; }
    };
    final java.net.http.HttpHeaders latin1Headers = java.net.http.HttpHeaders.of(
      java.util.Collections.singletonMap(
        "Content-Type",
        java.util.Collections.singletonList("text/plain; charset=ISO-8859-1")),
      (a, b) -> true);
    HttpResponse.ResponseInfo latin1ResponseInfo = new HttpResponse.ResponseInfo() {
      public int statusCode() { return 200; }
      public java.net.http.HttpHeaders headers() { return latin1Headers; }
      public HttpClient.Version version() { return HttpClient.Version.HTTP_1_1; }
    };
    HttpResponse.BodyHandler<String> stringHandler = HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8);
    HttpResponse.BodySubscriber<String> handlerSubscriber = stringHandler.apply(responseInfo);
    handlerSubscriber.onSubscribe(subscription);
    handlerSubscriber.onNext(Arrays.asList(ByteBuffer.wrap("handler".getBytes(StandardCharsets.UTF_8))));
    handlerSubscriber.onComplete();
    System.out.println(handlerSubscriber.getBody().toCompletableFuture().join());
    HttpResponse.BodySubscriber<String> inferredStringHandlerSubscriber =
      HttpResponse.BodyHandlers.ofString().apply(latin1ResponseInfo);
    inferredStringHandlerSubscriber.onSubscribe(subscription);
    inferredStringHandlerSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 99, 97, 102, (byte) 0xe9 })));
    inferredStringHandlerSubscriber.onComplete();
    System.out.println(inferredStringHandlerSubscriber.getBody().toCompletableFuture().join());
    HttpResponse.BodyHandler<InputStream> inputStreamHandler = HttpResponse.BodyHandlers.ofInputStream();
    HttpResponse.BodySubscriber<InputStream> inputStreamHandlerSubscriber = inputStreamHandler.apply(responseInfo);
    inputStreamHandlerSubscriber.onSubscribe(subscription);
    inputStreamHandlerSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 7, 8 })));
    inputStreamHandlerSubscriber.onComplete();
    System.out.println(Arrays.toString(inputStreamHandlerSubscriber.getBody().toCompletableFuture().join().readAllBytes()));
    final HttpResponse.BodySubscriber<java.util.stream.Stream<String>> linesHandlerSubscriber =
      HttpResponse.BodyHandlers.ofLines().apply(responseInfo);
    final java.util.concurrent.CompletableFuture<Object[]> handlerLinesResult =
      new java.util.concurrent.CompletableFuture<Object[]>();
    Thread handlerLinesThread = new Thread(new Runnable() {
      public void run() {
        try {
          handlerLinesResult.complete(linesHandlerSubscriber.getBody().toCompletableFuture().get(1, TimeUnit.SECONDS).toArray());
        } catch (Throwable throwable) {
          handlerLinesResult.completeExceptionally(throwable);
        }
      }
    });
    linesHandlerSubscriber.onSubscribe(subscription);
    handlerLinesThread.start();
    linesHandlerSubscriber.onNext(Arrays.asList(ByteBuffer.wrap("handler\nlines".getBytes(StandardCharsets.UTF_8))));
    Thread.sleep(50);
    linesHandlerSubscriber.onComplete();
    System.out.println(Arrays.toString(handlerLinesResult.get(2, TimeUnit.SECONDS)));
    handlerLinesThread.join();
    final HttpResponse.BodySubscriber<java.util.stream.Stream<String>> inferredLinesHandlerSubscriber =
      HttpResponse.BodyHandlers.ofLines().apply(latin1ResponseInfo);
    final java.util.concurrent.CompletableFuture<Object[]> inferredHandlerLinesResult =
      new java.util.concurrent.CompletableFuture<Object[]>();
    Thread inferredHandlerLinesThread = new Thread(new Runnable() {
      public void run() {
        try {
          inferredHandlerLinesResult.complete(
            inferredLinesHandlerSubscriber.getBody().toCompletableFuture().get(1, TimeUnit.SECONDS).toArray());
        } catch (Throwable throwable) {
          inferredHandlerLinesResult.completeExceptionally(throwable);
        }
      }
    });
    inferredLinesHandlerSubscriber.onSubscribe(subscription);
    inferredHandlerLinesThread.start();
    inferredLinesHandlerSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(
      new byte[] { 99, 97, 102, (byte) 0xe9, 10, 110, 101, 120, 116 })));
    Thread.sleep(50);
    inferredLinesHandlerSubscriber.onComplete();
    System.out.println(Arrays.toString(inferredHandlerLinesResult.get(2, TimeUnit.SECONDS)));
    inferredHandlerLinesThread.join();
    ArrayList<String> handlerConsumerEvents = new ArrayList<String>();
    HttpResponse.BodyHandler<Void> consumerHandler = HttpResponse.BodyHandlers.ofByteArrayConsumer(
      bytes -> handlerConsumerEvents.add(bytes.isPresent() ? Arrays.toString(bytes.get()) : "empty"));
    HttpResponse.BodySubscriber<Void> consumerHandlerSubscriber = consumerHandler.apply(responseInfo);
    consumerHandlerSubscriber.onSubscribe(subscription);
    consumerHandlerSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 13, 14 })));
    consumerHandlerSubscriber.onComplete();
    System.out.println(handlerConsumerEvents);
    System.out.println(consumerHandlerSubscriber.getBody().toCompletableFuture().join() == null);
    Path handlerFile = Files.createTempFile("doppio-http-handler-response", ".bin");
    try {
      HttpResponse.BodyHandler<Path> fileHandler = HttpResponse.BodyHandlers.ofFile(
        handlerFile,
        StandardOpenOption.WRITE,
        StandardOpenOption.TRUNCATE_EXISTING);
      HttpResponse.BodySubscriber<Path> fileHandlerSubscriber = fileHandler.apply(responseInfo);
      fileHandlerSubscriber.onSubscribe(subscription);
      fileHandlerSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 18, 19 })));
      fileHandlerSubscriber.onComplete();
      System.out.println(fileHandlerSubscriber.getBody().toCompletableFuture().join().equals(handlerFile));
      System.out.println(Arrays.toString(Files.readAllBytes(handlerFile)));
    } finally {
      Files.deleteIfExists(handlerFile);
    }
    Path downloadDirectory = Files.createTempDirectory("doppio-http-download");
    Path downloadedFile = downloadDirectory.resolve("download.bin");
    Path escapedDownloadedFile = downloadDirectory.resolve("escaped\"name.bin");
    try {
      final java.net.http.HttpHeaders downloadHeaders = java.net.http.HttpHeaders.of(
        java.util.Collections.singletonMap(
          "Content-Disposition",
          java.util.Collections.singletonList("attachment; filename=\"download.bin\"")),
        (a, b) -> true);
      HttpResponse.ResponseInfo downloadResponseInfo = new HttpResponse.ResponseInfo() {
        public int statusCode() { return 200; }
        public java.net.http.HttpHeaders headers() { return downloadHeaders; }
        public HttpClient.Version version() { return HttpClient.Version.HTTP_1_1; }
      };
      HttpResponse.BodySubscriber<Path> fileDownloadSubscriber =
        HttpResponse.BodyHandlers.ofFileDownload(
          downloadDirectory,
          StandardOpenOption.CREATE,
          StandardOpenOption.WRITE,
          StandardOpenOption.TRUNCATE_EXISTING).apply(downloadResponseInfo);
      fileDownloadSubscriber.onSubscribe(subscription);
      fileDownloadSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 31, 32 })));
      fileDownloadSubscriber.onComplete();
      Path downloadedPath = fileDownloadSubscriber.getBody().toCompletableFuture().join();
      System.out.println(downloadedPath.getFileName().toString());
      System.out.println(downloadedPath.getParent().equals(downloadDirectory));
      System.out.println(Arrays.toString(Files.readAllBytes(downloadedPath)));
      final java.net.http.HttpHeaders escapedDownloadHeaders = java.net.http.HttpHeaders.of(
        java.util.Collections.singletonMap(
          "Content-Disposition",
          java.util.Collections.singletonList("attachment; filename=\"escaped\\\"name.bin\"")),
        (a, b) -> true);
      HttpResponse.ResponseInfo escapedDownloadResponseInfo = new HttpResponse.ResponseInfo() {
        public int statusCode() { return 200; }
        public java.net.http.HttpHeaders headers() { return escapedDownloadHeaders; }
        public HttpClient.Version version() { return HttpClient.Version.HTTP_1_1; }
      };
      HttpResponse.BodySubscriber<Path> escapedFileDownloadSubscriber =
        HttpResponse.BodyHandlers.ofFileDownload(
          downloadDirectory,
          StandardOpenOption.CREATE,
          StandardOpenOption.WRITE,
          StandardOpenOption.TRUNCATE_EXISTING).apply(escapedDownloadResponseInfo);
      escapedFileDownloadSubscriber.onSubscribe(subscription);
      escapedFileDownloadSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 33 })));
      escapedFileDownloadSubscriber.onComplete();
      Path escapedDownloadedPath = escapedFileDownloadSubscriber.getBody().toCompletableFuture().join();
      System.out.println(escapedDownloadedPath.getFileName().toString());
      System.out.println(Arrays.toString(Files.readAllBytes(escapedDownloadedPath)));
      final java.net.http.HttpHeaders encodedDownloadHeaders = java.net.http.HttpHeaders.of(
        java.util.Collections.singletonMap(
          "Content-Disposition",
          java.util.Collections.singletonList("attachment; filename*=UTF-8''caf%C3%A9.bin")),
        (a, b) -> true);
      HttpResponse.ResponseInfo encodedDownloadResponseInfo = new HttpResponse.ResponseInfo() {
        public int statusCode() { return 200; }
        public java.net.http.HttpHeaders headers() { return encodedDownloadHeaders; }
        public HttpClient.Version version() { return HttpClient.Version.HTTP_1_1; }
      };
      try {
        HttpResponse.BodyHandlers.ofFileDownload(
          downloadDirectory,
          StandardOpenOption.CREATE,
          StandardOpenOption.WRITE,
          StandardOpenOption.TRUNCATE_EXISTING).apply(encodedDownloadResponseInfo);
        System.out.println(false);
      } catch (java.io.UncheckedIOException e) {
        System.out.println(e.getClass().getName());
      }
    } finally {
      Files.deleteIfExists(escapedDownloadedFile);
      Files.deleteIfExists(downloadedFile);
      Files.deleteIfExists(downloadDirectory);
    }
    class RecordingByteBufferListSubscriber implements Flow.Subscriber<java.util.List<ByteBuffer>> {
      private final ArrayList<String> events;

      RecordingByteBufferListSubscriber(ArrayList<String> events) {
        this.events = events;
      }

      public void onSubscribe(Flow.Subscription subscription) {
        events.add("subscribed");
        subscription.request(Long.MAX_VALUE);
      }

      public void onNext(java.util.List<ByteBuffer> item) {
        ArrayList<Integer> bytes = new ArrayList<Integer>();
        for (int i = 0; i < item.size(); i++) {
          ByteBuffer copy = item.get(i).duplicate();
          while (copy.hasRemaining()) {
            bytes.add(copy.get() & 0xff);
          }
        }
        events.add(bytes.toString());
      }

      public void onError(Throwable throwable) {
        events.add("error:" + throwable.getClass().getName());
      }

      public void onComplete() {
        events.add("complete");
      }
    }
    class RecordingStringSubscriber implements Flow.Subscriber<String> {
      private final ArrayList<String> events;

      RecordingStringSubscriber(ArrayList<String> events) {
        this.events = events;
      }

      public void onSubscribe(Flow.Subscription subscription) {
        events.add("subscribed");
        subscription.request(Long.MAX_VALUE);
      }

      public void onNext(String item) {
        events.add(item);
      }

      public void onError(Throwable throwable) {
        events.add("error:" + throwable.getClass().getName());
      }

      public void onComplete() {
        events.add("complete");
      }
    }
    ArrayList<String> directSubscriberEvents = new ArrayList<String>();
    Flow.Subscriber<java.util.List<ByteBuffer>> directForwardTarget =
      new RecordingByteBufferListSubscriber(directSubscriberEvents);
    HttpResponse.BodySubscriber<Void> directForwardingSubscriber =
      HttpResponse.BodySubscribers.fromSubscriber(directForwardTarget);
    System.out.println(directForwardingSubscriber.getBody().toCompletableFuture().isDone());
    directForwardingSubscriber.onSubscribe(subscription);
    directForwardingSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 23, 24 })));
    directForwardingSubscriber.onComplete();
    System.out.println(directSubscriberEvents);
    System.out.println(directForwardingSubscriber.getBody().toCompletableFuture().join() == null);
    ArrayList<String> directFinisherEvents = new ArrayList<String>();
    Flow.Subscriber<java.util.List<ByteBuffer>> directFinisherTarget =
      new RecordingByteBufferListSubscriber(directFinisherEvents);
    ArrayList<String> finisherTiming = new ArrayList<String>();
    HttpResponse.BodySubscriber<Integer> directFinisherSubscriber =
      HttpResponse.BodySubscribers.fromSubscriber(directFinisherTarget, subscriber -> {
        finisherTiming.add("finish:" + directFinisherEvents.toString());
        return 29;
      });
    System.out.println(directFinisherSubscriber.getBody().toCompletableFuture().isDone());
    directFinisherSubscriber.onSubscribe(subscription);
    directFinisherSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 25 })));
    directFinisherSubscriber.onComplete();
    System.out.println(directFinisherEvents);
    System.out.println(finisherTiming);
    System.out.println(directFinisherSubscriber.getBody().toCompletableFuture().join());
    ArrayList<String> directLineEvents = new ArrayList<String>();
    HttpResponse.BodySubscriber<Void> directLineSubscriber =
      HttpResponse.BodySubscribers.fromLineSubscriber(new RecordingStringSubscriber(directLineEvents));
    directLineSubscriber.onSubscribe(subscription);
    directLineSubscriber.onNext(Arrays.asList(
      ByteBuffer.wrap("line-a\nline-b\r\n".getBytes(StandardCharsets.UTF_8)),
      ByteBuffer.wrap("line-c\r".getBytes(StandardCharsets.UTF_8))));
    directLineSubscriber.onComplete();
    System.out.println(directLineEvents);
    System.out.println(directLineSubscriber.getBody().toCompletableFuture().join() == null);
    ArrayList<String> directLineFinisherEvents = new ArrayList<String>();
    Flow.Subscriber<String> directLineFinisherTarget =
      new RecordingStringSubscriber(directLineFinisherEvents);
    ArrayList<String> lineFinisherTiming = new ArrayList<String>();
    HttpResponse.BodySubscriber<Integer> directLineFinisherSubscriber =
      HttpResponse.BodySubscribers.fromLineSubscriber(
        directLineFinisherTarget,
        subscriber -> {
          lineFinisherTiming.add("finish:" + directLineFinisherEvents.toString());
          return 31;
        },
        StandardCharsets.UTF_8,
        "\n");
    directLineFinisherSubscriber.onSubscribe(subscription);
    directLineFinisherSubscriber.onNext(Arrays.asList(ByteBuffer.wrap("uno\ndos\n".getBytes(StandardCharsets.UTF_8))));
    directLineFinisherSubscriber.onComplete();
    System.out.println(directLineFinisherEvents);
    System.out.println(lineFinisherTiming);
    System.out.println(directLineFinisherSubscriber.getBody().toCompletableFuture().join());
    ArrayList<String> directSeparatorLineEvents = new ArrayList<String>();
    HttpResponse.BodySubscriber<Void> directSeparatorLineSubscriber =
      HttpResponse.BodySubscribers.fromLineSubscriber(
        new RecordingStringSubscriber(directSeparatorLineEvents),
        subscriber -> (Void) null,
        StandardCharsets.ISO_8859_1,
        "|");
    directSeparatorLineSubscriber.onSubscribe(subscription);
    directSeparatorLineSubscriber.onNext(Arrays.asList(
      ByteBuffer.wrap(new byte[] { 99, 97, 102, (byte) 0xe9, 124, 110, 101, 120, 116, 124 }),
      ByteBuffer.wrap(new byte[] { 116, 97, 105, 108 })));
    directSeparatorLineSubscriber.onComplete();
    System.out.println(directSeparatorLineEvents);
    System.out.println(directSeparatorLineSubscriber.getBody().toCompletableFuture().join() == null);
    HttpResponse.BodySubscriber<Flow.Publisher<java.util.List<ByteBuffer>>> publisherSubscriber =
      HttpResponse.BodySubscribers.ofPublisher();
    System.out.println(publisherSubscriber.getBody().toCompletableFuture().isDone());
    publisherSubscriber.onSubscribe(subscription);
    System.out.println(publisherSubscriber.getBody().toCompletableFuture().isDone());
    Flow.Publisher<java.util.List<ByteBuffer>> directPublisher =
      publisherSubscriber.getBody().toCompletableFuture().get(1, TimeUnit.SECONDS);
    System.out.println(directPublisher == null);
    ArrayList<String> directPublisherEvents = new ArrayList<String>();
    if (directPublisher != null) {
      directPublisher.subscribe(new RecordingByteBufferListSubscriber(directPublisherEvents));
    }
    publisherSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 26 })));
    publisherSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 27, 28 })));
    publisherSubscriber.onComplete();
    System.out.println(directPublisherEvents);
    HttpResponse.BodySubscriber<Flow.Publisher<java.util.List<ByteBuffer>>> handlerPublisherSubscriber =
      HttpResponse.BodyHandlers.ofPublisher().apply(responseInfo);
    handlerPublisherSubscriber.onSubscribe(subscription);
    Flow.Publisher<java.util.List<ByteBuffer>> handlerPublisher =
      handlerPublisherSubscriber.getBody().toCompletableFuture().get(1, TimeUnit.SECONDS);
    System.out.println(handlerPublisher == null);
    ArrayList<String> handlerPublisherEvents = new ArrayList<String>();
    if (handlerPublisher != null) {
      handlerPublisher.subscribe(new RecordingByteBufferListSubscriber(handlerPublisherEvents));
    }
    handlerPublisherSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 29, 30 })));
    handlerPublisherSubscriber.onComplete();
    System.out.println(handlerPublisherEvents);
    ArrayList<String> handlerLineEvents = new ArrayList<String>();
    HttpResponse.BodySubscriber<Void> handlerLineSubscriber =
      HttpResponse.BodyHandlers.fromLineSubscriber(new RecordingStringSubscriber(handlerLineEvents)).apply(responseInfo);
    handlerLineSubscriber.onSubscribe(subscription);
    handlerLineSubscriber.onNext(Arrays.asList(ByteBuffer.wrap("handler-a\nhandler-b".getBytes(StandardCharsets.UTF_8))));
    handlerLineSubscriber.onComplete();
    System.out.println(handlerLineEvents);
    System.out.println(handlerLineSubscriber.getBody().toCompletableFuture().join() == null);
    ArrayList<String> handlerLineFinisherEvents = new ArrayList<String>();
    Flow.Subscriber<String> handlerLineFinisherTarget =
      new RecordingStringSubscriber(handlerLineFinisherEvents);
    HttpResponse.BodySubscriber<Integer> handlerLineFinisherSubscriber =
      HttpResponse.BodyHandlers.fromLineSubscriber(handlerLineFinisherTarget, subscriber -> 37, "\n").apply(responseInfo);
    handlerLineFinisherSubscriber.onSubscribe(subscription);
    handlerLineFinisherSubscriber.onNext(Arrays.asList(ByteBuffer.wrap("handler-finisher\n".getBytes(StandardCharsets.UTF_8))));
    handlerLineFinisherSubscriber.onComplete();
    System.out.println(handlerLineFinisherEvents);
    System.out.println(handlerLineFinisherSubscriber.getBody().toCompletableFuture().join());
    ArrayList<String> handlerSeparatorLineEvents = new ArrayList<String>();
    HttpResponse.BodySubscriber<Void> handlerSeparatorLineSubscriber =
      HttpResponse.BodyHandlers.fromLineSubscriber(
        new RecordingStringSubscriber(handlerSeparatorLineEvents),
        subscriber -> (Void) null,
        "\t").apply(responseInfo);
    handlerSeparatorLineSubscriber.onSubscribe(subscription);
    handlerSeparatorLineSubscriber.onNext(Arrays.asList(
      ByteBuffer.wrap("handler-tab-a\thandler-tab-b\t".getBytes(StandardCharsets.UTF_8))));
    handlerSeparatorLineSubscriber.onComplete();
    System.out.println(handlerSeparatorLineEvents);
    System.out.println(handlerSeparatorLineSubscriber.getBody().toCompletableFuture().join() == null);
    ArrayList<String> handlerSubscriberEvents = new ArrayList<String>();
    Flow.Subscriber<java.util.List<ByteBuffer>> handlerForwardTarget =
      new RecordingByteBufferListSubscriber(handlerSubscriberEvents);
    HttpResponse.BodySubscriber<Void> forwardingSubscriber =
      HttpResponse.BodyHandlers.fromSubscriber(handlerForwardTarget).apply(responseInfo);
    forwardingSubscriber.onSubscribe(subscription);
    forwardingSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 20, 21 })));
    forwardingSubscriber.onComplete();
    System.out.println(handlerSubscriberEvents);
    System.out.println(forwardingSubscriber.getBody().toCompletableFuture().join() == null);
    ArrayList<String> finisherSubscriberEvents = new ArrayList<String>();
    Flow.Subscriber<java.util.List<ByteBuffer>> finisherForwardTarget =
      new RecordingByteBufferListSubscriber(finisherSubscriberEvents);
    HttpResponse.BodySubscriber<Integer> forwardingFinisherSubscriber =
      HttpResponse.BodyHandlers.fromSubscriber(finisherForwardTarget, subscriber -> 23).apply(responseInfo);
    forwardingFinisherSubscriber.onSubscribe(subscription);
    forwardingFinisherSubscriber.onNext(Arrays.asList(ByteBuffer.wrap(new byte[] { 22 })));
    forwardingFinisherSubscriber.onComplete();
    System.out.println(finisherSubscriberEvents);
    System.out.println(forwardingFinisherSubscriber.getBody().toCompletableFuture().join());
    System.out.println(HttpResponse.BodyHandlers.buffering(stringHandler, 8) == stringHandler);

    try {
      HttpClient.newBuilder().connectTimeout(Duration.ZERO);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpClient.newBuilder().cookieHandler(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpClient.newBuilder().sslContext(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpClient.newBuilder().sslParameters(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpClient.newBuilder().executor(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpClient.newBuilder().followRedirects(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpClient.newBuilder().version(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpClient.newBuilder().proxy(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpClient.newBuilder().authenticator(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    System.out.println(HttpClient.newBuilder().priority(1) != null);
    System.out.println(HttpClient.newBuilder().priority(256) != null);
    try {
      HttpClient.newBuilder().priority(0);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpClient.newBuilder().priority(257);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder((URI) null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder().build();
      System.out.println(false);
    } catch (IllegalStateException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder().uri(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder(URI.create("https://example.com")).timeout(Duration.ZERO);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder(URI.create("https://example.com")).header(null, "v");
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder(URI.create("https://example.com")).header("Bad Header", "v");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder(URI.create("https://example.com")).header("X-Test", "bad\r\nvalue");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder(URI.create("https://example.com")).headers("X-Test", "v", "X-Odd");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder(URI.create("https://example.com")).headers((String[]) null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder(URI.create("https://example.com")).headers("X-Test", null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder(URI.create("https://example.com")).POST(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder(URI.create("https://example.com")).PUT(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    HttpRequest customMethodRequest = HttpRequest.newBuilder(URI.create("https://example.com"))
      .method("PATCH", HttpRequest.BodyPublishers.noBody())
      .build();
    System.out.println(customMethodRequest.method());
    try {
      HttpRequest.newBuilder(URI.create("https://example.com"))
        .method(null, HttpRequest.BodyPublishers.noBody());
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder(URI.create("https://example.com")).method("GET", null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder(URI.create("https://example.com"))
        .method("", HttpRequest.BodyPublishers.noBody());
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpRequest.newBuilder(URI.create("https://example.com"))
        .method("Bad Method", HttpRequest.BodyPublishers.noBody());
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      java.util.Map<String, java.util.List<String>> invalidHeaders =
        new java.util.LinkedHashMap<String, java.util.List<String>>();
      invalidHeaders.put("", java.util.Arrays.asList("v"));
      java.net.http.HttpHeaders.of(invalidHeaders, (name, value) -> true);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      java.util.Map<String, java.util.List<String>> invalidHeaders =
        new java.util.LinkedHashMap<String, java.util.List<String>>();
      invalidHeaders.put("Bad Header", java.util.Arrays.asList("v"));
      java.net.http.HttpHeaders permissiveHeaders =
        java.net.http.HttpHeaders.of(invalidHeaders, (name, value) -> true);
      System.out.println(permissiveHeaders.allValues("Bad Header"));
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      java.util.Map<String, java.util.List<String>> invalidHeaders =
        new java.util.LinkedHashMap<String, java.util.List<String>>();
      invalidHeaders.put("X-Test", java.util.Arrays.asList("bad\r\nvalue"));
      java.net.http.HttpHeaders permissiveHeaders =
        java.net.http.HttpHeaders.of(invalidHeaders, (name, value) -> true);
      System.out.println(permissiveHeaders.firstValue("X-Test").get().contains("\n"));
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    java.net.http.WebSocket.Builder webSocketBuilder =
      HttpClient.newHttpClient().newWebSocketBuilder();
    System.out.println(webSocketBuilder.header("X-WebSocket", "v") == webSocketBuilder);
    System.out.println(webSocketBuilder.subprotocols("chat", "superchat") == webSocketBuilder);
    try {
      HttpClient.newHttpClient().newWebSocketBuilder().header("Bad Header", "v");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpClient.newHttpClient().newWebSocketBuilder().header("X-WebSocket", "bad\r\nvalue");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpClient.newHttpClient().newWebSocketBuilder().subprotocols("");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpResponse.BodySubscribers.replacing("x").onSubscribe(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpResponse.BodySubscribers.buffering(mapped, 0);
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HttpResponse.BodySubscribers.mapping(null, value -> value);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }

}
