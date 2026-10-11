package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.invoke.MethodHandles;

/** Payload classes are separately compiled and available only as .bin resources. */
public class JavaClassDerivation {
  private static final String PARENT = "derivation.p.Parent";
  private static final String ROLE = "derivation.p.Role";
  private static final String PEER = "derivation.p.Peer";
  private static final String CHILD = "derivation.q.Child";
  private static final String HOST = "derivation.p.LookupHost";
  private static final String TARGET = "derivation.p.LookupTarget";
  private static int initializations;

  /** Called only by payload initializers, never while defining or linking. */
  public static int initialized(String name) {
    if (name == null) throw new AssertionError("Missing initializer identity");
    initializations++;
    return 1;
  }

  private static void require(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }

  private static void emit(String id, String event) {
    System.out.println(id + "=" + event);
  }

  private static byte[] read(String variant, String name) throws Exception {
    String resource = "/derivation-cases/" + variant + "/" + name.replace('.', '/') + ".bin";
    InputStream input = JavaClassDerivation.class.getResourceAsStream(resource);
    require(input != null, "Missing payload " + resource);
    try {
      ByteArrayOutputStream output = new ByteArrayOutputStream();
      byte[] buffer = new byte[1024];
      int length;
      while ((length = input.read(buffer)) != -1) output.write(buffer, 0, length);
      return output.toByteArray();
    } finally { input.close(); }
  }

  private static final class PayloadLoader extends ClassLoader {
    private final String[] names;
    private final String[] variants;

    PayloadLoader(ClassLoader parent, String[] names, String[] variants) {
      super(parent);
      require(names.length == variants.length, "Exact resource whitelist");
      this.names = names;
      this.variants = variants;
    }

    Class<?> define(String name, byte[] bytes) { return defineClass(name, bytes, 0, bytes.length); }
    Class<?> loaded(String name) { return findLoadedClass(name); }
    void link(Class<?> type) { resolveClass(type); }

