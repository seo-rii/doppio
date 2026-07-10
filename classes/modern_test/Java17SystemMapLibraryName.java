package classes.modern_test;

public class Java17SystemMapLibraryName {
  public static void main(String[] args) {
    System.out.println("zip:" + System.mapLibraryName("zip"));
    System.out.println("empty:" + System.mapLibraryName(""));
    System.out.println("hyphen:" + System.mapLibraryName("kotlin-daemon"));
    printFailure("null", new Throwing() {
      public void run() {
        System.mapLibraryName(null);
      }
    });
  }

  private static void printFailure(String label, Throwing action) {
    try {
      action.run();
      System.out.println(label + ":ok");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private interface Throwing {
    void run();
  }
}
