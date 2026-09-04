package classes.test;

/*
 * Check that our monitors obey Mesa semantics -- lock is not released
 * immediately upon invocation of notify(), but rather when the notifying thread
 * has reached the end of the synchronized block.
 */
class MesaTest {

  static Object obj = new Object();
  static boolean fooWaiting = false;
  static boolean fooNotified = false;

  static class Foo implements Runnable {
    Thread thread;

    Foo() {
      thread = new Thread(this, "Foo-Thread");
      thread.start();
    }

    public void run() {
      synchronized(obj) {
        System.out.println("1: Running " + thread.getName());
        fooWaiting = true;
        obj.notifyAll();
        while (!fooNotified) {
          try {
            obj.wait();
          }
          catch (InterruptedException e) {}
        }
        System.out.println("4: Finishing " + thread.getName());
      }
    }
  }

  static class Bar implements Runnable {
    Thread thread;

    Bar() {
      thread = new Thread(this, "Bar-Thread");
      thread.start();
    }

    public void run() {
      synchronized(obj) {
        System.out.println("2: Running " + thread.getName());
        fooNotified = true;
        obj.notify();
        System.out.println("3: Finishing " + thread.getName());
      }
    }
  }

  public static void main(String[] args) throws InterruptedException {
    new Foo();
    synchronized(obj) {
      while (!fooWaiting) {
        obj.wait();
      }
    }
    new Bar();
  }

}
