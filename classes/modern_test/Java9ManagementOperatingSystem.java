package classes.modern_test;

import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;

public class Java9ManagementOperatingSystem {
  public static void main(String[] args) {
    OperatingSystemMXBean os = ManagementFactory.getOperatingSystemMXBean();
    com.sun.management.OperatingSystemMXBean extended =
        ManagementFactory.getPlatformMXBean(com.sun.management.OperatingSystemMXBean.class);

    System.out.println(os != null);
    System.out.println(os.getName() != null && os.getName().length() > 0);
    System.out.println(os.getArch() != null && os.getArch().length() > 0);
    System.out.println(os.getVersion() != null && os.getVersion().length() > 0);
    System.out.println(os.getAvailableProcessors() >= 1);

    double load = os.getSystemLoadAverage();
    System.out.println(load >= 0.0 || load == -1.0);
    System.out.println(os.getObjectName().getCanonicalName().equals("java.lang:type=OperatingSystem"));
    System.out.println(extended != null);
    System.out.println(extended.getCommittedVirtualMemorySize() >= -1L);
    System.out.println(extended.getTotalSwapSpaceSize() >= -1L);
    System.out.println(extended.getFreeSwapSpaceSize() >= -1L);
    System.out.println(extended.getProcessCpuTime() >= -1L);
    System.out.println(extended.getFreePhysicalMemorySize() >= -1L);
    System.out.println(extended.getTotalPhysicalMemorySize() >= -1L);
    System.out.println(validCpuLoad(extended.getSystemCpuLoad()));
    System.out.println(validCpuLoad(extended.getProcessCpuLoad()));
  }

  private static boolean validCpuLoad(double load) {
    return load == -1.0 || (load >= 0.0 && load <= 1.0);
  }
}
