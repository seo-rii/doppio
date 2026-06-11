package classes.modern_test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.IntSummaryStatistics;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ConcurrentSkipListMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Java9Collectors {
  public static void main(String[] args) {
    System.out.println(Stream.of("a", "bb", "ccc")
        .collect(Collectors.mapping(String::length, Collectors.toList())));
    System.out.println(Stream.of("a", "bb", "ccc")
        .collect(Collectors.filtering(value -> value.length() > 1, Collectors.joining("|"))));
    System.out.println(Stream.of("ab", "", "cd")
        .collect(Collectors.flatMapping(
            value -> value.isEmpty() ? null : Arrays.stream(value.split("")),
            Collectors.joining("-"))));

    AtomicInteger closed = new AtomicInteger();
    String flatClosed = Stream.of("ab", "cd")
        .collect(Collectors.flatMapping(
            value -> Arrays.stream(value.split("")).onClose(() -> closed.incrementAndGet()),
            Collectors.joining("")));
    System.out.println(flatClosed + ":" + closed.get());

    String collectedAndThen = Stream.of("a", "bb")
        .collect(Collectors.collectingAndThen(
            Collectors.<String>toList(),
            (List<String> list) -> {
              boolean added = list.add("x");
              return list.size() + ":" + added;
            }));
    System.out.println(collectedAndThen);

    Collector<String, ?, List<Integer>> mapped =
        Collectors.mapping(String::length, Collectors.toList());
    System.out.println(mapped.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));
    Collector<String, ?, Set<String>> filteredSet =
        Collectors.filtering(value -> true, Collectors.toSet());
    System.out.println(filteredSet.characteristics().contains(Collector.Characteristics.UNORDERED));
    Collector<String, ?, String> afterCollector =
        Collectors.collectingAndThen(Collectors.toSet(), set -> String.valueOf(set.size()));
    System.out.println(afterCollector.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));
    System.out.println(afterCollector.characteristics().contains(Collector.Characteristics.UNORDERED));

    Collector<String, ?, List<Integer>> nullMapper = Collectors.mapping(null, Collectors.toList());
    System.out.println("mapping-created");
    try {
      Stream.of("a").collect(nullMapper);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, String> nullPredicate = Collectors.filtering(null, Collectors.joining());
    System.out.println("filtering-created");
    try {
      Stream.of("a").collect(nullPredicate);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, List<String>> nullFlatMapper = Collectors.flatMapping(null, Collectors.toList());
    System.out.println("flat-created");
    try {
      Stream.of("a").collect(nullFlatMapper);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      Collectors.mapping(String::length, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Collectors.filtering(value -> true, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Collectors.flatMapping(value -> Stream.of(value), null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Collectors.collectingAndThen(null, value -> value);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Collectors.collectingAndThen(Collectors.toList(), null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    System.out.println(Stream.of("a", "bb", "ccc").collect(Collectors.counting()));
    System.out.println(Stream.<String>empty().collect(Collectors.counting()));
    System.out.println(Collectors.counting().characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));

    System.out.println(Stream.of("a", "bb", "ccc").collect(Collectors.summingInt(String::length)));
    System.out.println(Stream.<String>empty().collect(Collectors.summingInt(String::length)));
    System.out.println(Stream.of(Integer.valueOf(Integer.MAX_VALUE), Integer.valueOf(1))
        .collect(Collectors.summingInt(Integer::intValue)));
    System.out.println(Stream.of("a", "bb", "ccc")
        .collect(Collectors.summingLong(value -> (long) value.length() * 10000000000L)));
    System.out.println(Stream.<String>empty().collect(Collectors.summingLong(String::length)));
    System.out.println(Stream.of("a", "bb", "ccc")
        .collect(Collectors.summingDouble(value -> value.length() + 0.5d)));
    System.out.println(Stream.<String>empty().collect(Collectors.summingDouble(String::length)));
    System.out.println(Collectors.summingInt(String::length)
        .characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));

    System.out.println(Stream.of("a", "bb", "ccc").collect(Collectors.averagingInt(String::length)));
    System.out.println(Stream.<String>empty().collect(Collectors.averagingInt(String::length)));
    System.out.println(Stream.of("a", "bb", "ccc")
        .collect(Collectors.averagingLong(value -> (long) value.length() * 10L)));
    System.out.println(Stream.<String>empty().collect(Collectors.averagingLong(String::length)));
    System.out.println(Stream.of("a", "bb", "ccc")
        .collect(Collectors.averagingDouble(value -> value.length() + 0.5d)));
    System.out.println(Stream.<String>empty().collect(Collectors.averagingDouble(String::length)));
    System.out.println(Collectors.averagingDouble(String::length)
        .characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));

    System.out.println(Stream.of("a", "bb", "ccc").collect(Collectors.summarizingInt(String::length)));
    System.out.println(Stream.<String>empty().collect(Collectors.summarizingInt(String::length)));
    System.out.println(Stream.of("a", "bb", "ccc")
        .collect(Collectors.summarizingLong(value -> (long) value.length() * 10L)));
    System.out.println(Stream.<String>empty().collect(Collectors.summarizingLong(String::length)));
    System.out.println(Stream.of("a", "bb", "ccc")
        .collect(Collectors.summarizingDouble(value -> value.length() + 0.5d)));
    System.out.println(Stream.<String>empty().collect(Collectors.summarizingDouble(String::length)));
    System.out.println(Collectors.summarizingInt(String::length)
        .characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));

    System.out.println(Stream.of("bb", "a", "ccc")
        .collect(Collectors.minBy(Comparator.comparingInt(String::length))));
    System.out.println(Stream.<String>empty().collect(Collectors.minBy(Comparator.naturalOrder())));
    System.out.println(Stream.of("bb", "a", "ccc")
        .collect(Collectors.maxBy(Comparator.comparingInt(String::length))));
    System.out.println(Stream.<String>empty().collect(Collectors.maxBy(Comparator.naturalOrder())));
    System.out.println(Collectors.minBy(Comparator.naturalOrder())
        .characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));

    System.out.println(Stream.of("a", "b", "c").collect(Collectors.reducing("", (left, right) -> left + right)));
    System.out.println(Stream.<String>empty().collect(Collectors.reducing("empty", (left, right) -> left + right)));
    System.out.println(Stream.of("a", "b", "c").collect(Collectors.reducing((left, right) -> left + right)));
    System.out.println(Stream.<String>empty().collect(Collectors.reducing((left, right) -> left + right)));
    System.out.println(Stream.of("a", "bb").collect(Collectors.reducing(10, String::length, Integer::sum)));
    System.out.println(Stream.<String>empty().collect(Collectors.reducing(10, String::length, Integer::sum)));
    System.out.println(Collectors.reducing("", (left, right) -> left + right)
        .characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));

    Map<Integer, Long> groupedCounting = Stream.of("a", "bb", "c")
        .collect(Collectors.groupingBy(String::length, Collectors.counting()));
    System.out.println(groupedCounting.get(Integer.valueOf(1)));
    System.out.println(groupedCounting.get(Integer.valueOf(2)));
    Map<Integer, Integer> groupedSumming = Stream.of("a", "bb", "c")
        .collect(Collectors.groupingBy(String::length, Collectors.summingInt(String::length)));
    System.out.println(groupedSumming.get(Integer.valueOf(1)));
    System.out.println(groupedSumming.get(Integer.valueOf(2)));
    Map<Boolean, String> partitionReducing = Stream.of("a", "bb", "c")
        .collect(Collectors.partitioningBy(
            value -> value.length() > 1,
            Collectors.reducing("", (left, right) -> left + right)));
    System.out.println(partitionReducing.get(Boolean.FALSE));
    System.out.println(partitionReducing.get(Boolean.TRUE));
    Map<Boolean, Double> partitionAveraging = Stream.of("a", "bb", "ccc")
        .collect(Collectors.partitioningBy(value -> value.length() > 1, Collectors.averagingInt(String::length)));
    System.out.println(partitionAveraging.get(Boolean.FALSE));
    System.out.println(partitionAveraging.get(Boolean.TRUE));

    try {
      Collectors.minBy(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Collectors.maxBy(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, String> reducingNullOperator = Collectors.reducing("", null);
    System.out.println(Stream.<String>empty().collect(reducingNullOperator));
    try {
      Stream.of("a").collect(reducingNullOperator);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, Optional<String>> reducingOptionalNullOperator = Collectors.reducing(null);
    System.out.println(Stream.of("a").collect(reducingOptionalNullOperator));
    try {
      Stream.of("a", "b").collect(reducingOptionalNullOperator);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, Integer> reducingNullMapper = Collectors.reducing(10, null, Integer::sum);
    System.out.println(Stream.<String>empty().collect(reducingNullMapper));
    try {
      Stream.of("a").collect(reducingNullMapper);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, Integer> reducingMappedNullOperator = Collectors.reducing(10, String::length, null);
    System.out.println(Stream.<String>empty().collect(reducingMappedNullOperator));
    try {
      Stream.of("a").collect(reducingMappedNullOperator);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, Integer> summingNullMapper = Collectors.summingInt(null);
    System.out.println(Stream.<String>empty().collect(summingNullMapper));
    try {
      Stream.of("a").collect(summingNullMapper);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, Double> averagingNullMapper = Collectors.averagingDouble(null);
    System.out.println(Stream.<String>empty().collect(averagingNullMapper));
    try {
      Stream.of("a").collect(averagingNullMapper);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, IntSummaryStatistics> summarizingNullMapper = Collectors.summarizingInt(null);
    System.out.println(Stream.<String>empty().collect(summarizingNullMapper));
    try {
      Stream.of("a").collect(summarizingNullMapper);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Map<Character, String> linkedToMap = Stream.of("b", "a")
        .collect(Collectors.toMap(
            value -> Character.valueOf(value.charAt(0)),
            value -> value,
            (left, right) -> left + right,
            LinkedHashMap::new));
    System.out.println(linkedToMap.getClass().getName());
    System.out.println(linkedToMap.keySet());

    Map<Character, Integer> mergedToMap = Stream.of("a", "aa")
        .collect(Collectors.toMap(
            value -> Character.valueOf(value.charAt(0)),
            String::length,
            Integer::sum,
            LinkedHashMap::new));
    System.out.println(mergedToMap);

    Map<Character, Integer> removedToMap = Stream.of("a", "aa")
        .collect(Collectors.toMap(
            value -> Character.valueOf(value.charAt(0)),
            String::length,
            (left, right) -> null,
            LinkedHashMap::new));
    System.out.println(removedToMap.isEmpty());

    Map<Object, Integer> nullKeyToMap = Stream.of("a")
        .collect(Collectors.toMap(value -> null, String::length));
    System.out.println(nullKeyToMap);

    try {
      Stream.of("a", "aa").collect(Collectors.toMap(value -> Character.valueOf(value.charAt(0)), String::length));
      System.out.println(false);
    } catch (IllegalStateException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of("a").collect(Collectors.toMap(value -> value, value -> null));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of("a").collect(Collectors.toMap(value -> value, value -> null, (left, right) -> left));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of("a").collect(Collectors.toMap(value -> value, value -> null, (left, right) -> left, LinkedHashMap::new));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, Map<Object, String>> toMapNullKeyMapper = Collectors.toMap(null, value -> value);
    System.out.println(Stream.<String>empty().collect(toMapNullKeyMapper));
    try {
      Stream.of("a").collect(toMapNullKeyMapper);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, Map<String, String>> toMapNullValueMapper = Collectors.toMap(value -> value, null);
    System.out.println(Stream.<String>empty().collect(toMapNullValueMapper));
    try {
      Stream.of("a").collect(toMapNullValueMapper);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, Map<String, String>> toMapNullMerge =
        Collectors.toMap(value -> value.substring(0, 1), value -> value, null);
    System.out.println(Stream.<String>empty().collect(toMapNullMerge));
    try {
      Stream.of("a").collect(toMapNullMerge);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, Map<String, String>> toMapNullSupplier =
        Collectors.toMap(value -> value, value -> value, (left, right) -> left, null);
    try {
      Stream.<String>empty().collect(toMapNullSupplier);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, ConcurrentMap<Character, Integer>> concurrentCollector =
        Collectors.toConcurrentMap(value -> Character.valueOf(value.charAt(0)), String::length, Integer::sum);
    System.out.println(concurrentCollector.characteristics().contains(Collector.Characteristics.CONCURRENT));
    System.out.println(concurrentCollector.characteristics().contains(Collector.Characteristics.UNORDERED));
    System.out.println(concurrentCollector.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));

    ConcurrentMap<Character, Integer> concurrentMerged = Stream.of("a", "aa")
        .collect(Collectors.toConcurrentMap(value -> Character.valueOf(value.charAt(0)), String::length, Integer::sum));
    System.out.println(concurrentMerged.getClass().getName());
    System.out.println(concurrentMerged.get(Character.valueOf('a')));

    ConcurrentMap<Character, Integer> concurrentRemoved = Stream.of("a", "aa")
        .collect(Collectors.toConcurrentMap(
            value -> Character.valueOf(value.charAt(0)),
            String::length,
            (left, right) -> null));
    System.out.println(concurrentRemoved.isEmpty());

    ConcurrentMap<Character, Integer> concurrentSorted = Stream.of("b", "a")
        .collect(Collectors.toConcurrentMap(
            value -> Character.valueOf(value.charAt(0)),
            String::length,
            Integer::sum,
            ConcurrentSkipListMap::new));
    System.out.println(concurrentSorted.getClass().getName());
    System.out.println(concurrentSorted.keySet());

    try {
      Stream.of("a", "aa").collect(Collectors.toConcurrentMap(
          value -> Character.valueOf(value.charAt(0)), String::length));
      System.out.println(false);
    } catch (IllegalStateException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of("a").collect(Collectors.toConcurrentMap(value -> null, String::length));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of("a").collect(Collectors.toConcurrentMap(value -> value, value -> null));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, ConcurrentMap<Object, String>> concurrentNullKeyMapper =
        Collectors.toConcurrentMap(null, value -> value);
    System.out.println(Stream.<String>empty().collect(concurrentNullKeyMapper));
    try {
      Stream.of("a").collect(concurrentNullKeyMapper);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, ConcurrentMap<String, String>> concurrentNullValueMapper =
        Collectors.toConcurrentMap(value -> value, null);
    System.out.println(Stream.<String>empty().collect(concurrentNullValueMapper));
    try {
      Stream.of("a").collect(concurrentNullValueMapper);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, ConcurrentMap<String, String>> concurrentNullMerge =
        Collectors.toConcurrentMap(value -> value.substring(0, 1), value -> value, null);
    System.out.println(Stream.<String>empty().collect(concurrentNullMerge));
    try {
      Stream.of("a").collect(concurrentNullMerge);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, ConcurrentMap<String, String>> concurrentNullSupplier =
        Collectors.toConcurrentMap(value -> value, value -> value, (left, right) -> left, null);
    try {
      Stream.<String>empty().collect(concurrentNullSupplier);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    ConcurrentMap<Integer, List<String>> concurrentGrouped = Stream.of("a", "bb", "c", "dd")
        .collect(Collectors.groupingByConcurrent(String::length));
    System.out.println(concurrentGrouped.getClass().getName());
    System.out.println(concurrentGrouped.get(Integer.valueOf(1)));
    System.out.println(concurrentGrouped.get(Integer.valueOf(2)));
    concurrentGrouped.put(Integer.valueOf(3), Arrays.asList("eee"));
    System.out.println(concurrentGrouped.get(Integer.valueOf(3)));

    ConcurrentMap<Integer, String> concurrentGroupedJoining = Stream.of("a", "bb", "cc", "ddd")
        .collect(Collectors.groupingByConcurrent(String::length, Collectors.joining(",")));
    System.out.println(concurrentGroupedJoining.get(Integer.valueOf(1)));
    System.out.println(concurrentGroupedJoining.get(Integer.valueOf(2)));
    System.out.println(concurrentGroupedJoining.get(Integer.valueOf(3)));

    ConcurrentMap<Character, List<String>> concurrentGroupedSorted = Stream.of("bx", "ay", "az")
        .collect(Collectors.groupingByConcurrent(
            value -> Character.valueOf(value.charAt(0)),
            ConcurrentSkipListMap::new,
            Collectors.mapping(value -> value.substring(1), Collectors.toList())));
    System.out.println(concurrentGroupedSorted.getClass().getName());
    System.out.println(concurrentGroupedSorted.keySet());
    System.out.println(concurrentGroupedSorted.get(Character.valueOf('a')));
    System.out.println(concurrentGroupedSorted.get(Character.valueOf('b')));

    Collector<String, ?, ConcurrentMap<Integer, List<String>>> concurrentGroupedCollector =
        Collectors.groupingByConcurrent(String::length);
    System.out.println(concurrentGroupedCollector.characteristics().contains(Collector.Characteristics.CONCURRENT));
    System.out.println(concurrentGroupedCollector.characteristics().contains(Collector.Characteristics.UNORDERED));
    System.out.println(concurrentGroupedCollector.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));
    Collector<String, ?, ConcurrentMap<Integer, String>> concurrentGroupedJoiningCollector =
        Collectors.groupingByConcurrent(String::length, Collectors.joining());
    System.out.println(concurrentGroupedJoiningCollector.characteristics().contains(Collector.Characteristics.CONCURRENT));
    System.out.println(concurrentGroupedJoiningCollector.characteristics().contains(Collector.Characteristics.UNORDERED));
    System.out.println(concurrentGroupedJoiningCollector.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));

    try {
      Stream.of("a").collect(Collectors.groupingByConcurrent(value -> null));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Collectors.groupingByConcurrent(value -> value, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, ConcurrentMap<Object, List<String>>> concurrentGroupingNullClassifier =
        Collectors.groupingByConcurrent(null);
    System.out.println(Stream.<String>empty().collect(concurrentGroupingNullClassifier));
    try {
      Stream.of("a").collect(concurrentGroupingNullClassifier);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Collector<String, ?, ConcurrentMap<String, List<String>>> concurrentGroupingNullFactory =
        Collectors.groupingByConcurrent(value -> value, null, Collectors.toList());
    try {
      Stream.<String>empty().collect(concurrentGroupingNullFactory);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Map<Integer, List<String>> grouped = Stream.of("a", "bb", "c", "dd")
        .collect(Collectors.groupingBy(String::length));
    System.out.println(grouped.get(Integer.valueOf(1)));
    System.out.println(grouped.get(Integer.valueOf(2)));
    grouped.put(Integer.valueOf(3), Arrays.asList("eee"));
    System.out.println(grouped.get(Integer.valueOf(3)));

    Map<Integer, String> groupedFiltering = Stream.of("a", "bb", "cc", "ddd")
        .collect(Collectors.groupingBy(
            String::length,
            Collectors.filtering(value -> value.indexOf('b') >= 0, Collectors.joining(","))));
    System.out.println(groupedFiltering.get(Integer.valueOf(1)));
    System.out.println(groupedFiltering.get(Integer.valueOf(2)));
    System.out.println(groupedFiltering.get(Integer.valueOf(3)));

    Map<Character, List<String>> linkedFlat = Stream.of("ax", "ay", "bz")
        .collect(Collectors.groupingBy(
            value -> Character.valueOf(value.charAt(0)),
            LinkedHashMap::new,
            Collectors.flatMapping(value -> Stream.of(value.substring(1)), Collectors.toList())));
    System.out.println(linkedFlat.getClass().getName());
    System.out.println(linkedFlat.keySet());
    System.out.println(linkedFlat.get(Character.valueOf('a')));
    System.out.println(linkedFlat.get(Character.valueOf('b')));

    Collector<String, ?, Map<Integer, Set<String>>> groupedSet =
        Collectors.groupingBy(String::length, Collectors.toSet());
    System.out.println(groupedSet.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));
    System.out.println(groupedSet.characteristics().contains(Collector.Characteristics.UNORDERED));
    Collector<String, ?, Map<Integer, String>> groupedJoining =
        Collectors.groupingBy(String::length, Collectors.joining());
    System.out.println(groupedJoining.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));

    Map<Boolean, List<String>> partitioned = Stream.of("a", "bb", "ccc")
        .collect(Collectors.partitioningBy(value -> value.length() > 1));
    System.out.println(partitioned.size());
    System.out.println(partitioned.containsKey(Boolean.FALSE));
    System.out.println(partitioned.containsKey(Boolean.TRUE));
    System.out.println(partitioned.get(Boolean.FALSE));
    System.out.println(partitioned.get(Boolean.TRUE));
    try {
      partitioned.put(Boolean.FALSE, new ArrayList<String>());
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
    partitioned.get(Boolean.TRUE).add("dddd");
    System.out.println(partitioned.get(Boolean.TRUE));

    Map<Boolean, String> partitionedJoining = Stream.of("a", "bb", "c")
        .collect(Collectors.partitioningBy(value -> value.length() > 1, Collectors.joining("|")));
    System.out.println(partitionedJoining.get(Boolean.FALSE));
    System.out.println(partitionedJoining.get(Boolean.TRUE));
    try {
      partitionedJoining.put(Boolean.FALSE, "x");
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
    Collector<String, ?, Map<Boolean, List<String>>> partitionCollector =
        Collectors.partitioningBy(value -> true);
    System.out.println(partitionCollector.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));
    Collector<String, ?, Map<Boolean, String>> partitionJoiningCollector =
        Collectors.partitioningBy(value -> true, Collectors.joining());
    System.out.println(partitionJoiningCollector.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));

    try {
      Stream.of("a").collect(Collectors.groupingBy(value -> null));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Collectors.groupingBy(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Collectors.groupingBy(value -> value, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Collectors.groupingBy(value -> value, null, Collectors.toList());
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Collectors.partitioningBy(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Collectors.partitioningBy(value -> true, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
