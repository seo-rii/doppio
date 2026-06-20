package classes.modern_test;

import java.lang.invoke.MethodHandles;

public class Java17MethodHandlesLookupModes {
  public static void main(String[] args) throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandles.Lookup privateLookup =
        MethodHandles.privateLookupIn(Java17MethodHandlesLookupModes.class, lookup);
    MethodHandles.Lookup publicLookup = MethodHandles.publicLookup();

    print("lookup", lookup);
    print("private", privateLookup);
    print("drop-private", lookup.dropLookupMode(MethodHandles.Lookup.PRIVATE));
    print("drop-protected", lookup.dropLookupMode(MethodHandles.Lookup.PROTECTED));
    print("drop-package", lookup.dropLookupMode(MethodHandles.Lookup.PACKAGE));
    print("drop-public", lookup.dropLookupMode(MethodHandles.Lookup.PUBLIC));
    print("drop-module-int", lookup.dropLookupMode(16));
    print("drop-unconditional-int", lookup.dropLookupMode(32));
    System.out.println(publicLookup.dropLookupMode(MethodHandles.Lookup.PRIVATE) == publicLookup);
    System.out.println(publicLookup.dropLookupMode(MethodHandles.Lookup.PUBLIC) == publicLookup);

    printFailure("drop-zero", new Runnable() {
      public void run() {
        lookup.dropLookupMode(0);
      }
    });
    printFailure("drop-combo", new Runnable() {
      public void run() {
        lookup.dropLookupMode(MethodHandles.Lookup.PRIVATE | MethodHandles.Lookup.PACKAGE);
      }
    });
    printFailure("drop-invalid", new Runnable() {
      public void run() {
        lookup.dropLookupMode(128);
      }
    });
  }

  private static void print(String label, MethodHandles.Lookup lookup) {
    int modes = lookup.lookupModes();
    System.out.println(label + ":" +
        lookup.lookupClass().getName() + ":" +
        (lookup.previousLookupClass() == null) + ":" +
        lookup.hasFullPrivilegeAccess() + ":" +
        hasMode(modes, MethodHandles.Lookup.PUBLIC) + ":" +
        hasMode(modes, MethodHandles.Lookup.PRIVATE) + ":" +
        hasMode(modes, MethodHandles.Lookup.PROTECTED) + ":" +
        hasMode(modes, MethodHandles.Lookup.PACKAGE));
  }

  private static boolean hasMode(int modes, int mode) {
    return (modes & mode) != 0;
  }

  private static void printFailure(String label, Runnable runnable) {
    try {
      runnable.run();
      System.out.println(label + ":none");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getSimpleName());
    }
  }
}