    @Override protected synchronized Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
      Class<?> result = findLoadedClass(name);
      if (result == null) {
        int selected = -1;
        for (int index = 0; index < names.length; index++) {
          if (names[index].equals(name)) { selected = index; break; }
        }
        if (selected == -1) return super.loadClass(name, resolve);
        byte[] bytes;
        try { bytes = read(variants[selected], name); }
        catch (Exception failure) { throw new ClassNotFoundException(name, failure); }
        result = define(name, bytes);
      }
      if (resolve) resolveClass(result);
      return result;
    }
  }

  private static PayloadLoader loader(String parentVariant, String roleVariant) {
    return new PayloadLoader(JavaClassDerivation.class.getClassLoader(),
      new String[] {PARENT, ROLE, PEER, CHILD, HOST, TARGET},
      new String[] {parentVariant, roleVariant, "baseline", "baseline", "baseline", "baseline"});
  }

  private static void noInitialization(String id) {
    require(initializations == 0, id + ": defining or linking initialized a payload");
    emit(id, "no-initialization");
  }

  private static void expect(String id, String phase, String expected, Throwable failure) {
    String actual = failure == null ? "accepted" : failure.getClass().getName();
    require(expected.equals(actual), id + ": expected " + expected + "@" + phase + ", got " + actual);
    emit(id, actual + "@" + phase);
  }

  private static Throwable rejectedDefinition(PayloadLoader loader, String name, byte[] bytes) {
    try { loader.define(name, bytes); return null; }
    catch (Throwable failure) { return failure; }
  }

  private static void identity(Class<?> type, String name, PayloadLoader loader) {
    require(type.getName().equals(name), "Wrong class name");
    require(type.getClassLoader() == loader, "Wrong defining loader");
    require(loader.loaded(name) == type, "Published identity was not retained");
  }

  private static void named(String id, String name, boolean nullName) throws Exception {
    PayloadLoader loader = loader("baseline", "baseline");
    Class<?> type = loader.define(nullName ? null : name, read("baseline", name));
    identity(type, name, loader);
    require(type.isInterface() == name.equals(ROLE), "Wrong class/interface kind");
    emit(id, "accepted@define");
    loader.link(type);
    emit(id, "accepted@resolve");
    emit(id, "identity-preserved");
    noInitialization(id);
  }

  private static void wrongName(String id, String name) throws Exception {
    PayloadLoader loader = loader("baseline", "baseline");
    byte[] bytes = read("baseline", name);
    expect(id, "define", "java.lang.NoClassDefFoundError", rejectedDefinition(loader, name + "Wrong", bytes));
    require(loader.loaded(name) == null && loader.loaded(name + "Wrong") == null, "Wrong-name failure was published");
    emit(id, "not-published");
    Class<?> repaired = loader.define(name, bytes);
    identity(repaired, name, loader);
    loader.link(repaired);
    emit(id, "retry-accepted@resolve");
    noInitialization(id);
  }

  private static void duplicate(String id, String name, boolean firstNull, boolean secondNull) throws Exception {
    PayloadLoader loader = loader("baseline", "baseline");
    byte[] bytes = read("baseline", name);
    Class<?> first = loader.define(firstNull ? null : name, bytes);
    emit(id, "accepted@define");
    expect(id, "define", "java.lang.LinkageError", rejectedDefinition(loader, secondNull ? null : name, bytes));
    identity(first, name, loader);
    loader.link(first);
    emit(id, "identity-preserved");
    noInitialization(id);
  }

  private static void malformed(String id, String variant, String name, String error) throws Exception {
    PayloadLoader loader = loader("baseline", "baseline");
    expect(id, "define", error, rejectedDefinition(loader, name, read(variant, name)));
    require(loader.loaded(name) == null, "Rejected derivation was published");
    emit(id, "not-published");
    Class<?> repaired = loader.define(name, read("baseline", name));
    identity(repaired, name, loader);
    loader.link(repaired);
    emit(id, "retry-accepted@resolve");
    noInitialization(id);
  }

  private static void hierarchyFailure(String id, String parentVariant, String roleVariant, String error) throws Exception {
    PayloadLoader loader = loader(parentVariant, roleVariant);
    expect(id, "define", error, rejectedDefinition(loader, CHILD, read("baseline", CHILD)));
    require(loader.loaded(CHILD) == null, "Failed hierarchy child was published");
    emit(id, "not-published");
    // The bad parent may be published. Repair the independently compiled child,
    // not that parent's already-established identity.
    Class<?> repaired = loader.define(CHILD, read("repair", CHILD));
    identity(repaired, CHILD, loader);
    require(repaired.getSuperclass() == Object.class && repaired.getInterfaces().length == 0,
      "Repair must not rely on replacing a published parent");
    emit(id, "repaired@define");
    loader.link(repaired);
    emit(id, "repaired@resolve");
    noInitialization(id);
  }

  private static void packageAccess(String id, boolean role, boolean foreignLoader) throws Exception {
    PayloadLoader parent = loader(role ? "baseline" : "parent-package", role ? "role-package" : "baseline");
    PayloadLoader child = foreignLoader ? new PayloadLoader(parent,
      new String[] {PEER}, new String[] {"baseline"}) : parent;
    if (foreignLoader) {
      expect(id, "define", "java.lang.IllegalAccessError", rejectedDefinition(child, PEER, read("baseline", PEER)));
      require(child.loaded(PEER) == null, "Cross-loader inaccessible hierarchy was published");
      emit(id, "not-published");
    } else {
      Class<?> type = child.define(PEER, read("baseline", PEER));
      identity(type, PEER, child);
      require(type.getSuperclass().getClassLoader() == child && type.getInterfaces()[0].getClassLoader() == child,
        "Same-runtime-package control did not share its defining loader");
      emit(id, "accepted@define");
      child.link(type);
      emit(id, "accepted@resolve");
    }
    noInitialization(id);
  }

  private static void independent(String id) throws Exception {
    PayloadLoader left = loader("baseline", "baseline"), right = loader("baseline", "baseline");
    Class<?> lc = Class.forName(CHILD, false, left), rc = Class.forName(CHILD, false, right);
    Class<?> lp = lc.getSuperclass(), rp = rc.getSuperclass();
    Class<?> li = lc.getInterfaces()[0], ri = rc.getInterfaces()[0];
    require(lc != rc && lp != rp && li != ri, "Independent defining loaders must create independent identities");
    require(lc.getName().equals(rc.getName()) && lp.getName().equals(rp.getName()) && li.getName().equals(ri.getName()),
      "Identity control must use identical binary names");
    identity(lc, CHILD, left); identity(rc, CHILD, right);
    identity(lp, PARENT, left); identity(rp, PARENT, right);
    identity(li, ROLE, left); identity(ri, ROLE, right);
    require(lp.isAssignableFrom(lc) && li.isAssignableFrom(lc) && rp.isAssignableFrom(rc) && ri.isAssignableFrom(rc),
      "Own hierarchy assignability");
    require(!rp.isAssignableFrom(lc) && !ri.isAssignableFrom(lc) && !lp.isAssignableFrom(rc) && !li.isAssignableFrom(rc),
      "Cross-loader hierarchy assignability");
    emit(id, "class-interface-identities-distinct");
    left.link(lc); right.link(rc);
    noInitialization(id);
    Object value = lc.getDeclaredConstructor().newInstance();
    require(lc.isInstance(value) && lp.isInstance(value) && li.isInstance(value) && lp.cast(value) == value && li.cast(value) == value,
      "Own runtime instance/cast identity");
    require(!rc.isInstance(value) && !rp.isInstance(value) && !ri.isInstance(value), "Foreign runtime instance identity");
    try { ri.cast(value); throw new AssertionError("Foreign interface cast accepted"); }
    catch (ClassCastException expected) { /* exact checked rejection */ }
    rc.getDeclaredConstructor().newInstance();
    Class.forName(ROLE, true, left); Class.forName(ROLE, true, right);
    require(initializations == 6, "Two independent child/parent/interface initializations");
    emit(id, "instance-cast-identities-preserved");
    emit(id, "explicit-initializations=6");
  }

  private static void delegated(String id) throws Exception {
    PayloadLoader parent = loader("baseline", "baseline");
    PayloadLoader left = new PayloadLoader(parent, new String[] {CHILD}, new String[] {"baseline"});
    PayloadLoader right = new PayloadLoader(parent, new String[] {CHILD}, new String[] {"baseline"});
    Class<?> lc = Class.forName(CHILD, false, left), rc = Class.forName(CHILD, false, right);
    require(lc != rc && lc.getSuperclass() == rc.getSuperclass() && lc.getInterfaces()[0] == rc.getInterfaces()[0],
      "Delegation must retain shared parent and interface identities");
    require(lc.getSuperclass().getClassLoader() == parent && lc.getInterfaces()[0].getClassLoader() == parent,
      "Delegated defining loader");
    require(lc.getSuperclass().isAssignableFrom(rc) && lc.getInterfaces()[0].isAssignableFrom(rc), "Shared hierarchy assignability");
    left.link(lc); right.link(rc);
    emit(id, "shared-class-interface-identities");
    noInitialization(id);
  }

  private static void initiating(String id, String name) throws Exception {
    PayloadLoader parent = loader("baseline", "baseline");
    PayloadLoader child = new PayloadLoader(parent, new String[0], new String[0]);
    Class<?> type = Class.forName(name, false, child);
    require(type.getClassLoader() == parent && child.loaded(name) == type, "JVM initiation must be recorded");
    emit(id, "delegated-initiation-recorded");
    expect(id, "define", "java.lang.LinkageError", rejectedDefinition(child, name, read("baseline", name)));
    require(child.loaded(name) == type && parent.loaded(name) == type, "Duplicate must not change initiating identity");
    emit(id, "identity-preserved");
    noInitialization(id);
  }

  private static void lookup(String id, boolean invalid) throws Exception {
    PayloadLoader loader = loader("baseline", "baseline");
    Class<?> host = Class.forName(HOST, true, loader);
    MethodHandles.Lookup lookup = (MethodHandles.Lookup) host.getMethod("lookup").invoke(null);
    require(lookup.lookupClass() == host, "Lookup must originate in the same package and defining loader");
    Class<?> result = null;
    Throwable failure = null;
    try { result = lookup.defineClass(read(invalid ? "lookup-invalid" : "baseline", TARGET)); }
    catch (Throwable caught) { failure = caught; }
    expect(id, "lookup-define", invalid ? "java.lang.VerifyError" : "accepted", failure);
    Class<?> published = loader.loaded(TARGET);
    require(published != null, "Successful derivation is published before subsequent verification");
    identity(published, TARGET, loader);
    if (!invalid) require(result == published, "Lookup returned a different class identity");
    require(Class.forName(TARGET, false, loader) == published, "Uninitialized lookup must retain published identity");
    emit(id, "published-identity-preserved");
    expect(id, "duplicate-define", "java.lang.LinkageError", rejectedDefinition(loader, TARGET, read("baseline", TARGET)));
    require(loader.loaded(TARGET) == published, "Duplicate changed Lookup-defined identity");
    noInitialization(id);
  }

  private static void moduleDescriptor(String id) throws Exception {
    PayloadLoader loader = loader("baseline", "baseline");
    byte[] bytes = read("module-descriptor", "module-info");
    expect(id, "define", "java.lang.NoClassDefFoundError", rejectedDefinition(loader, null, bytes));
    require(loader.loaded("module-info") == null, "Module descriptor was published as a class");
    emit(id, "not-published");
    expect(id, "repeat-define", "java.lang.NoClassDefFoundError", rejectedDefinition(loader, null, bytes));
    noInitialization(id);
  }

  private static void passiveArray(String id, int rank) throws Exception {
    PayloadLoader loader = loader("baseline", "baseline");
    Class<?> host = Class.forName(HOST, true, loader);
    MethodHandles.Lookup lookup = (MethodHandles.Lookup) host.getMethod("lookup").invoke(null);
    require(lookup.lookupClass() == host, "Array control Lookup must use the payload's package and loader");
    Throwable failure = null;
    try { lookup.defineClass(read("lookup-invalid", TARGET)); }
    catch (Throwable caught) { failure = caught; }
    expect(id, "lookup-define", "java.lang.VerifyError", failure);
    Class<?> published = loader.loaded(TARGET);
    require(published != null, "Invalid component must already be published");
    identity(published, TARGET, loader);

    String arrayName = (rank == 1 ? "[L" : "[[L") + TARGET + ";";
    Class<?> array = Class.forName(arrayName, false, loader);
    require(array.isArray() && array.getName().equals(arrayName), "Passive array lookup returned the wrong class");
    emit(id, "forname-false-array-identity");
    require(Class.forName(arrayName, true, loader) == array, "Array initialization must not verify its component");
    emit(id, "forname-true-array-identity");
    require(array.getSuperclass() == Object.class && array.getClassLoader() == loader,
      "Array superclass or defining loader is incorrect");
    Class<?> component = array.getComponentType();
    if (rank == 1) require(component == published, "Rank-one component identity");
    else {
      require(component.isArray() && component == Class.forName("[L" + TARGET + ";", false, loader),
        "Rank-two immediate component identity");
      require(component.getComponentType() == published && component.getSuperclass() == Object.class &&
        component.getClassLoader() == loader, "Rank-two transitive component identity");
    }
    emit(id, "array-component-chain-and-loader");
    Object value = java.lang.reflect.Array.newInstance(component, 0);
    require(value.getClass() == array && java.lang.reflect.Array.getLength(value) == 0,
      "Array allocation must preserve its class without verifying or initializing the component");
    emit(id, "array-instance-identity");
    identity(published, TARGET, loader);
    emit(id, "published-component-retained");
    failure = null;
    // HotSpot may defer a repeated resolveClass verification request. An
    // initialization request is the explicit active-use boundary for this control.
    try { Class.forName(TARGET, true, loader); }
    catch (Throwable caught) { failure = caught; }
    expect(id, "component-initialize", "java.lang.VerifyError", failure);
    noInitialization(id);
  }

  private static void run(String id) throws Exception {
    initializations = 0;
    if (id.startsWith("named-")) {
      named(id, id.startsWith("named-interface-") ? ROLE : PARENT, id.endsWith("-null"));
    } else if (id.startsWith("wrong-name-")) {
      wrongName(id, id.endsWith("interface") ? ROLE : PARENT);
    } else if (id.startsWith("duplicate-")) {
      String[] parts = id.split("-");
      duplicate(id, parts[1].equals("interface") ? ROLE : PARENT, parts[2].equals("null"), parts[3].equals("null"));
    } else if (id.equals("malformed-magic-repair")) {
      malformed(id, "malformed-magic", PARENT, "java.lang.ClassFormatError");
    } else if (id.equals("malformed-truncation-repair")) {
      malformed(id, "malformed-truncation", PARENT, "java.lang.ClassFormatError");
    } else if (id.equals("super-kind-interface")) {
      hierarchyFailure(id, "parent-interface", "baseline", "java.lang.IncompatibleClassChangeError");
    } else if (id.equals("super-final")) {
      hierarchyFailure(id, "parent-final", "baseline", "java.lang.IncompatibleClassChangeError");
    } else if (id.equals("super-access-foreign-package")) {
      hierarchyFailure(id, "parent-package", "baseline", "java.lang.IllegalAccessError");
    } else if (id.equals("interface-kind-class")) {
      hierarchyFailure(id, "baseline", "role-class", "java.lang.IncompatibleClassChangeError");
    } else if (id.equals("interface-access-foreign-package")) {
      hierarchyFailure(id, "baseline", "role-package", "java.lang.IllegalAccessError");
    } else if (id.equals("super-access-same-loader")) {
      packageAccess(id, false, false);
    } else if (id.equals("interface-access-same-loader")) {
      packageAccess(id, true, false);
    } else if (id.equals("super-access-other-loader")) {
      packageAccess(id, false, true);
    } else if (id.equals("interface-access-other-loader")) {
      packageAccess(id, true, true);
    } else if (id.equals("identity-independent")) {
      independent(id);
    } else if (id.equals("identity-delegated")) {
      delegated(id);
    } else if (id.equals("initiating-duplicate-class")) {
      initiating(id, PARENT);
    } else if (id.equals("initiating-duplicate-interface")) {
      initiating(id, ROLE);
    } else if (id.equals("lookup-valid")) {
      lookup(id, false);
    } else if (id.equals("lookup-invalid-publication")) {
      lookup(id, true);
    } else if (id.equals("circular-super-repair")) {
      malformed(id, "circular-super", PARENT, "java.lang.ClassCircularityError");
    } else if (id.equals("circular-interface-repair")) {
      malformed(id, "circular-interface", ROLE, "java.lang.ClassCircularityError");
    } else if (id.equals("module-descriptor-not-class")) {
      moduleDescriptor(id);
    } else if (id.equals("passive-array-rank1")) {
      passiveArray(id, 1);
    } else if (id.equals("passive-array-rank2")) {
      passiveArray(id, 2);
    } else throw new AssertionError("Unknown mandatory scenario " + id);
  }

  public static void main(String[] args) throws Exception {
    require(args.length == 36, "Complete 36-case manifest required");
    for (String id : args) run(id);
    System.out.println("CLASS_DERIVATION_OK");
  }
}
