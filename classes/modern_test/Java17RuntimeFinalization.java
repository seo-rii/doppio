package classes.modern_test;

public class Java17RuntimeFinalization {
  public static void main(String[] args) {
    Runtime runtime = Runtime.getRuntime();
    runtime.runFinalization();
    System.out.println("runtime-runFinalization:ok");

    System.runFinalization();
    System.out.println("system-runFinalization:ok");

    runtime.gc();
    runtime.runFinalization();
    System.out.println("gc-then-finalization:ok");
  }
}
