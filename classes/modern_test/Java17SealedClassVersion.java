package classes.modern_test;

public class Java17SealedClassVersion {
  public static void main(String[] args) {
    Shape[] shapes = new Shape[] { new Circle(), new Square() };
    for (int i = 0; i < shapes.length; i++) {
      System.out.println(shapes[i].name());
      System.out.println(shapes[i].sides());
    }
  }

  sealed interface Shape permits Circle, Square {
    String name();
    int sides();
  }

  static final class Circle implements Shape {
    public String name() {
      return "circle";
    }

    public int sides() {
      return 0;
    }
  }

  static final class Square implements Shape {
    public String name() {
      return "square";
    }

    public int sides() {
      return 4;
    }
  }
}
