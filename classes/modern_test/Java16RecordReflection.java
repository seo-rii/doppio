package classes.modern_test;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;

public class Java16RecordReflection {
  public static void main(String[] args) throws Exception {
    print("data", Data.class);
    print("empty", Empty.class);
    print("plain", Plain.class);
    print("array", Data[].class);
    print("primitive", int.class);
    printGenericSignatures(GenericData.class);
    printAnnotations(AnnotatedData.class);

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
        + ":" + component.getGenericSignature()
        + ":" + component.getGenericType().getTypeName()
        + ":" + component.getAnnotatedType().getType().getTypeName()
        + ":" + component.getAccessor().getName()
        + ":" + component.getDeclaringRecord().getName()
        + ":" + component.toString();
    }
    System.out.println(label + ":" + Arrays.toString(parts));
  }

  private static void printGenericSignatures(Class<?> cls) {
    RecordComponent[] components = cls.getRecordComponents();
    String[] parts = new String[components.length];
    for (int i = 0; i < components.length; i++) {
      RecordComponent component = components[i];
      parts[i] = component.getName() + ":" + component.getGenericSignature();
    }
    System.out.println("generic-signature:" + Arrays.toString(parts));
  }

  private static void printAnnotations(Class<?> cls) {
    RecordComponent[] components = cls.getRecordComponents();
    String[] parts = new String[components.length];
    for (int i = 0; i < components.length; i++) {
      RecordComponent component = components[i];
      Label label = component.getAnnotation(Label.class);
      parts[i] = component.getName()
        + ":" + (label == null ? "null" : label.value())
        + ":" + component.getAnnotations().length
        + ":" + component.getDeclaredAnnotations().length;
    }
    System.out.println("annotations:" + Arrays.toString(parts));
    try {
      components[0].getAnnotation(null);
      System.out.println("annotation-null:missing");
    } catch (NullPointerException e) {
      System.out.println("annotation-null:npe");
    }
  }

  private static String valueText(Object value) {
    if (value instanceof int[]) {
      return Arrays.toString((int[]) value);
    }
    return String.valueOf(value);
  }

  record Data(String name, int count, int[] values) {}

  record Empty() {}

  record GenericData<T extends Number>(T item, java.util.List<String> names) {}

  record AnnotatedData(@Label("name") String name, @Label("count") int count) {}

  @Retention(RetentionPolicy.RUNTIME)
  @Target(ElementType.RECORD_COMPONENT)
  @interface Label {
    String value();
  }

  static final class Plain {}
}
