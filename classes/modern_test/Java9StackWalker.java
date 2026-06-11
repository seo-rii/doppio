package classes.modern_test;

import java.lang.reflect.Method;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.stream.Stream;
import java.util.stream.Collectors;

public class Java9StackWalker {
  static class CallerHelper {
    static Class<?> callerClass() {
      return StackWalker.getInstance(StackWalker.Option.RETAIN_CLASS_REFERENCE).getCallerClass();
    }
  }

  static Class<?> callerClass() {
    return StackWalker.getInstance(StackWalker.Option.RETAIN_CLASS_REFERENCE).getCallerClass();
  }

  static void callThroughHelper() {
    System.out.println(callerClass().getName());
  }

  static void callerClassSkipsHelper() {
    System.out.println(CallerHelper.callerClass().getName());
  }

  static void callerClassSkipsReflectionFrames() throws Exception {
    Method method = CallerHelper.class.getDeclaredMethod("callerClass");
    System.out.println(((Class<?>) method.invoke(null)).getName());
  }

  static void noRetainedClassReference() {
    try {
      StackWalker.getInstance().getCallerClass();
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
  }

  static void noRetainedFrameClassReference() {
    try {
      StackWalker.getInstance().walk(stream -> {
        stream.findFirst().get().getDeclaringClass();
        return null;
      });
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
  }

  static void nullOptionSet() {
    HashSet<StackWalker.Option> options = new HashSet<>();
    options.add(null);
    try {
      StackWalker.getInstance(options);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      StackWalker.getInstance(options, 1);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }

  static void walkThroughHelper() {
    walkDeeper();
  }

  @SuppressWarnings("unchecked")
  static void streamClosedAfterWalk() {
    Stream<StackWalker.StackFrame>[] holder = new Stream[1];
    StackWalker.getInstance().walk(stream -> {
      holder[0] = stream;
      return 0;
    });
    try {
      holder[0].count();
      System.out.println(false);
    } catch (IllegalStateException e) {
      System.out.println(e.getClass().getName());
    }
  }

  static void walkDeeper() {
    String frames = StackWalker.getInstance(StackWalker.Option.RETAIN_CLASS_REFERENCE).walk(stream ->
      stream.limit(4)
        .map(frame -> frame.getClassName() + "#" + frame.getMethodName() + ":" + frame.getDeclaringClass().getName() + ":" + (frame.getLineNumber() > 0))
        .collect(Collectors.joining(",")));
    System.out.println(frames);

    String firstFrame = StackWalker.getInstance(StackWalker.Option.RETAIN_CLASS_REFERENCE).walk(stream ->
      stream.findFirst().get().toString());
    System.out.println(firstFrame.contains("classes.modern_test.Java9StackWalker.walkDeeper(") && firstFrame.contains("Java9StackWalker.java:"));

    StringBuilder methods = new StringBuilder();
    StackWalker.getInstance().forEach(frame -> {
      if (methods.length() < 80) {
        methods.append(frame.getMethodName()).append(">");
      }
    });
    System.out.println(methods.toString().startsWith("walkDeeper>walkThroughHelper>main>"));
  }

  static String frameNames(StackWalker walker) {
    return walker.walk(stream ->
      stream.limit(8)
        .map(frame -> frame.getClassName() + "#" + frame.getMethodName())
        .collect(Collectors.joining(",")));
  }

  static void hiddenFrames() {
    Runnable runnable = () -> {
      String normal = frameNames(StackWalker.getInstance());
      String hidden = frameNames(StackWalker.getInstance(EnumSet.of(StackWalker.Option.SHOW_HIDDEN_FRAMES)));
      System.out.println(normal.contains("$$Lambda$"));
      System.out.println(hidden.contains("$$Lambda$"));
    };
    runnable.run();
  }

  static void reflectedTarget() {
    String normal = frameNames(StackWalker.getInstance());
    String reflected = frameNames(StackWalker.getInstance(EnumSet.of(StackWalker.Option.SHOW_REFLECT_FRAMES)));
    System.out.println(normal.contains("java.lang.reflect") || normal.contains("jdk.internal.reflect") || normal.contains("sun.reflect"));
    System.out.println(reflected.contains("java.lang.reflect") || reflected.contains("jdk.internal.reflect") || reflected.contains("sun.reflect"));
  }

  static void reflectFrames() throws Exception {
    Method method = Java9StackWalker.class.getDeclaredMethod("reflectedTarget");
    method.invoke(null);
  }

  public static void main(String[] args) throws Exception {
    callThroughHelper();
    callerClassSkipsHelper();
    callerClassSkipsReflectionFrames();
    noRetainedClassReference();
    noRetainedFrameClassReference();
    nullOptionSet();
    try {
      StackWalker.getInstance(StackWalker.Option.RETAIN_CLASS_REFERENCE).getCallerClass();
    } catch (IllegalCallerException e) {
      System.out.println(e.getClass().getName());
    }
    walkThroughHelper();
    streamClosedAfterWalk();
    hiddenFrames();
    reflectFrames();
  }
}
