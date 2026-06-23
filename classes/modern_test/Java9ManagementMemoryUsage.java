package classes.modern_test;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;

public class Java9ManagementMemoryUsage {
  public static void main(String[] args) {
    MemoryMXBean memory = ManagementFactory.getMemoryMXBean();
    MemoryUsage heap = memory.getHeapMemoryUsage();
    MemoryUsage nonHeap = memory.getNonHeapMemoryUsage();

    System.out.println(heap != null);
    System.out.println(nonHeap != null);
    System.out.println(validUsage(heap));
    System.out.println(validUsage(nonHeap));
    System.out.println(heap.getCommitted() >= heap.getUsed());
    System.out.println(nonHeap.getCommitted() >= nonHeap.getUsed());
    System.out.println(heap.getMax() == -1 || heap.getMax() >= heap.getCommitted());
    System.out.println(nonHeap.getMax() == -1 || nonHeap.getMax() >= nonHeap.getCommitted());
    System.out.println(heap.toString().contains("init = "));
    System.out.println(heap.toString().contains("used = "));
    System.out.println(nonHeap.toString().contains("committed = "));
    System.out.println(nonHeap.toString().contains("max = "));
  }

  private static boolean validUsage(MemoryUsage usage) {
    return usage.getInit() >= -1
        && usage.getUsed() >= 0
        && usage.getCommitted() >= 0
        && usage.getMax() >= -1;
  }
}
