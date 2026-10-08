package classes.modern_test;

import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.runtime.SwitchBootstraps;
import java.util.concurrent.CountDownLatch;

/** Launcher exit-status cases, compiled without preview for Java 21 and 25. */
public class JavaUncaughtExit {
  private static final class FailedInitialization {
    static final int VALUE = fail();

    private static int fail() {
      throw withoutStack(new IllegalStateException("initialization-failure"));
    }
  }

  private static <T extends Throwable> T withoutStack(T failure) {
    failure.setStackTrace(new StackTraceElement[0]);
    return failure;
  }

  private static void printFailure(Thread thread, Throwable failure) {
    System.out.println("handler:" + thread.getName() + ":" + failure.getClass().getName());
    if (failure.getCause() != null) {
      System.out.println("cause:" + failure.getCause().getClass().getName());
    }
  }

  public static void main(String[] args) throws Throwable {
    if (args.length != 1) throw new AssertionError("Exactly one exit-status case is required");
    switch (args[0]) {
      case "normal":
        System.out.println("normal");
        return;
      case "caught":
        try {
          throw withoutStack(new IllegalStateException("caught-failure"));
        } catch (IllegalStateException expected) {
          System.out.println("caught");
        }
        return;
      case "exception":
        throw withoutStack(new IllegalStateException("main-failure"));
      case "error":
        throw withoutStack(new AssertionError("main-error"));
      case "linkage":
        throw withoutStack(new NoClassDefFoundError("main-linkage"));
      case "bootstrap-invalid":
        Thread.currentThread().setUncaughtExceptionHandler(JavaUncaughtExit::printFailure);
        SwitchBootstraps.typeSwitch(MethodHandles.lookup(), "typeSwitch",
            MethodType.methodType(int.class, Object.class, int.class), (Object) null);
        throw new AssertionError("Invalid switch label must fail");
      case "main-handler":
        Thread.currentThread().setUncaughtExceptionHandler(JavaUncaughtExit::printFailure);
        throw withoutStack(new IllegalStateException("handled-main-failure"));
      case "default-handler":
        Thread.setDefaultUncaughtExceptionHandler(JavaUncaughtExit::printFailure);
        throw withoutStack(new IllegalStateException("default-handled-main-failure"));
      case "handler-exit-zero":
        Thread.currentThread().setUncaughtExceptionHandler((thread, failure) -> {
          printFailure(thread, failure);
          System.out.println("explicit-exit-zero");
          System.exit(0);
        });
        throw withoutStack(new IllegalStateException("handler-exit-zero-failure"));
      case "handler-exit-seven":
        Thread.currentThread().setUncaughtExceptionHandler((thread, failure) -> {
          printFailure(thread, failure);
          System.out.println("explicit-exit-seven");
          System.exit(7);
        });
        throw withoutStack(new IllegalStateException("handler-exit-seven-failure"));
      case "child-exception": {
        Thread child = new Thread(() -> {
          throw withoutStack(new IllegalStateException("child-failure"));
        }, "child");
        child.start();
        child.join();
        System.out.println("main-survived-child");
        return;
      }
      case "child-handler": {
        Thread child = new Thread(() -> {
          throw withoutStack(new IllegalStateException("handled-child-failure"));
        }, "child");
        child.setUncaughtExceptionHandler(JavaUncaughtExit::printFailure);
        child.start();
        child.join();
        System.out.println("main-survived-child");
        return;
      }
      case "live-child": {
        CountDownLatch ready = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        Thread child = new Thread(() -> {
          ready.countDown();
          try {
            release.await();
          } catch (InterruptedException interrupted) {
            throw new AssertionError(interrupted);
          }
          System.out.println("child-completed");
        }, "surviving-child");
        Thread.currentThread().setUncaughtExceptionHandler((thread, failure) -> {
          printFailure(thread, failure);
          release.countDown();
        });
        child.start();
        ready.await();
        throw withoutStack(new IllegalStateException("main-failure-with-live-child"));
      }
      case "initialization":
        Thread.currentThread().setUncaughtExceptionHandler(JavaUncaughtExit::printFailure);
        System.out.println(FailedInitialization.VALUE);
        throw new AssertionError("Failed class initialization must prevent continuation");
      case "exit-zero":
        System.out.println("explicit-exit-zero");
        System.exit(0);
        throw new AssertionError("System.exit must not return");
      case "exit-seven":
        System.out.println("explicit-exit-seven");
        System.exit(7);
        throw new AssertionError("System.exit must not return");
      default:
        throw new AssertionError("Unknown exit-status case: " + args[0]);
    }
  }
}
