package java.lang.ref;

import java.util.concurrent.ThreadFactory;

public final class Cleaner {
  private Cleaner() {}

  public static Cleaner create() {
    return new Cleaner();
  }

  public static Cleaner create(ThreadFactory threadFactory) {
    if (threadFactory == null) {
      throw new NullPointerException();
    }
    Thread thread = threadFactory.newThread(new Runnable() {
      public void run() {}
    });
    thread.setDaemon(true);
    return new Cleaner();
  }

  public Cleanable register(Object obj, Runnable action) {
    if (obj == null || action == null) {
      throw new NullPointerException();
    }
    return new CleanableImpl(action);
  }

  public static interface Cleanable {
    public void clean();
  }

  private static final class CleanableImpl implements Cleanable {
    private Runnable action;

    private CleanableImpl(Runnable action) {
      this.action = action;
    }

    public void clean() {
      Runnable current = action;
      if (current != null) {
        action = null;
        current.run();
      }
    }
  }
}
