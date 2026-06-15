package java.util;

public interface SequencedMap<K, V> extends Map<K, V> {
  SequencedMap<K, V> reversed();

  default Map.Entry<K, V> firstEntry() {
    Iterator<Map.Entry<K, V>> iterator = entrySet().iterator();
    return iterator.hasNext() ? Map.Entry.copyOf(iterator.next()) : null;
  }

  default Map.Entry<K, V> lastEntry() {
    Iterator<Map.Entry<K, V>> iterator = reversed().entrySet().iterator();
    return iterator.hasNext() ? Map.Entry.copyOf(iterator.next()) : null;
  }

  default Map.Entry<K, V> pollFirstEntry() {
    Iterator<Map.Entry<K, V>> iterator = entrySet().iterator();
    if (!iterator.hasNext()) {
      return null;
    }
    Map.Entry<K, V> entry = Map.Entry.copyOf(iterator.next());
    iterator.remove();
    return entry;
  }

  default Map.Entry<K, V> pollLastEntry() {
    Iterator<Map.Entry<K, V>> iterator = reversed().entrySet().iterator();
    if (!iterator.hasNext()) {
      return null;
    }
    Map.Entry<K, V> entry = Map.Entry.copyOf(iterator.next());
    iterator.remove();
    return entry;
  }

  default V putFirst(K k, V v) {
    throw new UnsupportedOperationException();
  }

  default V putLast(K k, V v) {
    throw new UnsupportedOperationException();
  }

  default SequencedSet<K> sequencedKeySet() {
    return new SequencedMapKeySet<K, V>(this);
  }

  default SequencedCollection<V> sequencedValues() {
    return new SequencedMapValues<K, V>(this);
  }

  default SequencedSet<Map.Entry<K, V>> sequencedEntrySet() {
    return new SequencedMapEntrySet<K, V>(this);
  }
}

final class SequencedMapKeySet<K, V> extends AbstractSet<K> implements SequencedSet<K> {
  private final SequencedMap<K, V> map;

  SequencedMapKeySet(SequencedMap<K, V> map) {
    this.map = map;
  }

  public Iterator<K> iterator() {
    return map.keySet().iterator();
  }

  public int size() {
    return map.size();
  }

  public boolean contains(Object o) {
    return map.containsKey(o);
  }

  public boolean remove(Object o) {
    if (!map.containsKey(o)) {
      return false;
    }
    map.remove(o);
    return true;
  }

  public void clear() {
    map.clear();
  }

  public boolean add(K k) {
    throw new UnsupportedOperationException();
  }

  public boolean addAll(Collection<? extends K> c) {
    throw new UnsupportedOperationException();
  }

  public SequencedSet<K> reversed() {
    return map.reversed().sequencedKeySet();
  }
}

final class SequencedMapValues<K, V> extends AbstractCollection<V> implements SequencedCollection<V> {
  private final SequencedMap<K, V> map;

  SequencedMapValues(SequencedMap<K, V> map) {
    this.map = map;
  }

  public Iterator<V> iterator() {
    return map.values().iterator();
  }

  public int size() {
    return map.size();
  }

  public boolean contains(Object o) {
    return map.containsValue(o);
  }

  public void clear() {
    map.clear();
  }

  public boolean add(V v) {
    throw new UnsupportedOperationException();
  }

  public boolean addAll(Collection<? extends V> c) {
    throw new UnsupportedOperationException();
  }

  public SequencedCollection<V> reversed() {
    return map.reversed().sequencedValues();
  }
}

final class SequencedMapEntrySet<K, V> extends AbstractSet<Map.Entry<K, V>> implements SequencedSet<Map.Entry<K, V>> {
  private final SequencedMap<K, V> map;

  SequencedMapEntrySet(SequencedMap<K, V> map) {
    this.map = map;
  }

  public Iterator<Map.Entry<K, V>> iterator() {
    return map.entrySet().iterator();
  }

  public int size() {
    return map.size();
  }

  public boolean contains(Object o) {
    return map.entrySet().contains(o);
  }

  public boolean remove(Object o) {
    return map.entrySet().remove(o);
  }

  public void clear() {
    map.clear();
  }

  public boolean add(Map.Entry<K, V> entry) {
    throw new UnsupportedOperationException();
  }

  public boolean addAll(Collection<? extends Map.Entry<K, V>> c) {
    throw new UnsupportedOperationException();
  }

  public SequencedSet<Map.Entry<K, V>> reversed() {
    return map.reversed().sequencedEntrySet();
  }
}
