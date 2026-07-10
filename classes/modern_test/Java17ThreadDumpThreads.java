package classes.modern_test;

import java.util.Map;

public class Java17ThreadDumpThreads {
  public static void main(String[] args) throws Exception {
    Thread current = Thread.currentThread();
    Map<Thread, StackTraceElement[]> traces = Thread.getAllStackTraces();
    StackTraceElement[] currentStack = traces.get(current);
    System.out.println("contains-current:" + traces.containsKey(current));
    System.out.println("current-stack-present:" + (currentStack != null));
    System.out.println("current-stack-positive:" + (currentStack != null && currentStack.length > 0));
    System.out.println("current-stack-has-main:" + hasMethod(currentStack, "main"));

    StackTraceElement[] directStack = current.getStackTrace();
    System.out.println("direct-stack-positive:" + (directStack.length > 0));
    System.out.println("direct-stack-has-main:" + hasMethod(directStack, "main"));

    final Object lock = new Object();
    final boolean[] workerWaiting = new boolean[1];
    Thread worker = new Thread(new Runnable() {
      public void run() {
        synchronized (lock) {
          workerWaiting[0] = true;
          lock.notifyAll();
          try {
            lock.wait(1000);
          } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
          }
        }
      }
    }, "doppio-dump-worker");

    worker.start();
    synchronized (lock) {
      while (!workerWaiting[0]) {
        lock.wait(10);
      }
      StackTraceElement[] workerStack = worker.getStackTrace();
      System.out.println("worker-alive:" + worker.isAlive());
      System.out.println("worker-stack-present:" + (workerStack != null));
      System.out.println("worker-stack-positive:" + (workerStack.length > 0));
      lock.notifyAll();
    }
    worker.join();
    System.out.println("worker-done:" + !worker.isAlive());
  }

  private static boolean hasMethod(StackTraceElement[] stack, String methodName) {
    if (stack == null) {
      return false;
    }
    for (StackTraceElement element : stack) {
      if (methodName.equals(element.getMethodName())) {
        return true;
      }
    }
    return false;
  }
}
