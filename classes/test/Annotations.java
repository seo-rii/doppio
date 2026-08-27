package classes.test;


import java.lang.annotation.*;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Arrays;

@Deprecated
class Annotations {
  @Option(
      name = "Whoo"
  )
  public static boolean testField;

  public static boolean noAnnotationsField;

  @Option(
      name = "main",
      usage = "nope",
      required = true
  )
  public static void main(
      @Option( name="args" ) String[] args) throws NoSuchFieldException, NoSuchMethodException {
    System.out.println("Annotations on Annotations Class");
    Deprecated deprecated = Annotations.class.getAnnotation(Deprecated.class);
    System.out.println(deprecated != null && deprecated.annotationType() == Deprecated.class);

    System.out.println("Annotations on TestField");
    Field tf = Annotations.class.getField("testField");
    Option testFieldOption = tf.getAnnotation(Option.class);
    System.out.println(testFieldOption.annotationType().getName());
    System.out.println(testFieldOption.name());
    System.out.println(testFieldOption.usage().isEmpty());
    System.out.println(testFieldOption.required());

    System.out.println("Annotations on NoAnnotationsField");
    Field naf = Annotations.class.getField("noAnnotationsField");
    System.out.println(naf.getAnnotations().length);

    System.out.println("Annotations on main method");
    Method main = Annotations.class.getMethod("main", String[].class);
    Option mainOption = main.getAnnotation(Option.class);
    System.out.println(mainOption.annotationType().getName());
    System.out.println(mainOption.name());
    System.out.println(mainOption.usage());
    System.out.println(mainOption.required());

    System.out.println("Annotations on main method parameters");
    Annotation[][] parameterAnnotations = main.getParameterAnnotations();
    Option parameterOption = (Option) parameterAnnotations[0][0];
    System.out.println(parameterOption.annotationType().getName());
    System.out.println(parameterOption.name());
    System.out.println(parameterOption.usage().isEmpty());
    System.out.println(parameterOption.required());

    System.out.println("Annotations on Option");
    Retention retention = Option.class.getAnnotation(Retention.class);
    Target target = Option.class.getAnnotation(Target.class);
    System.out.println(retention.value().name());
    System.out.println(Arrays.toString(target.value()));
  }
}
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD,ElementType.METHOD,ElementType.PARAMETER})
@interface Option {
  String name();
  String usage() default "";
  boolean required() default false;
}
