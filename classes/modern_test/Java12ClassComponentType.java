package classes.modern_test;

public class Java12ClassComponentType {
  public static void main(String[] args) {
    print(String.class);
    print(int.class);
    print(void.class);
    print(String[].class);
    print(String[][].class);
    print(int[].class);
    print(int[][].class);
    print(Java12ClassComponentType[].class);
    System.out.println(String[].class.componentType() == String[].class.getComponentType());
    System.out.println(int[][].class.componentType() == int[][].class.getComponentType());
  }

  private static void print(Class<?> cls) {
    Class<?> component = cls.componentType();
    System.out.println(component == null ? "null" : component.descriptorString());
  }
}
