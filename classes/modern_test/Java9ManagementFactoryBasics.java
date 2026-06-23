package classes.modern_test;

import java.lang.management.ClassLoadingMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.RuntimeMXBean;
import java.lang.management.ThreadMXBean;
import java.util.List;

public class Java9ManagementFactoryBasics {
  public static void main(String[] args) {
    RuntimeMXBean runtime = ManagementFactory.getRuntimeMXBean();
    ClassLoadingMXBean classLoading = ManagementFactory.getClassLoadingMXBean();
    ThreadMXBean threads = ManagementFactory.getThreadMXBean();
    MemoryMXBean memory = ManagementFactory.getMemoryMXBean();
    List<String> inputArgs = runtime.getInputArguments();

    System.out.println(runtime.getManagementSpecVersion().matches("[0-9]+(\\.[0-9]+)+"));
    System.out.println(runtime.getName().indexOf('@') > 0);
    System.out.println(inputArgs != null);
    System.out.println(inputArgs == runtime.getInputArguments());
    System.out.println(exceptionName(inputArgs));

    long totalClasses = classLoading.getTotalLoadedClassCount();
    int loadedClasses = classLoading.getLoadedClassCount();
    long unloadedClasses = classLoading.getUnloadedClassCount();
    System.out.println(totalClasses >= loadedClasses);
    System.out.println(loadedClasses > 0);
    System.out.println(unloadedClasses >= 0);
    System.out.println(!classLoading.isVerbose());

    int liveThreads = threads.getThreadCount();
    int peakThreads = threads.getPeakThreadCount();
    long totalStartedThreads = threads.getTotalStartedThreadCount();
    int daemonThreads = threads.getDaemonThreadCount();
    System.out.println(liveThreads > 0);
    System.out.println(peakThreads >= liveThreads);
    System.out.println(totalStartedThreads >= liveThreads);
    System.out.println(daemonThreads >= 0);
    System.out.println(threads.isThreadCpuTimeSupported());
    threads.setThreadCpuTimeEnabled(true);
    System.out.println(threads.isThreadCpuTimeEnabled());
    System.out.println(threads.getCurrentThreadCpuTime() >= 0);
    System.out.println(threads.getCurrentThreadUserTime() >= 0);

    System.out.println(!memory.isVerbose());
    memory.setVerbose(false);
    System.out.println(!memory.isVerbose());
  }

  private static String exceptionName(List<String> inputArgs) {
    try {
      inputArgs.add("-Xtest");
      return "none";
    } catch (Throwable t) {
      return t.getClass().getSimpleName();
    }
  }
}
