package classes.modern_test;

import java.lang.reflect.AccessibleObject;
import java.lang.reflect.Field;

public class Java11AccessibleObjectNestAccess {
  static class NestPeer {
    private int privateField;
  }

  public static void main(String[] args) throws Exception {
    NestPeer peer = new NestPeer();
    Field privateField = NestPeer.class.getDeclaredField("privateField");
    System.out.println("nest-host="
        + Java11AccessibleObjectNestAccess.class.isNestmateOf(NestPeer.class));
    System.out.println("nest-private-self=" + privateField.canAccess(peer));
    System.out.println("nest-private-helper="
        + AccessibleObjectNestAccessCaller.canAccess(privateField, peer));
  }
}

class AccessibleObjectNestAccessCaller {
  static boolean canAccess(AccessibleObject object, Object receiver) {
    return object.canAccess(receiver);
  }
}
