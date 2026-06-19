package classes.modern_test;

import java.lang.reflect.RecordComponent;
import java.util.Arrays;

public class Java16RecordReflection {
  public static void main(String[] args) throws Exception {
    print("data", Data.class);
    print("empty", Empty.class);
    print("plain", Plain.class);
    print("array", Data[].class);
    print("primitive", int.class);

    Data value = new Data("Ada", 7, new int[] { 1, 2 });
    RecordComponent[] components = Data.class.getRecordComponents();
    System.out.println("clone:" + (components != Data.class.getRecordComponents()));
    for (RecordComponent component : components) {
      System.out.println("value:" + component.getName() + "=" + valueText(component.getAccessor().invoke(value)));
    }
  }

  private static void print(String label, Class<?> cls) {
    RecordComponent[] components = cls.getRecordComponents();
    if (components == null) {
      System.out.println(label + ":null");
      return;
    }

    String[] parts = new String[components.length];
    for (int i = 0; i < components.length; i++) {
      RecordComponent component = components[i];
      parts[i] = component.getName()
        + ":" + component.getType().getName()
        + ":" + component.getAccessor().getName()
        + ":" + component.getDeclaringRecord().getName()
        + ":" + component.toString();
    }
    System.out.println(label + ":" + Arrays.toString(parts));
  }

  private static String valueText(Object value) {
    if (value instanceof int[]) {
      return Arrays.toString((int[]) value);
    }
    return String.valueOf(value);
  }

  record Data(String name, int count, int[] values) {}

  record Empty() {}

  static final class Plain {}
}
