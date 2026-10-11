package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Modifier;

/** Genuine compiler bytes, selected parent evolution, and resource-only loaders. */
public class JavaSealedLoading {
  private static final String PREFIX = "sealedloader.";
  private static final String BASE = "sealedloader.p.Base";
  private static final String CHILD = "sealedloader.p.Child";
  private static final String INTERFACE = "sealedloader.p.I";
  private static final String IMPL = "sealedloader.p.Impl";
  private static final String[] IDS = {
    "sl-class-control", "sl-interface-control", "sl-class-permitted", "sl-interface-permitted",
    "sl-subinterface-permitted", "sl-class-unlisted", "sl-interface-unlisted", "sl-subinterface-unlisted",
    "sl-class-loader-split", "sl-interface-loader-split", "sl-loader-delegation",
    "sl-class-unseal-owner", "sl-interface-unseal-owner", "sl-public-crosspackage-class",
    "sl-public-crosspackage-interface", "sl-nonpublic-crosspackage-class", "sl-nonpublic-crosspackage-interface",
    "sl-nonpublic-samepackage-class", "sl-nonpublic-samepackage-interface", "sl-foreign-parent-identity"
  };
  private static String current;
  private static int initializationCount;

  public static void noteInitialization() { initializationCount++; }
  private static void require(boolean value) { if (!value) throw new AssertionError(current); }
  private static void emit(String event) {
    System.out.println(new StringBuilder(current).append('=').append(event).toString());
  }
  private static void begin(String id) { current = id; initializationCount = 0; }

  private static final class PayloadLoader extends ClassLoader {
    private final String id;
    private final String tree;
    private PayloadLoader delegate;
    private String delegatedName;
    private boolean delegateAll;

    PayloadLoader(String id, String tree) {
      super(JavaSealedLoading.class.getClassLoader()); this.id = id; this.tree = tree;
    }
    void delegate(String name, PayloadLoader loader) { delegatedName = name; delegate = loader; }
    void delegateAll(PayloadLoader loader) { delegateAll = true; delegate = loader; }
    Class<?> published(String name) { return findLoadedClass(name); }

