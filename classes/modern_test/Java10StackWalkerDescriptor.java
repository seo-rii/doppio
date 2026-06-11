package classes.modern_test;

import java.util.stream.Collectors;

public class Java10StackWalkerDescriptor {
  static int sample(String text, int value) {
    deeper(text, value);
    return value;
  }

  static void deeper(String text, int value) {
    String frames = StackWalker.getInstance(StackWalker.Option.RETAIN_CLASS_REFERENCE).walk(stream ->
      stream.limit(3)
        .map(frame -> frame.getMethodName() + ":" + frame.getDescriptor() + ":" + frame.getMethodType())
        .collect(Collectors.joining(",")));
    System.out.println(frames);

    StackWalker.StackFrame noRetain = StackWalker.getInstance().walk(stream -> stream.findFirst().get());
    System.out.println(noRetain.getDescriptor());
    try {
      noRetain.getMethodType();
      System.out.println(false);
    } catch (UnsupportedOperationException ex) {
      System.out.println(ex.getClass().getName());
    }
    try {
      noRetain.getDeclaringClass();
      System.out.println(false);
    } catch (UnsupportedOperationException ex) {
      System.out.println(ex.getClass().getName());
    }
  }

  public static void main(String[] args) {
    sample("x", 7);
  }
}
