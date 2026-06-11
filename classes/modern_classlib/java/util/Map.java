package java.util;

import java.util.function.BiConsumer;
import java.util.function.BiFunction;
import java.util.function.Function;

public interface Map<K, V> {
  int size();

  boolean isEmpty();

  boolean containsKey(Object key);

  boolean containsValue(Object value);

  V get(Object key);

  V put(K key, V value);

  V remove(Object key);

  void putAll(Map<? extends K, ? extends V> m);

  void clear();

  Set<K> keySet();

  Collection<V> values();

  Set<Entry<K, V>> entrySet();

  boolean equals(Object o);

  int hashCode();

  default V getOrDefault(Object key, V defaultValue) {
    V value = get(key);
    return value != null || containsKey(key) ? value : defaultValue;
  }

  default void forEach(BiConsumer<? super K, ? super V> action) {
    Objects.requireNonNull(action);
    for (Entry<K, V> entry : entrySet()) {
      K key;
      V value;
      try {
        key = entry.getKey();
        value = entry.getValue();
      } catch (IllegalStateException e) {
        throw new ConcurrentModificationException(e);
      }
      action.accept(key, value);
    }
  }

  default void replaceAll(BiFunction<? super K, ? super V, ? extends V> function) {
    Objects.requireNonNull(function);
    for (Entry<K, V> entry : entrySet()) {
      K key;
      V value;
      try {
        key = entry.getKey();
        value = entry.getValue();
      } catch (IllegalStateException e) {
        throw new ConcurrentModificationException(e);
      }
      try {
        entry.setValue(function.apply(key, value));
      } catch (IllegalStateException e) {
        throw new ConcurrentModificationException(e);
      }
    }
  }

  default V putIfAbsent(K key, V value) {
    V current = get(key);
    if (current == null) {
      current = put(key, value);
    }
    return current;
  }

  default boolean remove(Object key, Object value) {
    Object current = get(key);
    if (!Objects.equals(current, value) || current == null && !containsKey(key)) {
      return false;
    }
    remove(key);
    return true;
  }

  default boolean replace(K key, V oldValue, V newValue) {
    Object current = get(key);
    if (!Objects.equals(current, oldValue) || current == null && !containsKey(key)) {
      return false;
    }
    put(key, newValue);
    return true;
  }

  default V replace(K key, V value) {
    V current = get(key);
    if (current != null || containsKey(key)) {
      current = put(key, value);
    }
    return current;
  }

  default V computeIfAbsent(K key, Function<? super K, ? extends V> mappingFunction) {
    Objects.requireNonNull(mappingFunction);
    V value = get(key);
    if (value == null) {
      V newValue = mappingFunction.apply(key);
      if (newValue != null) {
        put(key, newValue);
        return newValue;
      }
    }
    return value;
  }

  default V computeIfPresent(K key, BiFunction<? super K, ? super V, ? extends V> remappingFunction) {
    Objects.requireNonNull(remappingFunction);
    V oldValue = get(key);
    if (oldValue != null) {
      V newValue = remappingFunction.apply(key, oldValue);
      if (newValue != null) {
        put(key, newValue);
        return newValue;
      }
      remove(key);
    }
    return null;
  }

  default V compute(K key, BiFunction<? super K, ? super V, ? extends V> remappingFunction) {
    Objects.requireNonNull(remappingFunction);
    V oldValue = get(key);
    V newValue = remappingFunction.apply(key, oldValue);
    if (newValue == null) {
      if (oldValue != null || containsKey(key)) {
        remove(key);
      }
      return null;
    }
    put(key, newValue);
    return newValue;
  }

  default V merge(K key, V value, BiFunction<? super V, ? super V, ? extends V> remappingFunction) {
    Objects.requireNonNull(remappingFunction);
    Objects.requireNonNull(value);
    V oldValue = get(key);
    V newValue = oldValue == null ? value : remappingFunction.apply(oldValue, value);
    if (newValue == null) {
      remove(key);
    } else {
      put(key, newValue);
    }
    return newValue;
  }

  static <K, V> Entry<K, V> entry(K k, V v) {
    return new KeyValueHolder<K, V>(k, v);
  }

  static <K, V> Map<K, V> of() {
    return ImmutableMap.empty();
  }

  static <K, V> Map<K, V> of(K k1, V v1) {
    return immutableMap(entry(k1, v1));
  }

  static <K, V> Map<K, V> of(K k1, V v1, K k2, V v2) {
    return immutableMap(entry(k1, v1), entry(k2, v2));
  }