    protected synchronized Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
      if (!name.startsWith(PREFIX)) return super.loadClass(name, resolve);
      Class<?> result = findLoadedClass(name);
      if (result == null) {
        if (delegate != null && (delegateAll || name.equals(delegatedName))) result = delegate.loadClass(name);
        else result = findClass(name);
      }
      if (resolve) resolveClass(result);
      return result;
    }
    protected Class<?> findClass(String name) throws ClassNotFoundException {
      if (!name.startsWith(PREFIX)) throw new ClassNotFoundException(name);
      String resource = new StringBuilder("sealed-payloads/sealed-loading/").append(id).append('/')
          .append(tree).append('/').append(name.replace('.', '/')).append(".bin").toString();
      try (InputStream input = JavaSealedLoading.class.getClassLoader().getResourceAsStream(resource)) {
        if (input == null) throw new ClassNotFoundException(name);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int count;
        while ((count = input.read(buffer)) != -1) bytes.write(buffer, 0, count);
        byte[] data = bytes.toByteArray();
        return defineClass(name, data, 0, data.length);
      } catch (ClassNotFoundException failure) { throw failure; }
      catch (Exception failure) { throw new ClassNotFoundException(name, failure); }
    }
  }

  private static Class<?> passive(String name, PayloadLoader loader) throws ClassNotFoundException {
    return Class.forName(name, false, loader);
  }
  private static boolean direct(Class<?> child, Class<?> parent) {
    if (!parent.isInterface()) return child.getSuperclass() == parent;
    for (Class<?> type : child.getInterfaces()) if (type == parent) return true;
    return false;
  }
  private static Throwable rejected(String name, PayloadLoader loader) {
    Throwable caught = null;
    try { passive(name, loader); }
    catch (Throwable failure) { caught = failure; }
    require(caught != null && caught.getClass() == IncompatibleClassChangeError.class);
    require(loader.published(name) == null);
    return caught;
  }
  private static void finish() { require(initializationCount == 0); emit("init=0"); }

  private static void inspect(String id, String ownerName, String childName, boolean sealed,
      boolean denied, boolean publicChild) throws Exception {
    begin(id);
    PayloadLoader loader = new PayloadLoader(id, "primary");
    Class<?> owner = passive(ownerName, loader);
    require(owner.getClassLoader() == loader && owner.isSealed() == sealed);
    emit(sealed ? "owner=sealed" : "owner=ordinary");
    if (denied) {
      Throwable caught = rejected(childName, loader);
      emit(new StringBuilder("child=").append(caught.getClass().getName()).toString());
      emit("published=false");
    } else {
      Class<?> child = passive(childName, loader);
      require(child.getClassLoader() == loader && loader.published(childName) == child);
      require(direct(child, owner));
      require(Modifier.isPublic(child.getModifiers()) == publicChild);
      emit("child=passive"); emit("identity=direct-parent");
      emit(publicChild ? "access=public" : "access=package"); emit("published=true");
    }
    finish();
  }

  public static void caseClassControl() throws Exception { inspect(IDS[0], BASE, CHILD, false, false, true); }
  public static void caseInterfaceControl() throws Exception { inspect(IDS[1], INTERFACE, IMPL, false, false, true); }
  public static void caseClassPermitted() throws Exception { inspect(IDS[2], BASE, CHILD, true, false, true); }
  public static void caseInterfacePermitted() throws Exception { inspect(IDS[3], INTERFACE, IMPL, true, false, true); }
  public static void caseSubinterfacePermitted() throws Exception {
    inspect(IDS[4], INTERFACE, "sealedloader.p.SubI", true, false, true);
  }
  public static void caseClassUnlisted() throws Exception { inspect(IDS[5], BASE, CHILD, true, true, true); }
  public static void caseInterfaceUnlisted() throws Exception { inspect(IDS[6], INTERFACE, IMPL, true, true, true); }
  public static void caseSubinterfaceUnlisted() throws Exception {
    inspect(IDS[7], INTERFACE, "sealedloader.p.SubI", true, true, true);
  }

  private static void split(String id, String ownerName, String childName) throws Exception {
    begin(id);
    PayloadLoader primary = new PayloadLoader(id, "primary"), foreign = new PayloadLoader(id, "foreign");
    foreign.delegate(ownerName, primary);
    Class<?> owner = passive(ownerName, primary);
    require(owner.getClassLoader() == primary && owner.isSealed());
    emit("owner=sealed");
    Throwable caught = rejected(childName, foreign);
    emit(new StringBuilder("child=").append(caught.getClass().getName()).toString());
    emit("published=false"); emit("modules=different-defining-loaders"); finish();
  }
  public static void caseClassLoaderSplit() throws Exception { split(IDS[8], BASE, CHILD); }
  public static void caseInterfaceLoaderSplit() throws Exception { split(IDS[9], INTERFACE, IMPL); }

  public static void caseLoaderDelegation() throws Exception {
    begin(IDS[10]);
    PayloadLoader defining = new PayloadLoader(current, "primary"), initiating = new PayloadLoader(current, "foreign");
    initiating.delegateAll(defining);
    Class<?> owner = passive(BASE, initiating), child = passive(CHILD, initiating);
    require(owner.isSealed() && owner.getClassLoader() == defining && child.getClassLoader() == defining);
    require(passive(BASE, defining) == owner && passive(CHILD, defining) == child && direct(child, owner));
    emit("owner=sealed"); emit("child=passive"); emit("identity=same-defining-loader");
    emit("initiating=delegated"); finish();
  }

  private static void unseal(String id, String ownerName, String childName) throws Exception {
    begin(id);
    PayloadLoader sealed = new PayloadLoader(id, "primary"), ordinary = new PayloadLoader(id, "foreign");
    Class<?> before = passive(ownerName, sealed);
    require(before.isSealed()); emit("baseline=sealed");
    Throwable caught = rejected(childName, sealed);
    emit(new StringBuilder("before=").append(caught.getClass().getName()).toString());
    Class<?> after = passive(ownerName, ordinary), child = passive(childName, ordinary);
    require(!after.isSealed() && after.getPermittedSubclasses() == null && before != after);
    require(after.getClassLoader() == ordinary && child.getClassLoader() == ordinary && direct(child, after));
    emit("after=passive"); emit("parent=unsealed"); emit("identity=direct-parent"); finish();
  }
  public static void caseClassUnsealOwner() throws Exception { unseal(IDS[11], BASE, CHILD); }
  public static void caseInterfaceUnsealOwner() throws Exception { unseal(IDS[12], INTERFACE, IMPL); }

  public static void casePublicCrosspackageClass() throws Exception {
    inspect(IDS[13], BASE, "sealedloader.q.PublicChild", true, false, true);
  }
  public static void casePublicCrosspackageInterface() throws Exception {
    inspect(IDS[14], INTERFACE, "sealedloader.q.PublicImpl", true, false, true);
  }
  public static void caseNonpublicCrosspackageClass() throws Exception {
    inspect(IDS[15], BASE, "sealedloader.q.PackageChild", true, true, false);
  }
  public static void caseNonpublicCrosspackageInterface() throws Exception {
    inspect(IDS[16], INTERFACE, "sealedloader.q.PackageImpl", true, true, false);
  }
  public static void caseNonpublicSamepackageClass() throws Exception {
    inspect(IDS[17], BASE, "sealedloader.p.PackageChild", true, false, false);
  }
  public static void caseNonpublicSamepackageInterface() throws Exception {
    inspect(IDS[18], INTERFACE, "sealedloader.p.PackageImpl", true, false, false);
  }

  public static void caseForeignParentIdentity() throws Exception {
    begin(IDS[19]);
    PayloadLoader primary = new PayloadLoader(current, "primary"), foreign = new PayloadLoader(current, "foreign");
    primary.delegate(CHILD, foreign);
    Class<?> owner = passive(BASE, primary), otherOwner = passive(BASE, foreign), child = passive(CHILD, foreign);
    require(owner != otherOwner && owner.getName().equals(otherOwner.getName()));
    require(owner.getClassLoader() == primary && otherOwner.getClassLoader() == foreign);
    require(child.getSuperclass() == otherOwner && passive(CHILD, primary) == child);
    require(owner.isSealed() && otherOwner.isSealed());
    Class<?>[] permitted = owner.getPermittedSubclasses();
    require(permitted != null && permitted.length == 0);
    emit("owner=sealed"); emit("same-name=distinct-owners"); emit("child=foreign-direct-parent");
    emit("permitted=empty"); finish();
  }

  public static void main(String[] args) throws Exception {
    require(args.length == IDS.length);
    for (int i = 0; i < IDS.length; i++) require(args[i].equals(IDS[i]));
    caseClassControl(); caseInterfaceControl(); caseClassPermitted(); caseInterfacePermitted();
    caseSubinterfacePermitted(); caseClassUnlisted(); caseInterfaceUnlisted(); caseSubinterfaceUnlisted();
    caseClassLoaderSplit(); caseInterfaceLoaderSplit(); caseLoaderDelegation();
    caseClassUnsealOwner(); caseInterfaceUnsealOwner(); casePublicCrosspackageClass(); casePublicCrosspackageInterface();
    caseNonpublicCrosspackageClass(); caseNonpublicCrosspackageInterface();
    caseNonpublicSamepackageClass(); caseNonpublicSamepackageInterface(); caseForeignParentIdentity();
    System.out.println("SEALED_LOADING_OK");
  }
}
