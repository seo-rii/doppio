package classes.modern_test;

import java.lang.management.CompilationMXBean;
import java.lang.management.ManagementFactory;

public class Java9ManagementCompilationBean {
  public static void main(String[] args) {
    CompilationMXBean compilation = ManagementFactory.getCompilationMXBean();

    System.out.println(compilation != null);
    System.out.println(compilation.getName() != null);
    System.out.println(compilation.getName().length() > 0);
    System.out.println(compilation.getObjectName().getCanonicalName().equals("java.lang:type=Compilation"));

    boolean supported = compilation.isCompilationTimeMonitoringSupported();
    System.out.println(supported);
    System.out.println(supported ? compilation.getTotalCompilationTime() >= 0 : unsupportedTime(compilation));
  }

  private static boolean unsupportedTime(CompilationMXBean compilation) {
    try {
      compilation.getTotalCompilationTime();
      return false;
    } catch (UnsupportedOperationException e) {
      return true;
    }
  }
}
