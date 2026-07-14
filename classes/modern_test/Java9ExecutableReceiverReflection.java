package classes.modern_test;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.AnnotatedType;
import java.lang.reflect.Constructor;
import java.lang.reflect.Executable;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.lang.reflect.TypeVariable;

public class Java9ExecutableReceiverReflection<T> {
  @Retention(RetentionPolicy.RUNTIME)
  @Target(ElementType.TYPE_USE)
  public @interface Tag {
    String value();
  }

  static class StaticNested<U> {
    StaticNested() {
    }

    void method(@Tag("static-nested-method") StaticNested<U> this) {
    }
  }

  class Inner<U> {
    Inner(
        @Tag("inner-constructor") Java9ExecutableReceiverReflection<T>
            Java9ExecutableReceiverReflection.this) {
    }

    void method(@Tag("inner-method") Inner<U> this) {
    }
  }

  void method(@Tag("outer-method") Java9ExecutableReceiverReflection<T> this) {
  }

  static void staticMethod() {
  }

  public static void main(String[] args) throws Exception {
    class Local<V> {
      Local() {
      }

      void method(@Tag("local-method") Local<V> this) {
      }
    }

    Runnable anonymous = new Runnable() {
      @Override
      public void run() {
      }
    };

    print("top-method", Java9ReceiverTopLevel.class.getDeclaredMethod("method"));
    print("outer-method", Java9ExecutableReceiverReflection.class.getDeclaredMethod("method"));
    print("static-nested-method", StaticNested.class.getDeclaredMethod("method"));
    print(
        "inner-method",
        Java9ExecutableReceiverReflection.Inner.class.getDeclaredMethod("method"));
    print("local-method", Local.class.getDeclaredMethod("method"));
    print("anonymous-method", anonymous.getClass().getDeclaredMethod("run"));
    print("static-method", Java9ExecutableReceiverReflection.class.getDeclaredMethod("staticMethod"));

    print("top-constructor", Java9ReceiverTopLevel.class.getDeclaredConstructor());
    print("static-nested-constructor", StaticNested.class.getDeclaredConstructor());
    print(
        "inner-constructor",
        Java9ExecutableReceiverReflection.Inner.class.getDeclaredConstructor(
            Java9ExecutableReceiverReflection.class));
    print("local-constructor", Local.class.getDeclaredConstructor());
    Constructor<?> anonymousConstructor = anonymous.getClass().getDeclaredConstructors()[0];
    print("anonymous-constructor", anonymousConstructor);
    System.out.println(
        "class-modifiers="
            + Modifier.isStatic(StaticNested.class.getModifiers()) + ":"
            + Modifier.isStatic(
                Java9ExecutableReceiverReflection.Inner.class.getModifiers()) + ":"
            + Modifier.isStatic(Local.class.getModifiers()) + ":"
            + Modifier.isStatic(anonymous.getClass().getModifiers()));

    Method executableReceiver =
        Executable.class.getDeclaredMethod("getAnnotatedReceiverType");
    Method constructorReceiver =
        Constructor.class.getDeclaredMethod("getAnnotatedReceiverType");
    Method parameterize =
        Executable.class.getDeclaredMethod("parameterize", Class.class);
    System.out.println("executable-receiver-metadata=" + metadata(executableReceiver));
    System.out.println("constructor-receiver-metadata=" + metadata(constructorReceiver));
    System.out.println(
        "parameterize-metadata=" + metadata(parameterize) + ":"
            + parameterize.getGenericParameterTypes()[0].getTypeName() + ":"
            + parameterize.getGenericReturnType().getTypeName());
  }

  private static void print(String label, Executable executable) {
    AnnotatedType receiver = executable.getAnnotatedReceiverType();
    if (receiver == null) {
      System.out.println(label + "=null");
      return;
    }
    Tag tag = receiver.getAnnotation(Tag.class);
    System.out.println(
        label + "=" + shape(receiver.getType()) + ":" + (tag == null ? "null" : tag.value()));
  }

  private static String shape(Type type) {
    if (type == null) {
      return "null";
    }
    if (type instanceof Class<?>) {
      Class<?> cls = (Class<?>) type;
      if (cls.isAnonymousClass()) {
        return "class:anonymous";
      }
      if (cls.isLocalClass()) {
        return "class:local";
      }
      return "class:" + cls.getName();
    }
    if (type instanceof TypeVariable<?>) {
      return "variable:" + ((TypeVariable<?>) type).getName();
    }
    if (type instanceof ParameterizedType) {
      ParameterizedType parameterized = (ParameterizedType) type;
      StringBuilder result = new StringBuilder("parameterized(");
      result.append(shape(parameterized.getRawType()));
      result.append(",owner=").append(shape(parameterized.getOwnerType()));
      result.append(",arguments=[");
      Type[] arguments = parameterized.getActualTypeArguments();
      for (int i = 0; i < arguments.length; i++) {
        if (i != 0) {
          result.append(',');
        }
        result.append(shape(arguments[i]));
      }
      return result.append("])").toString();
    }
    return type.getClass().getName();
  }

  private static String metadata(Method method) {
    return method.getDeclaringClass().getName() + ":" + method.getModifiers() + ":"
        + Modifier.isNative(method.getModifiers()) + ":" + method.isSynthetic();
  }
}

class Java9ReceiverTopLevel<V> {
  Java9ReceiverTopLevel() {
  }

  void method(
      @Java9ExecutableReceiverReflection.Tag("top-method") Java9ReceiverTopLevel<V> this) {
  }
}
