package classes.modern_test;

public class Java16ClassIsRecord {
  public static void main(String[] args) {
    record LocalRecord(String name) {}

    print("record", Data.class);
    print("empty", Empty.class);
    print("local", LocalRecord.class);
    print("plain", Plain.class);
    print("enum", Choice.class);
    print("string", String.class);
    print("primitive", int.class);
    print("void", void.class);
    print("record-array", Data[].class);
    print("primitive-array", int[].class);
  }

  private static void print(String label, Class<?> cls) {
    System.out.println(label + ":" + cls.isRecord());
  }

  record Data(String name, int count) {}

  record Empty() {}

  static final class Plain {}

  enum Choice {
    ONE
  }
}