  static <K, V> Map<K, V> of(K k1, V v1, K k2, V v2, K k3, V v3) {
    return immutableMap(entry(k1, v1), entry(k2, v2), entry(k3, v3));
  }

  static <K, V> Map<K, V> of(K k1, V v1, K k2, V v2, K k3, V v3, K k4, V v4) {
    return immutableMap(entry(k1, v1), entry(k2, v2), entry(k3, v3), entry(k4, v4));
  }

  static <K, V> Map<K, V> of(K k1, V v1, K k2, V v2, K k3, V v3, K k4, V v4, K k5, V v5) {
    return immutableMap(entry(k1, v1), entry(k2, v2), entry(k3, v3), entry(k4, v4), entry(k5, v5));
  }

  static <K, V> Map<K, V> of(
      K k1, V v1,
      K k2, V v2,
      K k3, V v3,
      K k4, V v4,
      K k5, V v5,
      K k6, V v6) {
    return immutableMap(entry(k1, v1), entry(k2, v2), entry(k3, v3), entry(k4, v4), entry(k5, v5),
        entry(k6, v6));
  }

  static <K, V> Map<K, V> of(
      K k1, V v1,
      K k2, V v2,
      K k3, V v3,
      K k4, V v4,
      K k5, V v5,
      K k6, V v6,
      K k7, V v7) {
    return immutableMap(entry(k1, v1), entry(k2, v2), entry(k3, v3), entry(k4, v4), entry(k5, v5),
        entry(k6, v6), entry(k7, v7));
  }

  static <K, V> Map<K, V> of(
      K k1, V v1,
      K k2, V v2,
      K k3, V v3,
      K k4, V v4,
      K k5, V v5,
      K k6, V v6,
      K k7, V v7,
      K k8, V v8) {
    return immutableMap(entry(k1, v1), entry(k2, v2), entry(k3, v3), entry(k4, v4), entry(k5, v5),
        entry(k6, v6), entry(k7, v7), entry(k8, v8));
  }

  static <K, V> Map<K, V> of(
      K k1, V v1,
      K k2, V v2,
      K k3, V v3,
      K k4, V v4,
      K k5, V v5,
      K k6, V v6,
      K k7, V v7,
      K k8, V v8,
      K k9, V v9) {
    return immutableMap(entry(k1, v1), entry(k2, v2), entry(k3, v3), entry(k4, v4), entry(k5, v5),
        entry(k6, v6), entry(k7, v7), entry(k8, v8), entry(k9, v9));
  }

  static <K, V> Map<K, V> of(
      K k1, V v1,
      K k2, V v2,
      K k3, V v3,
      K k4, V v4,
      K k5, V v5,
      K k6, V v6,
      K k7, V v7,
      K k8, V v8,
      K k9, V v9,
      K k10, V v10) {
    return immutableMap(entry(k1, v1), entry(k2, v2), entry(k3, v3), entry(k4, v4), entry(k5, v5),
        entry(k6, v6), entry(k7, v7), entry(k8, v8), entry(k9, v9), entry(k10, v10));
  }

  @SafeVarargs
  static <K, V> Map<K, V> ofEntries(Entry<? extends K, ? extends V>... entries) {
    return immutableMap(entries);
  }

  static <K, V> Map<K, V> copyOf(Map<? extends K, ? extends V> map) {
    Objects.requireNonNull(map);
    if (map instanceof ImmutableMap) {
      @SuppressWarnings("unchecked")
      Map<K, V> copy = (Map<K, V>) map;
      return copy;
    }
    if (map.isEmpty()) {
      return ImmutableMap.empty();
    }
    return new ImmutableMap<K, V>(map);
  }

  @SafeVarargs
  private static <K, V> Map<K, V> immutableMap(Entry<? extends K, ? extends V>... entries) {
    if (entries.length == 0) {
      return ImmutableMap.empty();
    }
    return new ImmutableMap<K, V>(entries);
  }

  interface Entry<K, V> {
    K getKey();

    V getValue();

    V setValue(V value);

    boolean equals(Object o);

    int hashCode();

    static <K, V> Entry<K, V> copyOf(Entry<? extends K, ? extends V> entry) {
      Objects.requireNonNull(entry);
      if (entry instanceof KeyValueHolder) {
        @SuppressWarnings("unchecked")
        Entry<K, V> holder = (Entry<K, V>) entry;
        return holder;
      }
      return Map.entry(entry.getKey(), entry.getValue());
    }

