package classes.modern_test;

import java.lang.ref.Cleaner;
import java.util.concurrent.ThreadFactory;

public class Java9Cleaner {
  public static void main(String[] args) {
    try {
      Cleaner.create(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Cleaner cleaner = Cleaner.create();
    try {
      cleaner.register(null, new Runnable() {
        public void run() {}
      });
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      cleaner.register(new Object(), null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    final int[] count = { 0 };
    Cleaner.Cleanable cleanable = cleaner.register(new Object(), new Runnable() {
      public void run() {
        count[0]++;
      }
    });
    System.out.println(count[0]);
    cleanable.clean();
    System.out.println(count[0]);
    cleanable.clean();
    System.out.println(count[0]);

    final int[] factoryCalls = { 0 };
    Cleaner withFactory = Cleaner.create(new ThreadFactory() {
      public Thread newThread(Runnable runnable) {
        factoryCalls[0]++;
        System.out.println(runnable != null);
        return new Thread(runnable);
      }
    });
    System.out.println(factoryCalls[0]);
    try {
      Cleaner.create(new ThreadFactory() {
        public Thread newThread(Runnable runnable) {
          return null;
        }
      });
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Cleaner.Cleanable factoryCleanable = withFactory.register(new Object(), new Runnable() {
      public void run() {
        count[0] += 10;
      }
    });
    factoryCleanable.clean();
    System.out.println(count[0]);
  }
}
