package classes.modern_test;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.TimeUnit;

public class Java9CompletableFutureDefaultExecutor {
  public static void main(String[] args) throws Exception {
    Executor executor = new CompletableFuture<String>().defaultExecutor();
    System.out.println(executor.getClass().getName());
    System.out.println(executor == ForkJoinPool.commonPool());

    final String caller = Thread.currentThread().getName();
    CompletableFuture<String> ran = new CompletableFuture<String>();
    executor.execute(new Runnable() {
      public void run() {
        ran.complete(Thread.currentThread().getName().equals(caller) ? "same" : "different");
      }
    });
    System.out.println(ran.get(5, TimeUnit.SECONDS));
  }
}
