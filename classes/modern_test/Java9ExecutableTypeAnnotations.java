package classes.modern_test;

import java.io.IOException;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.AnnotatedParameterizedType;
import java.lang.reflect.AnnotatedType;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.List;

public class Java9ExecutableTypeAnnotations {
  @Retention(RetentionPolicy.RUNTIME)
  @Target(ElementType.TYPE_USE)
  private @interface Tag {
    String value();
  }

  public Java9ExecutableTypeAnnotations(@Tag("constructor-parameter") String value)
      throws @Tag("constructor-throws") IOException {
  }

  public @Tag("return") List<@Tag("argument") String> sample(
      @Tag("receiver") Java9ExecutableTypeAnnotations this,
      @Tag("parameter") String value) throws @Tag("throws") IOException {
    return null;
  }

  public String plain(String value) {
    return value;
  }

  public static void main(String[] args) throws Exception {
    Method sample = Java9ExecutableTypeAnnotations.class.getMethod("sample", String.class);
    AnnotatedType returnType = sample.getAnnotatedReturnType();
    AnnotatedType argumentType =
        ((AnnotatedParameterizedType) returnType).getAnnotatedActualTypeArguments()[0];
    System.out.println("return-type=" + returnType.getType().getTypeName());
    System.out.println("return-tag=" + tag(returnType));
    System.out.println("argument-type=" + argumentType.getType().getTypeName());
    System.out.println("argument-tag=" + tag(argumentType));
    System.out.println("receiver-type=" + sample.getAnnotatedReceiverType().getType().getTypeName());
    System.out.println("receiver-tag=" + tag(sample.getAnnotatedReceiverType()));
    System.out.println("parameter-type=" + sample.getAnnotatedParameterTypes()[0].getType().getTypeName());
    System.out.println("parameter-tag=" + tag(sample.getAnnotatedParameterTypes()[0]));
    System.out.println("throws-type=" + sample.getAnnotatedExceptionTypes()[0].getType().getTypeName());
    System.out.println("throws-tag=" + tag(sample.getAnnotatedExceptionTypes()[0]));

    Constructor<Java9ExecutableTypeAnnotations> constructor =
        Java9ExecutableTypeAnnotations.class.getConstructor(String.class);
    System.out.println("constructor-parameter-tag=" + tag(constructor.getAnnotatedParameterTypes()[0]));
    System.out.println("constructor-throws-tag=" + tag(constructor.getAnnotatedExceptionTypes()[0]));

    Method plain = Java9ExecutableTypeAnnotations.class.getMethod("plain", String.class);
    System.out.println("plain-return-tag=" + tag(plain.getAnnotatedReturnType()));
    System.out.println("plain-parameter-tag=" + tag(plain.getAnnotatedParameterTypes()[0]));
    System.out.println("plain-throws-count=" + plain.getAnnotatedExceptionTypes().length);
  }

  private static String tag(AnnotatedType type) {
    Tag tag = type.getAnnotation(Tag.class);
    return tag == null ? "null" : tag.value();
  }
}
