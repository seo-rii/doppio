package java.net.http;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.TreeMap;
import java.util.function.BiPredicate;

public final class HttpHeaders {
  private final Map<String, List<String>> headers;

  private HttpHeaders(Map<String, List<String>> headers) {
    this.headers = headers;
  }

  public Optional<String> firstValue(String name) {
    List<String> values = allValues(name);
    return values.isEmpty() ? Optional.<String>empty() : Optional.of(values.get(0));
  }

  public OptionalLong firstValueAsLong(String name) {
    Optional<String> value = firstValue(name);
    return value.isPresent() ? OptionalLong.of(Long.parseLong(value.get())) : OptionalLong.empty();
  }

  public List<String> allValues(String name) {
    Objects.requireNonNull(name);
    String key = findKey(headers, name);
    return key == null ? Collections.<String>emptyList() : headers.get(key);
  }

  public Map<String, List<String>> map() {
    return headers;
  }

  public final boolean equals(Object obj) {
    return obj instanceof HttpHeaders && headers.equals(((HttpHeaders) obj).headers);
  }

  public final int hashCode() {
    return headers.hashCode();
  }

  public String toString() {
    return headers.toString();
  }

  public static HttpHeaders of(
    Map<String, List<String>> headerMap,
    BiPredicate<String, String> filter) {
    Objects.requireNonNull(headerMap);
    Objects.requireNonNull(filter);
    Map<String, List<String>> copy = new LinkedHashMap<String, List<String>>();
    for (Map.Entry<String, List<String>> entry : headerMap.entrySet()) {
      String name = Objects.requireNonNull(entry.getKey());
      if (name.length() == 0) {
        throw new IllegalArgumentException();
      }
      List<String> values = Objects.requireNonNull(entry.getValue());
      for (int i = 0; i < values.size(); i++) {
        String value = Objects.requireNonNull(values.get(i));
        if (filter.test(name, value)) {
          add(copy, name, value);
        }
      }
    }
    return new HttpHeaders(freeze(copy));
  }

  static HttpHeaders fromBuilderMap(Map<String, List<String>> input) {
    return new HttpHeaders(freeze(input));
  }

  static void add(Map<String, List<String>> headers, String name, String value) {
    String key = findKey(headers, name);
    if (key == null) {
      key = name;
    }
    List<String> values = headers.get(key);
    if (values == null) {
      values = new ArrayList<String>();
      headers.put(key, values);
    }
    values.add(value);
  }

  static void set(Map<String, List<String>> headers, String name, String value) {
    String key = findKey(headers, name);
    if (key == null) {
      key = name;
    }
    List<String> values = new ArrayList<String>();
    values.add(value);
    headers.put(key, values);
  }

  private static Map<String, List<String>> freeze(Map<String, List<String>> input) {
    Map<String, List<String>> copy = new TreeMap<String, List<String>>(String.CASE_INSENSITIVE_ORDER);
    for (Map.Entry<String, List<String>> entry : input.entrySet()) {
      copy.put(entry.getKey(), Collections.unmodifiableList(new ArrayList<String>(entry.getValue())));
    }
    return Collections.unmodifiableMap(copy);
  }

  private static String normalize(String name) {
    return name.toLowerCase(Locale.US);
  }

  private static String findKey(Map<String, List<String>> headers, String name) {
    String normalized = normalize(name);
    for (String key : headers.keySet()) {
      if (normalize(key).equals(normalized)) {
        return key;
      }
    }
    return null;
  }
}
