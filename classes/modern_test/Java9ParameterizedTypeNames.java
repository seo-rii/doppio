package classes.modern_test;

import java.lang.reflect.Field;
import java.lang.reflect.GenericArrayType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.lang.reflect.TypeVariable;
import java.lang.reflect.WildcardType;
import java.util.List;
import java.util.Map;

public class Java9ParameterizedTypeNames {
  static class Outer<T> {
    static class StaticNested<U> {
    }

    class Inner<U> {
    }

    class Leaf {
    }
  }

  List<String> top;
  Outer.StaticNested<Long> staticNested;
  Outer<String>.Inner<Integer> inner;
  Outer<String>.Leaf leaf;
  Outer.Inner rawInner;
  Map.Entry<String, Integer> jdkStaticNested;
  Outer<? extends Number>.Inner<? super Integer>[] genericArray;
  List<? extends Outer<String>.Inner<Integer>[]> wildcardArray;

  public static void main(String[] args) throws Exception {
    String[] fields = {
      "top",
      "staticNested",
      "inner",
      "leaf",
      "rawInner",
      "jdkStaticNested",
      "genericArray",
      "wildcardArray"
    };
    for (String name : fields) {
      Field field = Java9ParameterizedTypeNames.class.getDeclaredField(name);
      Type type = field.getGenericType();
      System.out.println(name + ".kind=" + kind(type));
      System.out.println(name + ".type-name=" + type.getTypeName());
      System.out.println(name + ".to-string=" + type.toString());
      System.out.println(name + ".shape=" + shape(type));
    }

    Type parameterized =
        Java9ParameterizedTypeNames.class.getDeclaredField("inner").getGenericType();
    Method toStringMethod = parameterized.getClass().getDeclaredMethod("toString");
    System.out.println("implementation=" + parameterized.getClass().getName());
    System.out.println(
        "to-string-metadata=" + toStringMethod.getDeclaringClass().getName() + ":"
            + toStringMethod.getModifiers() + ":"
            + Modifier.isPublic(toStringMethod.getModifiers()) + ":"
            + Modifier.isNative(toStringMethod.getModifiers()) + ":"
            + toStringMethod.isSynthetic() + ":"
            + toStringMethod.getReturnType().getName() + ":"
            + toStringMethod.getParameterTypes().length);
  }

  private static String kind(Type type) {
    if (type instanceof Class<?>) {
      return "class";
    }
    if (type instanceof ParameterizedType) {
      return "parameterized";
    }
    if (type instanceof GenericArrayType) {
      return "generic-array";
    }
    if (type instanceof WildcardType) {
      return "wildcard";
    }
    if (type instanceof TypeVariable<?>) {
      return "type-variable";
    }
    return type.getClass().getName();
  }

  private static String shape(Type type) {
    if (type == null) {
      return "null";
    }
    if (type instanceof Class<?>) {
      return "class(" + ((Class<?>) type).getName() + ")";
    }
    if (type instanceof TypeVariable<?>) {
      return "variable(" + ((TypeVariable<?>) type).getName() + ")";
    }
    if (type instanceof GenericArrayType) {
      return "array(" + shape(((GenericArrayType) type).getGenericComponentType()) + ")";
    }
    if (type instanceof WildcardType) {
      WildcardType wildcard = (WildcardType) type;
      return "wildcard(upper=" + shapes(wildcard.getUpperBounds())
          + ",lower=" + shapes(wildcard.getLowerBounds()) + ")";
    }
    if (type instanceof ParameterizedType) {
      ParameterizedType parameterized = (ParameterizedType) type;
      return "parameterized(raw=" + shape(parameterized.getRawType())
          + ",owner=" + shape(parameterized.getOwnerType())
          + ",arguments=" + shapes(parameterized.getActualTypeArguments()) + ")";
    }
    return type.getClass().getName();
  }

  private static String shapes(Type[] types) {
    StringBuilder result = new StringBuilder("[");
    for (int i = 0; i < types.length; i++) {
      if (i != 0) {
        result.append(',');
      }
      result.append(shape(types[i]));
    }
    return result.append(']').toString();
  }
}
