package java.util;

public interface SortedMap<K, V> extends SequencedMap<K, V> {
  Comparator<? super K> comparator();

  SortedMap<K, V> subMap(K fromKey, K toKey);

  SortedMap<K, V> headMap(K toKey);

  SortedMap<K, V> tailMap(K fromKey);

  K firstKey();

  K lastKey();

  Set<K> keySet();

  Collection<V> values();

  Set<Map.Entry<K, V>> entrySet();

  default V putFirst(K k, V v) {
    throw new UnsupportedOperationException();
  }

  default V putLast(K k, V v) {
    throw new UnsupportedOperationException();
  }

  default SortedMap<K, V> reversed() {
    final SortedMap<K, V> forward = this;
    if (forward instanceof NavigableMap) {
      return ((NavigableMap<K, V>) forward).descendingMap();
    }
    return new SortedMap<K, V>() {
      public Comparator<? super K> comparator() {
        Comparator<? super K> comparator = forward.comparator();
        if (comparator == null) {
          return Collections.reverseOrder();
        }
        return Collections.reverseOrder(comparator);
      }

      public SortedMap<K, V> subMap(K fromKey, K toKey) {
        throw new UnsupportedOperationException();
      }

      public SortedMap<K, V> headMap(K toKey) {
        throw new UnsupportedOperationException();
      }

      public SortedMap<K, V> tailMap(K fromKey) {
        throw new UnsupportedOperationException();
      }

      public K firstKey() {
        return forward.lastKey();
      }

      public K lastKey() {
        return forward.firstKey();
      }

      public int size() {
        return forward.size();
      }

      public boolean isEmpty() {
        return forward.isEmpty();
      }

      public boolean containsKey(Object key) {
        return forward.containsKey(key);
      }

      public boolean containsValue(Object value) {
        return forward.containsValue(value);
      }

      public V get(Object key) {
        return forward.get(key);
      }

      public V put(K key, V value) {
        return forward.put(key, value);
      }

      public V remove(Object key) {
        return forward.remove(key);
      }

      public void putAll(Map<? extends K, ? extends V> m) {
        forward.putAll(m);
      }

      public void clear() {
        forward.clear();
      }

      public Set<K> keySet() {
        return new AbstractSet<K>() {
          public Iterator<K> iterator() {
            final Iterator<Map.Entry<K, V>> entries = entrySet().iterator();
            return new Iterator<K>() {
              public boolean hasNext() {
                return entries.hasNext();
              }

              public K next() {
                return entries.next().getKey();
              }

              public void remove() {
                entries.remove();
              }
            };
          }

          public int size() {
            return forward.size();
          }

          public boolean contains(Object o) {
            return forward.containsKey(o);
          }

          public boolean remove(Object o) {
            if (!forward.containsKey(o)) {
              return false;
            }
            forward.remove(o);
            return true;
          }

          public void clear() {
            forward.clear();
          }
        };
      }

      public Collection<V> values() {
        return new AbstractCollection<V>() {
          public Iterator<V> iterator() {
            final Iterator<Map.Entry<K, V>> entries = entrySet().iterator();
            return new Iterator<V>() {
              public boolean hasNext() {
                return entries.hasNext();
              }

              public V next() {
                return entries.next().getValue();
              }

              public void remove() {
                entries.remove();
              }
            };
          }

          public int size() {
            return forward.size();
          }

          public boolean contains(Object o) {
            return forward.containsValue(o);
          }

          public void clear() {
            forward.clear();
          }
        };
      }

      public Set<Map.Entry<K, V>> entrySet() {
        final ArrayList<Map.Entry<K, V>> entries = new ArrayList<Map.Entry<K, V>>();
        for (Map.Entry<K, V> entry : forward.entrySet()) {
          entries.add(entry);
        }
        return new AbstractSet<Map.Entry<K, V>>() {
          public Iterator<Map.Entry<K, V>> iterator() {
            return new Iterator<Map.Entry<K, V>>() {
              private int index = entries.size();
              private Map.Entry<K, V> lastReturned;
              private boolean canRemove;

              public boolean hasNext() {
                return index > 0;
              }

              public Map.Entry<K, V> next() {
                if (!hasNext()) {
                  throw new NoSuchElementException();
                }
                lastReturned = entries.get(--index);
                canRemove = true;
                return lastReturned;
              }

              public void remove() {
                if (!canRemove) {
                  throw new IllegalStateException();
                }
                forward.remove(lastReturned.getKey());
                canRemove = false;
              }
            };
          }

          public int size() {
            return forward.size();
          }
        };
      }

      public boolean equals(Object o) {
        return forward.equals(o);
      }

      public int hashCode() {
        return forward.hashCode();
      }

      public SortedMap<K, V> reversed() {
        return forward;
      }
    };
  }
}
