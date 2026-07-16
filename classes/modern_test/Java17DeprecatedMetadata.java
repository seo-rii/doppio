package classes.modern_test;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;

public class Java17DeprecatedMetadata {
  @Target(ElementType.RECORD_COMPONENT)
  private @interface RecordLabel {}

  @Deprecated(since = "17", forRemoval = true)
  public static void removedSoon() {}

  private static String names(ElementType[] values) {
    StringBuilder result = new StringBuilder();
    for (int i = 0; i < values.length; i++) {
      if (i != 0) {
        result.append(',');
      }
      result.append(values[i].name());
    }
    return result.toString();
  }

  private static boolean exactEnumFields(ElementType[] values) throws Exception {
    if (ElementType.class.getFields().length != values.length) {
      return false;
    }
    for (ElementType value : values) {
      Field field = ElementType.class.getField(value.name());
      if (field.getType() != ElementType.class ||
          field.getModifiers() !=
              (Modifier.PUBLIC | Modifier.STATIC | Modifier.FINAL | 0x4000) ||
          !field.isEnumConstant() || field.isSynthetic() || field.get(null) != value) {
        return false;
      }
    }
    return true;
  }

  private static boolean exactEnumMethods() throws Exception {
    Method values = ElementType.class.getDeclaredMethod("values");
    Method valueOf = ElementType.class.getDeclaredMethod("valueOf", String.class);
    return values.getModifiers() == (Modifier.PUBLIC | Modifier.STATIC) &&
        values.getReturnType() == ElementType[].class &&
        values.getParameterTypes().length == 0 &&
        values.getExceptionTypes().length == 0 &&
        !values.isBridge() && !values.isSynthetic() && !values.isVarArgs() &&
        valueOf.getModifiers() == (Modifier.PUBLIC | Modifier.STATIC) &&
        valueOf.getReturnType() == ElementType.class &&
        Arrays.equals(valueOf.getParameterTypes(), new Class<?>[] { String.class }) &&
        valueOf.getExceptionTypes().length == 0 &&
        !valueOf.isBridge() && !valueOf.isSynthetic() && !valueOf.isVarArgs();
  }

  private static String valueOfFailure(String name) {
    try {
      ElementType.valueOf(name);
      return "none";
    } catch (RuntimeException e) {
      return e.getClass().getSimpleName();
    }
  }

  public static void main(String[] args) throws Exception {
    ElementType[] values = ElementType.values();
    ElementType[] secondValues = ElementType.values();
    ElementType[] enumConstants = ElementType.class.getEnumConstants();
    ElementType[] secondEnumConstants = ElementType.class.getEnumConstants();
    System.out.println("elements:" + names(values));
    System.out.println("enum-shape:" +
        (ElementType.class.isEnum() &&
         ElementType.class.getSuperclass() == Enum.class &&
         ElementType.class.getEnumConstants().length == 12 &&
         exactEnumFields(values) && exactEnumMethods()));
    System.out.println("enum-copy:" +
        (values != secondValues && values[0] == secondValues[0]));
    System.out.println("enum-constants-copy:" +
        (enumConstants != secondEnumConstants &&
         enumConstants[11] == secondEnumConstants[11]));
    System.out.println("new-elements:" +
        (ElementType.MODULE.ordinal() == 10) + ":" +
        (ElementType.RECORD_COMPONENT.ordinal() == 11) + ":" +
        (ElementType.valueOf("MODULE") == ElementType.MODULE) + ":" +
        (ElementType.valueOf("RECORD_COMPONENT") == ElementType.RECORD_COMPONENT));
    System.out.println("value-of-failures:" +
        valueOfFailure("MISSING") + ":" + valueOfFailure(null));

    Target recordTarget = RecordLabel.class.getDeclaredAnnotation(Target.class);
    System.out.println("record-target:" +
        (recordTarget != null && recordTarget.value().length == 1 &&
         recordTarget.value()[0] == ElementType.RECORD_COMPONENT));

    Target target = Deprecated.class.getDeclaredAnnotation(Target.class);
    Retention retention = Deprecated.class.getDeclaredAnnotation(Retention.class);
    boolean exactAnnotations = Deprecated.class.getDeclaredAnnotations().length == 3 &&
        Deprecated.class.isAnnotationPresent(Documented.class) && target != null &&
        retention != null && retention.value() == RetentionPolicy.RUNTIME;
    System.out.println("deprecated-annotations:" + exactAnnotations);
    System.out.println("deprecated-target:" + names(target.value()));

    Method since = Deprecated.class.getDeclaredMethod("since");
    Method forRemoval = Deprecated.class.getDeclaredMethod("forRemoval");
    boolean exactElements = Deprecated.class.getDeclaredMethods().length == 2 &&
        since.getModifiers() == (Modifier.PUBLIC | Modifier.ABSTRACT) &&
        since.getReturnType() == String.class && since.getDefaultValue().equals("") &&
        forRemoval.getModifiers() == (Modifier.PUBLIC | Modifier.ABSTRACT) &&
        forRemoval.getReturnType() == boolean.class &&
        forRemoval.getDefaultValue().equals(Boolean.FALSE);
    System.out.println("deprecated-elements:" + exactElements);

    Deprecated explicit = Java17DeprecatedMetadata.class
        .getDeclaredMethod("removedSoon").getDeclaredAnnotation(Deprecated.class);
    System.out.println("deprecated-explicit:" +
        explicit.since() + ":" + explicit.forRemoval() + ":" +
        (explicit.annotationType() == Deprecated.class));
  }
}
