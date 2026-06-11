package classes.modern_test;

import java.util.concurrent.CompletableFuture;

public class Java9CompletableFutureNewIncomplete {
  public static void main(String[] args) {
    CompletableFuture<String> source = new CompletableFuture<String>();
    CompletableFuture<Integer> created = source.newIncompleteFuture();
    System.out.println(created.getClass().getName());
    System.out.println(created.isDone());
    System.out.println(source.isDone());
    System.out.println(created.complete(7));
    System.out.println(created.join());
    System.out.println(source.isDone());

    CompletableFuture<Integer> completedSource = CompletableFuture.completedFuture(1);
    CompletableFuture<String> second = completedSource.newIncompleteFuture();
    System.out.println(second.isDone());
    System.out.println(second.complete("fresh"));
    System.out.println(second.join());
  }
}
