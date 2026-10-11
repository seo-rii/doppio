package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.InvocationTargetException;
import java.util.HashMap;

/** Genuine separately loaded classes, without payload .class files on the classpath. */
public class JavaLoadingConstraints {
  private static final String PREFIX = "constraints.";
  private static final String TOKEN = PREFIX + "Token";
  private static int tokenLoads;
  private static int tokenInitializations;
  private static int effects;
  private static boolean nativeOracle;

  public static void tokenInitialized() { tokenInitializations++; }
  public static void effect() { effects++; }

  private static void require(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }

  private static void emit(String id, String event) { System.out.println(id + "=" + event); }

  private static byte[] read(String name) throws Exception {
    InputStream input = JavaLoadingConstraints.class.getResourceAsStream(
      "/loading-constraint-cases/" + name.replace('.', '/') + ".bin");
    require(input != null, "Missing genuine payload " + name);
    try {
      ByteArrayOutputStream output = new ByteArrayOutputStream();
      byte[] buffer = new byte[1024];
      int length;
      while ((length = input.read(buffer)) != -1) output.write(buffer, 0, length);
      return output.toByteArray();
    } finally { input.close(); }
  }

  private static final class PayloadLoader extends ClassLoader {
    private final String[] owned;
    private final HashMap<String, PayloadLoader> delegates = new HashMap<String, PayloadLoader>();

    PayloadLoader(String... owned) {
      super(JavaLoadingConstraints.class.getClassLoader());
      this.owned = owned;
    }

    void route(String name, PayloadLoader target) { delegates.put(name, target); }
    Class<?> loaded(String name) { return findLoadedClass(name); }
    Class<?> defineToken() throws Exception {
      byte[] bytes = read(TOKEN);
      return defineClass(TOKEN, bytes, 0, bytes.length);
    }

