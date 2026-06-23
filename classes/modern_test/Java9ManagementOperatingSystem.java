package classes.modern_test;

import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;

public class Java9ManagementOperatingSystem {
  public static void main(String[] args) {
    OperatingSystemMXBean os = ManagementFactory.getOperatingSystemMXBean();

    System.out.println(os != null);
    System.out.println(os.getName() != null && os.getName().length() > 0);
    System.out.println(os.getArch() != null && os.getArch().length() > 0);
    System.out.println(os.getVersion() != null && os.getVersion().length() > 0);
    System.out.println(os.getAvailableProcessors() >= 1);

    double load = os.getSystemLoadAverage();
    System.out.println(load >= 0.0 || load == -1.0);
    System.out.println(os.getObjectName().getCanonicalName().equals("java.lang:type=OperatingSystem"));
  }
}
