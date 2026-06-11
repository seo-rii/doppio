package classes.modern_test;

import java.lang.ref.Reference;
import java.lang.ref.WeakReference;

public class Java9ReferenceReachabilityFence {
  public static void main(String[] args) {
    Holder holder = new Holder(7);
    WeakReference<Holder> weak = new WeakReference<>(holder);
    Reference.reachabilityFence(holder);
    System.out.println(holder.value);
    System.out.println(weak.get() == holder);

    Reference.reachabilityFence(null);
    Reference.reachabilityFence("literal");
    System.out.println("done");
  }

  private static final class Holder {
    final int value;

    Holder(int value) {
      this.value = value;
    }
  }
}