    @Override protected synchronized Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
      if (name.equals(TOKEN)) tokenLoads++;
      Class<?> result = findLoadedClass(name);
      if (result == null) {
        PayloadLoader delegate = delegates.get(name);
        if (delegate != null) result = delegate.loadClass(name);
        else {
          boolean permitted = false;
          for (String candidate : owned) if (candidate.equals(name)) { permitted = true; break; }
          if (!permitted) return super.loadClass(name, resolve);
          byte[] bytes;
          try { bytes = read(name); }
          catch (Exception failure) { throw new ClassNotFoundException(name, failure); }
          result = defineClass(name, bytes, 0, bytes.length);
        }
      }
      if (resolve) resolveClass(result);
      return result;
    }
  }

  private static void expect(String id, String phase, String expected, Throwable failure) {
    String actual = failure == null ? "accepted" : failure.getClass().getName();
    require(expected.equals(actual), id + ": expected " + expected + "@" + phase + ", got " + actual);
    emit(id, actual + "@" + phase);
  }

  private static Throwable prepare(String name, PayloadLoader loader) {
    try { Class.forName(name, true, loader); return null; }
    catch (Throwable failure) { return failure; }
  }

  private static Throwable invoke(String name, PayloadLoader loader) {
    try {
      Class.forName(name, true, loader).getMethod("run").invoke(null);
      return null;
    } catch (InvocationTargetException failure) { return failure.getCause(); }
    catch (Throwable failure) { return failure; }
  }

  private static Class<?> token(PayloadLoader loader) throws Exception {
    return Class.forName(TOKEN, false, loader);
  }

  private static void uninitialized(String id) {
    require(tokenInitializations == 0, "Loading constraints must not initialize Token");
    emit(id, "token-not-initialized");
  }

  private static void noEager(String id, PayloadLoader... loaders) {
    require(tokenLoads == 0, "Constraint imposition eagerly requested Token");
    for (PayloadLoader loader : loaders) require(loader.loaded(TOKEN) == null, "Constraint imposition eagerly defined Token");
    emit(id, "token-loads=0");
  }

  /** Rule 2: selected inherited Base method owner, not the new child owner. */
  private static void inherited(String id, String shape, boolean shared) throws Exception {
    String base = PREFIX + shape + "BaseA", iface = PREFIX + shape + "InterfaceB", bridge = PREFIX + shape + "BridgeC";
    PayloadLoader a = new PayloadLoader(TOKEN, base), b = new PayloadLoader(TOKEN, iface), c = new PayloadLoader(TOKEN, bridge);
    c.route(base, a); c.route(iface, b);
    if (shared) b.route(TOKEN, a);
    else c.route(TOKEN, b);
    Class<?> ta = token(a), tb = token(b), tc = token(c);
    require(shared ? ta == tb && tc != ta : ta != tb && tc == tb, "Three-loader Token identity precondition");
    emit(id, shared ? "base-interface-token-shared-child-distinct" : "base-token-distinct-child-interface-shared");
    // The pinned native implementation differs from the stated JVMS Rule 2
    // for this one abstract-owner boundary. The harness binds the host profile;
    // guest executions must still enforce the normative abstract-owner edge.
    String expected = shared || (nativeOracle && shape.equals("Abstract")) ? "accepted" : "java.lang.LinkageError";
    expect(id, "prepare", expected, prepare(bridge, c));
    if (shape.equals("Abstract")) {
      Class<?> published = c.loaded(bridge);
      require(published != null && published.getClassLoader() == c && published.getName().equals(bridge),
        "Preparation outcome must retain the successfully derived abstract bridge identity");
      emit(id, "abstract-bridge-published");
      require(effects == (expected.equals("accepted") ? 1 : 0), "Abstract bridge initialization phase differs from its preparation outcome");
      emit(id, "abstract-bridge-initializations=" + effects);
    }
    uninitialized(id);
  }

  private static void direct(String id, String shape, boolean shared, boolean constrains) throws Exception {
    String base = PREFIX + shape + "BaseA", child = PREFIX + shape + "ChildB";
    PayloadLoader a = new PayloadLoader(TOKEN, base), b = new PayloadLoader(TOKEN, child);
    b.route(base, a);
    if (shared) b.route(TOKEN, a);
    Class<?> ta = token(a), tb = token(b);
    require((ta == tb) == shared, "Direct-method Token identity precondition");
    emit(id, shared ? "token-shared" : "token-distinct");
    expect(id, "prepare", constrains && !shared ? "java.lang.LinkageError" : "accepted", prepare(child, b));
    uninitialized(id);
  }

  /** Resolution uses the actual inherited declaration owner A, not symbolic B. */
  private static void member(String id, String shape, boolean shared) throws Exception {
    String base = PREFIX + shape + "BaseA", sub = PREFIX + shape + "SubB", caller = PREFIX + shape + "CallerC";
    PayloadLoader a = new PayloadLoader(TOKEN, base), b = new PayloadLoader(TOKEN, sub), c = new PayloadLoader(TOKEN, caller);
    b.route(base, a); c.route(sub, b);
    if (shared) c.route(TOKEN, a);
    else b.route(TOKEN, a);
    Class<?> ta = token(a), tb = token(b), tc = token(c);
    require(shared ? tc == ta && tb != ta : tc != ta && tb == ta, "Actual declaration Token identity precondition");
    emit(id, shared ? "caller-declaration-token-shared-symbolic-distinct" : "caller-token-distinct-symbolic-declaration-shared");
    expect(id, "invoke", shared ? (shape.equals("Interface") ? "java.lang.NullPointerException" : "accepted") :
      "java.lang.LinkageError", invoke(caller, c));
    // Field-owner initializer timing is outside this loading-constraint gate.
    if (!shape.equals("Field")) {
      require(effects == (shared && shape.equals("Static") ? 1 : 0), "Resolution failure must precede target method execution");
      emit(id, "target-effects=" + effects);
    }
    uninitialized(id);
  }

  private static void late(String id, String shape, boolean member, boolean direct) throws Exception {
    String base = PREFIX + shape + "BaseA";
    String middle = PREFIX + shape + (member ? "SubB" : direct ? "ChildB" : "InterfaceB");
    String entry = PREFIX + shape + (member ? "CallerC" : "BridgeC");
    PayloadLoader a = new PayloadLoader(TOKEN, base), b = new PayloadLoader(TOKEN, middle),
      c = direct ? new PayloadLoader(TOKEN) : new PayloadLoader(TOKEN, entry);
    if (member || direct) b.route(base, a);
    if (member) c.route(middle, b);
    else if (!direct) { c.route(base, a); c.route(middle, b); }
    PayloadLoader second = member ? c : b;
    Throwable imposed = direct ? prepare(middle, b) : member ? invoke(entry, c) : prepare(entry, c);
    expect(id, "impose", member && shape.equals("Interface") ? "java.lang.NullPointerException" : "accepted", imposed);
    noEager(id, a, b, c);
    Class<?> anchor = token(a);
    emit(id, "first-token-recorded");
    Throwable failure = null;
    try { second.defineToken(); }
    catch (Throwable caught) { failure = caught; }
    expect(id, "late-define", "java.lang.LinkageError", failure);
    require(second.loaded(TOKEN) == null, "Failed late Token record was published");
    emit(id, "failed-token-not-published");
    second.route(TOKEN, a);
    require(token(second) == anchor && second.loaded(TOKEN) == anchor, "Corrected delegation must retain the first identity");
    require((member ? b : c).loaded(TOKEN) == null, "Unrelated symbolic or child loader must remain unconstrained and unloaded");
    emit(id, "corrected-delegation-accepted");
    uninitialized(id);
  }

  private static void rollback(String id) throws Exception {
    String baseA = PREFIX + "ScalarBaseA", ifaceB = PREFIX + "ScalarInterfaceB", bridgeAB = PREFIX + "ScalarBridgeC";
    String baseB = PREFIX + "SecondBaseB", ifaceC = PREFIX + "SecondInterfaceC", bridgeBC = PREFIX + "SecondBridgeA";
    PayloadLoader a = new PayloadLoader(TOKEN, baseA, bridgeBC), b = new PayloadLoader(TOKEN, ifaceB, baseB),
      c = new PayloadLoader(TOKEN, bridgeAB, ifaceC);
    c.route(baseA, a); c.route(ifaceB, b); a.route(baseB, b); a.route(ifaceC, c);
    Class<?> ta = token(a), tc = token(c);
    require(ta != tc && b.loaded(TOKEN) == null, "Rollback starts with distinct endpoint identities and an unbound middle");
    int before = tokenLoads;
    expect(id, "first-edge", "accepted", prepare(bridgeAB, c));
    require(tokenLoads == before && b.loaded(TOKEN) == null, "First edge must not eagerly bind middle loader");
    emit(id, "middle-token-not-loaded");
    expect(id, "conflicting-edge", "java.lang.LinkageError", prepare(bridgeBC, a));
    b.route(TOKEN, a);
    require(token(b) == ta && token(c) == tc && ta != tc, "Failed edge must roll back without poisoning existing identities");
    emit(id, "failed-edge-rolled-back");
    uninitialized(id);
  }

  private static void run(String id) throws Exception {
    tokenLoads = tokenInitializations = effects = 0;
    String[] parts = id.split("-");
    if (id.startsWith("inherited-")) {
      String shape = parts[1].equals("abstract") ? "Abstract" : "Scalar";
      inherited(id, shape, parts[2].equals("shared"));
    } else if (id.startsWith("array1-")) inherited(id, "ArrayOne", parts[1].equals("shared"));
    else if (id.startsWith("array2-")) inherited(id, "ArrayTwo", parts[1].equals("shared"));
    else if (id.startsWith("return-")) inherited(id, "ReturnOnly", parts[1].equals("shared"));
    else if (id.equals("override-shared")) direct(id, "Override", true, true);
    else if (id.equals("override-distinct")) direct(id, "Override", false, true);
    else if (id.equals("private-not-override")) direct(id, "Private", false, false);
    else if (id.equals("static-not-override")) direct(id, "Hiding", false, false);
    else if (id.equals("runtime-package-not-override")) direct(id, "Package", false, false);
    else if (id.equals("primitive-array-unconstrained")) direct(id, "Primitive", false, false);
    else if (id.startsWith("field-")) member(id, "Field", parts[1].equals("shared"));
    else if (id.startsWith("static-")) member(id, "Static", parts[1].equals("shared"));
    else if (id.startsWith("interface-")) member(id, "Interface", parts[1].equals("shared"));
    else if (id.equals("late-scalar")) late(id, "Scalar", false, false);
    else if (id.equals("late-array1")) late(id, "ArrayOne", false, false);
    else if (id.equals("late-array2")) late(id, "ArrayTwo", false, false);
    else if (id.equals("late-return")) late(id, "ReturnOnly", false, false);
    else if (id.equals("late-override")) late(id, "Override", false, true);
    else if (id.equals("late-field")) late(id, "Field", true, false);
    else if (id.equals("late-static")) late(id, "Static", true, false);
    else if (id.equals("late-interface")) late(id, "Interface", true, false);
    else if (id.equals("failed-edge-rollback")) rollback(id);
    else throw new AssertionError("Unknown mandatory loading-constraint case " + id);
  }

  public static void main(String[] args) throws Exception {
    require(args.length == 32, "Explicit host profile and complete 31-case loading-constraint manifest required");
    require(args[0].equals("pinned-native") || args[0].equals("jvms"), "Unknown loading-constraint expectation profile");
    nativeOracle = args[0].equals("pinned-native");
    for (int index = 1; index < args.length; index++) run(args[index]);
    System.out.println("LOADING_CONSTRAINTS_OK");
  }
}
