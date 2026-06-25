import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD, ElementType.PARAMETER})
public @interface ScalaRichTag {
  String name();
  ScalaTagLevel level() default ScalaTagLevel.LOW;
  Class<?> owner();
  int[] numbers();
}