    static <K extends Comparable<? super K>, V> Comparator<Entry<K, V>> comparingByKey() {
      return new Comparator<Entry<K, V>>() {
        public int compare(Entry<K, V> first, Entry<K, V> second) {
          return first.getKey().compareTo(second.getKey());
        }
      };
    }

    static <K, V extends Comparable<? super V>> Comparator<Entry<K, V>> comparingByValue() {
      return new Comparator<Entry<K, V>>() {
        public int compare(Entry<K, V> first, Entry<K, V> second) {
          return first.getValue().compareTo(second.getValue());
        }
      };
    }

    static <K, V> Comparator<Entry<K, V>> comparingByKey(final Comparator<? super K> cmp) {
      Objects.requireNonNull(cmp);
      return new Comparator<Entry<K, V>>() {
        public int compare(Entry<K, V> first, Entry<K, V> second) {
          return cmp.compare(first.getKey(), second.getKey());
        }
      };
    }

    static <K, V> Comparator<Entry<K, V>> comparingByValue(final Comparator<? super V> cmp) {
      Objects.requireNonNull(cmp);
      return new Comparator<Entry<K, V>>() {
        public int compare(Entry<K, V> first, Entry<K, V> second) {
          return cmp.compare(first.getValue(), second.getValue());
        }
      };
    }
  }
}

final class ImmutableMap<K, V> extends AbstractMap<K, V> {
  private static final ImmutableMap<?, ?> EMPTY = new ImmutableMap<Object, Object>();

  private final Map<K, V> entries;

  @SuppressWarnings("unchecked")
  static <K, V> ImmutableMap<K, V> empty() {
    return (ImmutableMap<K, V>) EMPTY;
  }

  @SafeVarargs
  ImmutableMap(Map.Entry<? extends K, ? extends V>... entries) {
    HashMap<K, V> map = new HashMap<K, V>();
    for (Map.Entry<? extends K, ? extends V> entry : entries) {
      Objects.requireNonNull(entry);
      K key = Objects.requireNonNull(entry.getKey());
      V value = Objects.requireNonNull(entry.getValue());
      if (map.containsKey(key)) {
        throw new IllegalArgumentException("duplicate key: " + key);
      }
      map.put(key, value);
    }
    this.entries = Collections.unmodifiableMap(map);
  }

  ImmutableMap(Map<? extends K, ? extends V> source) {
    HashMap<K, V> map = new HashMap<K, V>();
    for (Map.Entry<? extends K, ? extends V> entry : source.entrySet()) {
      map.put(Objects.requireNonNull(entry.getKey()), Objects.requireNonNull(entry.getValue()));
    }
    this.entries = Collections.unmodifiableMap(map);
  }

  public Set<Map.Entry<K, V>> entrySet() {
    final Set<Map.Entry<K, V>> entrySet = entries.entrySet();
    return new AbstractSet<Map.Entry<K, V>>() {
      public Iterator<Map.Entry<K, V>> iterator() {
        return entrySet.iterator();
      }

      public int size() {
        return entrySet.size();
      }

      public boolean contains(Object o) {
        if (entrySet.isEmpty()) {
          return false;
        }
        Objects.requireNonNull(o);
        return entrySet.contains(o);
      }
    };
  }

  public boolean containsKey(Object key) {
    Objects.requireNonNull(key);
    return entries.containsKey(key);
  }

  public boolean containsValue(Object value) {
    Objects.requireNonNull(value);
    return entries.containsValue(value);
  }

  public V get(Object key) {
    Objects.requireNonNull(key);
    return entries.get(key);
  }
}

final class KeyValueHolder<K, V> implements Map.Entry<K, V> {
  private final K key;
  private final V value;

  KeyValueHolder(K key, V value) {
    this.key = Objects.requireNonNull(key);
    this.value = Objects.requireNonNull(value);
  }

  public K getKey() {
    return key;
  }

  public V getValue() {
    return value;
  }

  public V setValue(V value) {
    throw new UnsupportedOperationException();
  }

  public boolean equals(Object other) {
    if (!(other instanceof Map.Entry)) {
      return false;
    }
    Map.Entry<?, ?> entry = (Map.Entry<?, ?>) other;
    return Objects.equals(key, entry.getKey()) && Objects.equals(value, entry.getValue());
  }

  public int hashCode() {
    return Objects.hashCode(key) ^ Objects.hashCode(value);
  }

  public String toString() {
    return key + "=" + value;
  }
}
