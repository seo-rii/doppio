package classes.modern_test;

/** Selected genuine final Java 25 unnamed-resource declarations and exact suppression identities. */
public final class JavaFinalResources {
  private static final StringBuilder ORDER = new StringBuilder();
  private static int closes;

  private static void check(boolean condition) {
    if (!condition) throw new AssertionError("Final resource probe failed");
  }

  private static void mark(String value) {
    if (ORDER.length() != 0) ORDER.append(',');
    ORDER.append(value);
  }

  private static void resourceMark(String name, String suffix) {
    if (ORDER.length() != 0) ORDER.append(',');
    ORDER.append(name).append(suffix);
  }

  private static void reset() { ORDER.setLength(0); closes = 0; }

  private static void emit(String id, String value) {
    System.out.print(id);
    System.out.print('=');
    System.out.println(value);
  }

  private static void emitOrder(String id, String expected) {
    check(ORDER.toString().equals(expected));
    emit(id, new StringBuilder().append("order=").append(ORDER).toString());
  }

  private static boolean same(Throwable actual, Throwable expected) { return actual == expected; }

  private static void expectSuppressed(Throwable primary, Throwable[] expected) {
    Throwable[] actual = primary.getSuppressed();
    check(actual.length == expected.length);
    for (int i = 0; i < actual.length; i++) check(same(actual[i], expected[i]));
  }

  private static final class Resource implements AutoCloseable {
    private final String name;
    private final Exception failure;

    Resource(String name, Exception failure) { this.name = name; this.failure = failure; }

    @Override public void close() throws Exception {
      resourceMark(name, "-");
      closes++;
      if (failure != null) throw failure;
    }
  }

  private static Resource open(String name, Exception closeFailure, Exception acquireFailure) throws Exception {
    resourceMark(name, acquireFailure == null ? "+" : "+!");
    if (acquireFailure != null) throw acquireFailure;
    return new Resource(name, closeFailure);
  }

  private static Resource nullResource() {
    mark("N=null");
    return null;
  }

  private static void caseBodyPrimary() {
    reset();
    Exception original = new Exception("body");
    Exception closeL = new Exception("left close");
    Exception closeR = new Exception("right close");
    Throwable actual = null;
    try (Resource _ = open("L", closeL, null); var _ = open("R", closeR, null)) {
      mark("body!");
      throw original;
    } catch (Throwable caught) { actual = caught; }
    check(same(actual, original));
    expectSuppressed(actual, new Throwable[] {closeR, closeL});
    check(closes == 2);
    emitOrder("fr-body-primary", "L+,R+,body!,R-,L-");
    emit("fr-body-primary", "primary=same");
    emit("fr-body-primary", "suppressed=R:same,L:same");
  }

  private static void caseClosePrimary() {
    reset();
    Exception closeL = new Exception("left close");
    Exception closeR = new Exception("right close");
    Throwable actual = null;
    try (Resource _ = open("L", closeL, null); var _ = open("R", closeR, null)) {
      mark("body");
    } catch (Throwable caught) { actual = caught; }
    check(same(actual, closeR));
    expectSuppressed(actual, new Throwable[] {closeL});
    check(closes == 2);
    emitOrder("fr-close-primary", "L+,R+,body,R-,L-");
    emit("fr-close-primary", "primary=same");
    emit("fr-close-primary", "suppressed=L:same");
  }

  private static void caseSecondAcquireThrow() {
    reset();
    Exception original = new Exception("second acquisition");
    Exception closeL = new Exception("left close");
    Throwable actual = null;
    try (Resource _ = open("L", closeL, null); var _ = open("R", null, original)) {
      mark("body");
    } catch (Throwable caught) { actual = caught; }
    check(same(actual, original));
    expectSuppressed(actual, new Throwable[] {closeL});
    check(closes == 1);
    emitOrder("fr-second-acquire-throw", "L+,R+!,L-");
    emit("fr-second-acquire-throw", "primary=same");
    emit("fr-second-acquire-throw", "suppressed=L:same");
  }

  private static void caseNullResource() {
    reset();
    Throwable actual = null;
    try (Resource _ = nullResource(); var _ = open("R", null, null)) {
      mark("body");
    } catch (Throwable caught) { actual = caught; }
    check(actual == null && closes == 1);
    emitOrder("fr-null-resource", "N=null,R+,body,R-");
    emit("fr-null-resource", "completion=normal");
    emit("fr-null-resource", new StringBuilder().append("closes=").append(closes).toString());
  }

  private static void caseExtendedCatchFinally() {
    reset();
    Exception original = new Exception("extended body");
    Exception closeL = new Exception("left close");
    Exception closeR = new Exception("right close");
    Throwable actual = null;
    try {
      try (Resource _ = open("L", closeL, null); var _ = open("R", closeR, null)) {
        mark("body!");
        throw original;
      } catch (Throwable caught) {
        mark("catch");
        check(same(caught, original));
        expectSuppressed(caught, new Throwable[] {closeR, closeL});
        throw caught;
      } finally {
        mark("finally");
      }
    } catch (Throwable caught) {
      mark("outer-catch");
      actual = caught;
    }
    check(same(actual, original));
    expectSuppressed(actual, new Throwable[] {closeR, closeL});
    check(closes == 2);
    emitOrder("fr-extended-catch-finally", "L+,R+,body!,R-,L-,catch,finally,outer-catch");
    emit("fr-extended-catch-finally", "primary=same");
    emit("fr-extended-catch-finally", "suppressed=R:same,L:same");
  }

  private static void caseFirstAcquireThrow() {
    reset();
    Exception original = new Exception("first acquisition");
    Exception closeL = new Exception("unacquired left close");
    Throwable actual = null;
    try (Resource _ = open("L", closeL, original); var _ = open("R", null, null)) {
      mark("body");
    } catch (Throwable caught) { actual = caught; }
    check(same(actual, original));
    expectSuppressed(actual, new Throwable[0]);
    check(closes == 0);
    emitOrder("fr-first-acquire-throw", "L+!");
    emit("fr-first-acquire-throw", "primary=same");
    emit("fr-first-acquire-throw", "suppressed=none");
  }

  public static void main(String[] args) {
    caseBodyPrimary();
    caseClosePrimary();
    caseSecondAcquireThrow();
    caseNullResource();
    caseExtendedCatchFinally();
    caseFirstAcquireThrow();
    System.out.println("FINAL_RESOURCES_OK");
  }
}
