package classes.modern_test;

import java.lang.annotation.Annotation;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.AnnotatedArrayType;
import java.lang.reflect.AnnotatedParameterizedType;
import java.lang.reflect.AnnotatedType;
import java.lang.reflect.AnnotatedTypeVariable;
import java.lang.reflect.AnnotatedWildcardType;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.List;

public class Java9AnnotatedOwnerTypes<T> {
  @Retention(RetentionPolicy.RUNTIME)
  @Target(ElementType.TYPE_USE)
  @interface Mark {
    String value();
  }

  static class Outer<O> {
    class Inner<I> {
    }

    class Middle<M> {
      class Leaf<L> {
      }

      class PlainLeaf {
      }
    }

    static class StaticNested<S> {
    }

    class RawInner {
    }
  }

  @Mark("outer") Outer<@Mark("outer-argument") String>
      .@Mark("inner") Inner<@Mark("inner-argument") Integer> parameterizedInner;
  @Mark("three-outer") Outer<@Mark("three-outer-argument") String>
      .@Mark("three-middle") Middle<@Mark("three-middle-argument") Integer>
      .@Mark("three-leaf") Leaf<@Mark("three-leaf-argument") Long> threeLevel;
  Outer<String>.Middle<Integer>.@Mark("plain-leaf") PlainLeaf plainLeaf;
  Outer.@Mark("static") StaticNested<@Mark("static-argument") Long> staticNested;
  @Mark("raw-owner") Outer.@Mark("raw-inner") RawInner rawInner;
  @Mark("top") List<@Mark("top-argument") String> top;
  @Mark("array") String @Mark("dimension") [] array;
  @Mark("variable") T variable;
  List<@Mark("wildcard") ? extends @Mark("bound") Number> wildcard;

  public static void main(String[] args) throws Exception {
    printField("parameterized-inner", "parameterizedInner");
    printField("three-level", "threeLevel");
    printField("plain-leaf", "plainLeaf");
    printField("static-nested", "staticNested");
    printField("raw-inner", "rawInner");
    printField("top", "top");
    printField("array", "array");
    printField("variable", "variable");

    AnnotatedParameterizedType wildcardHolder = (AnnotatedParameterizedType)
        field("wildcard").getAnnotatedType();
    AnnotatedWildcardType wildcard = (AnnotatedWildcardType)
        wildcardHolder.getAnnotatedActualTypeArguments()[0];
    System.out.println("wildcard=" + describe(wildcard));
    System.out.println("wildcard-upper=" + describe(wildcard.getAnnotatedUpperBounds()[0]));

    printMetadata(AnnotatedType.class);
    printMetadata(AnnotatedParameterizedType.class);
    printMetadata(AnnotatedArrayType.class);
    printMetadata(AnnotatedTypeVariable.class);
    printMetadata(AnnotatedWildcardType.class);

    printImplementation("parameterized", field("parameterizedInner").getAnnotatedType());
    printImplementation("raw", field("rawInner").getAnnotatedType());
    printImplementation("array", field("array").getAnnotatedType());
    printImplementation("variable", field("variable").getAnnotatedType());
    printImplementation("wildcard", wildcard);
  }

  private static void printField(String label, String name) throws Exception {
    System.out.println(label + "=" + describe(field(name).getAnnotatedType()));
  }

  private static Field field(String name) throws Exception {
    return Java9AnnotatedOwnerTypes.class.getDeclaredField(name);
  }

  private static void printImplementation(String label, AnnotatedType type)
      throws Exception {
    System.out.println(label + "-implementation="
        + type.getClass().getMethod("getAnnotatedOwnerType")
            .getDeclaringClass().getName());
  }

  private static String describe(AnnotatedType type) {
    if (type == null) {
      return "null";
    }
    StringBuilder result = new StringBuilder();
    result.append(type.getClass().getInterfaces()[0].getSimpleName());
    result.append("(type=").append(type.getType().getTypeName());
    result.append(",annotations=").append(annotationValues(type.getAnnotations()));
    result.append(",owner=").append(describe(type.getAnnotatedOwnerType()));
    if (type instanceof AnnotatedParameterizedType) {
      result.append(",arguments=")
          .append(describeAll(
              ((AnnotatedParameterizedType) type).getAnnotatedActualTypeArguments()));
    } else if (type instanceof AnnotatedArrayType) {
      result.append(",component=")
          .append(describe(
              ((AnnotatedArrayType) type).getAnnotatedGenericComponentType()));
    } else if (type instanceof AnnotatedTypeVariable) {
      result.append(",bounds=")
          .append(describeAll(((AnnotatedTypeVariable) type).getAnnotatedBounds()));
    } else if (type instanceof AnnotatedWildcardType) {
      AnnotatedWildcardType wildcard = (AnnotatedWildcardType) type;
      result.append(",lower=").append(describeAll(wildcard.getAnnotatedLowerBounds()));
      result.append(",upper=").append(describeAll(wildcard.getAnnotatedUpperBounds()));
    }
    return result.append(')').toString();
  }

  private static String describeAll(AnnotatedType[] types) {
    StringBuilder result = new StringBuilder("[");
    for (int i = 0; i < types.length; i++) {
      if (i != 0) {
        result.append(',');
      }
      result.append(describe(types[i]));
    }
    return result.append(']').toString();
  }

  private static String annotationValues(Annotation[] annotations) {
    StringBuilder result = new StringBuilder("[");
    for (int i = 0; i < annotations.length; i++) {
      if (i != 0) {
        result.append(',');
      }
      Annotation annotation = annotations[i];
      result.append(annotation.annotationType().getSimpleName());
      if (annotation instanceof Mark) {
        result.append('=').append(((Mark) annotation).value());
      }
    }
    return result.append(']').toString();
  }

  private static void printMetadata(Class<?> type) throws Exception {
    Method method = type.getDeclaredMethod("getAnnotatedOwnerType");
    int modifiers = method.getModifiers();
    System.out.println(type.getSimpleName() + "-metadata="
        + method.getDeclaringClass().getName() + ":"
        + modifiers + ":"
        + Modifier.isPublic(modifiers) + ":"
        + Modifier.isAbstract(modifiers) + ":"
        + Modifier.isNative(modifiers) + ":"
        + method.isDefault() + ":"
        + method.isSynthetic() + ":"
        + method.getReturnType().getName() + ":"
        + method.getParameterTypes().length);
  }
}
