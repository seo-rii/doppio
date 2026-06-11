package classes.modern_test;

public class Java9ThrowableStackTrace {
  public static void main(String[] args) {
    Throwable throwable = makeThrowable();
    StackTraceElement[] first = throwable.getStackTrace();
    StackTraceElement[] second = throwable.getStackTrace();
    System.out.println(first.length > 0);
    System.out.println(first != second);
    System.out.println(first[0] == second[0]);
    System.out.println(first[0].getClassName().endsWith("Java9ThrowableStackTrace"));
    System.out.println(first[0].getMethodName());
    System.out.println(throwable.fillInStackTrace() == throwable);
    System.out.println(throwable.getStackTrace()[0].getMethodName());

    Throwable noStack = new NoStackThrowable();
    System.out.println(noStack.getStackTrace().length);
    noStack.fillInStackTrace();
    System.out.println(noStack.getStackTrace().length);
  }

  private static Throwable makeThrowable() {
    return new IllegalStateException("boom");
  }

  private static final class NoStackThrowable extends Throwable {
    NoStackThrowable() {
      super("no-stack", null, false, false);
    }
  }
}
