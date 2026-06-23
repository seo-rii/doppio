package classes.modern_test;

import java.lang.management.ClassLoadingMXBean;
import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryManagerMXBean;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryPoolMXBean;
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
    List<MemoryPoolMXBean> memoryPools = ManagementFactory.getMemoryPoolMXBeans();
    List<MemoryManagerMXBean> memoryManagers = ManagementFactory.getMemoryManagerMXBeans();
    List<GarbageCollectorMXBean> collectors = ManagementFactory.getGarbageCollectorMXBeans();

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

    System.out.println(memoryPools != null);
    System.out.println(memoryManagers != null);
    System.out.println(collectors != null);
    System.out.println(memoryPools.size() >= 0);
    System.out.println(memoryManagers.size() >= collectors.size());
    System.out.println(ManagementFactory.getPlatformMXBeans(MemoryPoolMXBean.class).size() == memoryPools.size());
    System.out.println(ManagementFactory.getPlatformMXBeans(MemoryManagerMXBean.class).size() == memoryManagers.size());
    System.out.println(ManagementFactory.getPlatformMXBeans(GarbageCollectorMXBean.class).size() == collectors.size());
    System.out.println(mutationResult(memoryPools));
    System.out.println(mutationResult(memoryManagers));
    System.out.println(mutationResult(collectors));
  }

  private static String exceptionName(List<String> inputArgs) {
    try {
      inputArgs.add("-Xtest");
      return "none";
    } catch (Throwable t) {
      return t.getClass().getSimpleName();
    }
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private static String mutationResult(List<?> list) {
    try {
      ((List) list).add(null);
      return "mutable";
    } catch (Throwable t) {
      return t.getClass().getSimpleName();
    }
  }
}
