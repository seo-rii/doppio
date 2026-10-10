package classes.modern_test;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.function.IntUnaryOperator;

/** Small genuine-javac class-file shape control, separate from header mutations. */
public class JavaClassAdmissionShapes {
  @Target({ElementType.TYPE, ElementType.RECORD_COMPONENT})
  @Retention(RetentionPolicy.RUNTIME)
  private @interface Marker {}

  private sealed interface Shape permits Point {}

  @Marker
  private record Point(@Marker int value) implements Shape {}

  static {
    System.out.println("CLASS_SHAPES_INITIALIZED");
  }

  private static String render(Shape shape) {
    return switch (shape) {
      case Point(int value) -> "point=" + value;
    };
  }

  public static void main(String[] args) {
    IntUnaryOperator addTwo = value -> value + 2;
    System.out.println("CLASS_SHAPES_MAIN " + render(new Point(addTwo.applyAsInt(19))));
  }
}
