package classes.modern_test;

public class Java11ClassLocalAnonymousReflection {
  static class Member {
  }

  private static Class<?> methodLocalClass() {
    class MethodLocal {
    }
    return MethodLocal.class;
  }

  private static Class<?> anonymousClass() {
    return new Runnable() {
      @Override
      public void run() {
      }
    }.getClass();
  }

  private static String name(Class<?> cls) {
    return cls == null ? "null" : cls.getSimpleName();
  }

  private static String methodName(Class<?> cls) {
    return cls.getEnclosingMethod() == null ? "null" : cls.getEnclosingMethod().getName();
  }

  private static String interfaces(Class<?> cls) {
    Class<?>[] interfaces = cls.getInterfaces();
    if (interfaces.length == 0) {
      return "-";
    }
    StringBuilder builder = new StringBuilder();
    for (int i = 0; i < interfaces.length; i++) {
      if (i > 0) {
        builder.append(",");
      }
      builder.append(interfaces[i].getSimpleName());
    }
    return builder.toString();
  }

  private static void print(String label, Class<?> cls) {
    String simple = cls.getSimpleName().isEmpty() ? "_" : cls.getSimpleName();
    System.out.println(label + ":" +
        simple + ":" +
        name(cls.getDeclaringClass()) + ":" +
        name(cls.getEnclosingClass()) + ":" +
        methodName(cls) + ":" +
        interfaces(cls) + ":" +
        cls.isMemberClass() + ":" +
        cls.isLocalClass() + ":" +
        cls.isAnonymousClass());
  }

  public static void main(String[] args) {
    print("member", Member.class);
    print("local", methodLocalClass());
    print("anonymous", anonymousClass());
  }
}
