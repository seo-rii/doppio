import java.lang.reflect.RecordComponent;

public final class RecordInteropSupport {
  private RecordInteropSupport() {
  }

  public static boolean isRecord(Class<?> cls) {
    return cls.isRecord();
  }

  public static RecordComponent[] components(Class<?> cls) {
    return cls.getRecordComponents();
  }

  public static String componentName(RecordComponent component) {
    return component.getName();
  }

  public static String componentTypeName(RecordComponent component) {
    return component.getType().getSimpleName();
  }

  public static String componentGenericSignature(RecordComponent component) {
    String signature = component.getGenericSignature();
    return signature == null ? "_" : signature;
  }

  public static String componentValue(RecordComponent component, Object target) throws ReflectiveOperationException {
    return String.valueOf(component.getAccessor().invoke(target));
  }
}
