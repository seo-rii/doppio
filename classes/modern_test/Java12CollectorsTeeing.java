package classes.modern_test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Java12CollectorsTeeing {
  public static void main(String[] args) {
    String result = Stream.of("a", "bb", "c")
        .collect(Collectors.teeing(
            Collectors.toList(),
            Collectors.joining("|"),
            (list, joined) -> list.size() + ":" + joined));
    System.out.println(result);

    String unmodifiable = Stream.of("a", "bb")
        .collect(Collectors.teeing(
            Collectors.toUnmodifiableList(),
            Collectors.toUnmodifiableSet(),
            (list, set) -> {
              String listResult;
              try {
                list.add("x");
                listResult = "mutable";
              } catch (UnsupportedOperationException e) {
                listResult = e.getClass().getName();
              }
              String setResult;
              try {
                set.add("x");
                setResult = "mutable";
              } catch (UnsupportedOperationException e) {
                setResult = e.getClass().getName();
              }
              return list.size() + ":" + set.size() + ":" + listResult + ":" + setResult;
            }));
    System.out.println(unmodifiable);

    Collector<String, ?, String> tee = Collectors.teeing(
        Collectors.toSet(),
        Collectors.toList(),
        (Set<String> set, List<String> list) -> set.size() + ":" + list.size());
    System.out.println(tee.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH));
    System.out.println(tee.characteristics().contains(Collector.Characteristics.UNORDERED));

    try {
      Collectors.teeing(null, Collectors.toList(), (left, right) -> left);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Collectors.teeing(Collectors.toList(), null, (left, right) -> left);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Collectors.teeing(Collectors.toList(), Collectors.toList(), null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of("a", (String) null)
          .collect(Collectors.teeing(
              Collectors.toUnmodifiableList(),
              Collectors.joining(","),
              (list, joined) -> joined));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
