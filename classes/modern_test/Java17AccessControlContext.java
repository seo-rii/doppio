package classes.modern_test;

import java.lang.reflect.Method;
import java.security.AccessControlContext;
import java.security.AccessController;
import java.security.PrivilegedAction;

public class Java17AccessControlContext {
  public static void main(String[] args) throws Exception {
    AccessControlContext mainContext = AccessController.getContext();
    Object inheritedContext = invokeInheritedContext();
    System.out.println("main-context:" + (mainContext != null));
    System.out.println("inherited-native-accessible:" + (inheritedContext == null || inheritedContext instanceof AccessControlContext));
    System.out.println("do-privileged:" + AccessController.doPrivileged(new PrivilegedAction<String>() {
      public String run() {
        return "privileged";
      }
    }));
    System.out.println("do-privileged-combiner:" + AccessController.doPrivilegedWithCombiner(new PrivilegedAction<String>() {
      public String run() {
        return "combiner";
      }
    }));

    final boolean[] childContext = new boolean[1];
    final Object[] childInheritedContext = new Object[1];
    final Throwable[] childError = new Throwable[1];
    Thread child = new Thread(new Runnable() {
      public void run() {
        try {
          childContext[0] = AccessController.getContext() != null;
          childInheritedContext[0] = invokeInheritedContext();
        } catch (Throwable t) {
          childError[0] = t;
        }
      }
    });
    child.start();
    child.join();
    if (childError[0] != null) {
      throw new RuntimeException(childError[0]);
    }
    System.out.println("child-context:" + childContext[0]);
    System.out.println("child-inherited-context:" + (childInheritedContext[0] instanceof AccessControlContext));
  }

  private static Object invokeInheritedContext() throws Exception {
    Method method = AccessController.class.getDeclaredMethod("getInheritedAccessControlContext");
    method.setAccessible(true);
    return method.invoke(null);
  }
}
