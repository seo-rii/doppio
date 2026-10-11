package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Arrays;

/** Bounded metadata mutations and explicitly selected pinned-native API behavior. */
public class JavaSealedMetadata {
  private static final String BASE = "sealedmetadata.Base";
  private static final String CHILD = "sealedmetadata.Child";
  private static final String GOOD = "sealedmetadata.Good";
  private static final String[] IDS = {
    "sm-empty-owner", "sm-empty-reject-child", "sm-final-with-permits", "sm-duplicate-attribute",
    "sm-wrong-index-tag", "sm-zero-index", "sm-oob-index", "sm-bad-length", "sm-truncated-entries",
    "sm-extra-attribute-byte", "sm-missing-child", "sm-loader-cnfe", "sm-loader-linkage-error",
    "sm-loader-assertion-error", "sm-loader-runtime-exception", "sm-loader-vme-retry", "sm-invalid-child-code",
    "sm-unrelated-listed", "sm-indirect-listed", "sm-duplicate-entry", "sm-array-entry", "sm-old-major-opaque"
  };
  private static String current;
  private static int initializationCount;

  public static void noteInitialization() { initializationCount++; }
  private static void require(boolean value) { if (!value) throw new AssertionError(current); }
  private static void begin(String id) { current = id; initializationCount = 0; }
  private static void emit(String event) {
    System.out.println(new StringBuilder(current).append('=').append(event).toString());
  }
  private static void finish() { require(initializationCount == 0); emit("init=0"); }

  private static final class SentinelVME extends VirtualMachineError {}

  private static final class PayloadLoader extends ClassLoader {
    private final String id;
    private final String tree;
    private Throwable injected;
    private boolean once;

    PayloadLoader(String id, String tree) { super(JavaSealedMetadata.class.getClassLoader()); this.id = id; this.tree = tree; }
    void arm(Throwable failure, boolean oneAttempt) { injected = failure; once = oneAttempt; }
    Class<?> published(String name) { return findLoadedClass(name); }

    protected synchronized Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
      if (!name.startsWith("sealedmetadata.")) return super.loadClass(name, resolve);
      if (name.equals(CHILD) && injected != null) {
        Throwable failure = injected;
        if (once) injected = null;
        if (failure instanceof ClassNotFoundException) throw (ClassNotFoundException) failure;
        if (failure instanceof Error) throw (Error) failure;
        if (failure instanceof RuntimeException) throw (RuntimeException) failure;
        throw new AssertionError("Unsupported injected category");
      }
      Class<?> result = findLoadedClass(name);
      if (result == null) result = findClass(name);
      if (resolve) resolveClass(result);
      return result;
    }
    protected Class<?> findClass(String name) throws ClassNotFoundException {
      if (!name.startsWith("sealedmetadata.")) throw new ClassNotFoundException(name);
      String resource = new StringBuilder("sealed-payloads/sealed-metadata/").append(id).append('/')
          .append(tree).append('/').append(name.replace('.', '/')).append(".bin").toString();
      try (InputStream input = JavaSealedMetadata.class.getClassLoader().getResourceAsStream(resource)) {
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
  private static Class<?> owner(PayloadLoader loader) throws Exception {
    Class<?> result = passive(BASE, loader);
    require(result.getClassLoader() == loader && loader.published(BASE) == result);
    return result;
  }
  private static String names(Class<?>[] values) {
    if (values == null) return "null";
    if (values.length == 0) return "empty";
    String[] names = new String[values.length];
    for (int i = 0; i < values.length; i++) {
      String name = values[i].getName();
      require(name.startsWith("sealedmetadata."));
      names[i] = name.substring("sealedmetadata.".length());
    }
    Arrays.sort(names);
    StringBuilder text = new StringBuilder();
    for (int i = 0; i < names.length; i++) { if (i != 0) text.append(','); text.append(names[i]); }
    return text.toString();
  }
  private static void identities(Class<?> parent, Class<?>[] children, PayloadLoader loader) {
    require(children != null);
    for (Class<?> child : children) require(child.getClassLoader() == loader && child.getSuperclass() == parent && loader.published(child.getName()) == child);
  }
  private static Throwable exactFailure(String name, PayloadLoader loader, Class<?> expected, boolean initialize) {
    Throwable caught = null;
    try { Class.forName(name, initialize, loader); }
    catch (Throwable failure) { caught = failure; }
    require(caught != null && caught.getClass() == expected);
    return caught;
  }

  public static void caseEmptyOwner() throws Exception {
    begin(IDS[0]);
    PayloadLoader loader = new PayloadLoader(current, "primary");
    Class<?> owner = owner(loader);
    require(owner.isSealed());
    Class<?>[] permitted = owner.getPermittedSubclasses();
    require(permitted != null && permitted.length == 0 && passive(BASE, loader) == owner);
    emit("owner=sealed"); emit("permitted=empty"); emit("identity=owner-retained"); finish();
  }
  public static void caseEmptyRejectChild() throws Exception {
    begin(IDS[1]);
    PayloadLoader loader = new PayloadLoader(current, "primary");
    Class<?> owner = owner(loader);
    require(owner.isSealed() && owner.getPermittedSubclasses().length == 0);
    Throwable caught = exactFailure(CHILD, loader, IncompatibleClassChangeError.class, false);
    require(loader.published(CHILD) == null && passive(BASE, loader) == owner);
    emit("owner=sealed"); emit(new StringBuilder("child=").append(caught.getClass().getName()).toString());
    emit("identity=owner-retained"); finish();
  }
  private static void formatFailure(String id) {
    begin(id);
    PayloadLoader loader = new PayloadLoader(id, "primary");
    Throwable caught = exactFailure(BASE, loader, ClassFormatError.class, false);
    require(loader.published(BASE) == null);
    emit(new StringBuilder("load=").append(caught.getClass().getName()).toString()); emit("published=false"); finish();
  }
  public static void caseFinalWithPermits() { formatFailure(IDS[2]); }
  public static void caseDuplicateAttribute() { formatFailure(IDS[3]); }
  public static void caseWrongIndexTag() { formatFailure(IDS[4]); }
  public static void caseZeroIndex() { formatFailure(IDS[5]); }
  public static void caseOobIndex() { formatFailure(IDS[6]); }
  public static void caseBadLength() { formatFailure(IDS[7]); }
  public static void caseTruncatedEntries() { formatFailure(IDS[8]); }
  public static void caseExtraAttributeByte() { formatFailure(IDS[9]); }

  private static void skipFailure(String id, Throwable failure) throws Exception {
    begin(id);
    PayloadLoader loader = new PayloadLoader(id, "primary");
    Class<?> owner = owner(loader);
    if (failure != null) loader.arm(failure, false);
    Class<?>[] permitted = owner.getPermittedSubclasses();
    require(names(permitted).equals("Good"));
    Class<?> good = passive(GOOD, loader);
    require(permitted.length == 1 && permitted[0] == good);
    identities(owner, permitted, loader);
    emit("owner=passive"); emit("permitted=Good"); emit("identity=direct-local"); finish();
  }
  public static void caseMissingChild() throws Exception { skipFailure(IDS[10], null); }
  public static void caseLoaderCnfe() throws Exception { skipFailure(IDS[11], new ClassNotFoundException("sentinel")); }
  public static void caseLoaderLinkageError() throws Exception { skipFailure(IDS[12], new LinkageError("sentinel")); }
  public static void caseLoaderAssertionError() throws Exception { skipFailure(IDS[13], new AssertionError("sentinel")); }
  public static void caseLoaderRuntimeException() throws Exception { skipFailure(IDS[14], new IllegalStateException("sentinel")); }

  private static void originalVme(Class<?> owner, PayloadLoader loader, SentinelVME sentinel, boolean sealedQuery) {
    loader.arm(sentinel, true);
    Throwable caught = null;
    try { if (sealedQuery) owner.isSealed(); else owner.getPermittedSubclasses(); }
    catch (Throwable failure) { caught = failure; }
    require(caught == sentinel);
  }
  public static void caseLoaderVmeRetry() throws Exception {
    begin(IDS[15]);
    PayloadLoader permittedLoader = new PayloadLoader(current, "primary");
    Class<?> permittedOwner = owner(permittedLoader);
    originalVme(permittedOwner, permittedLoader, new SentinelVME(), false);
    emit("permitted-vme=original");
    Class<?>[] permitted = permittedOwner.getPermittedSubclasses();
    require(names(permitted).equals("Child,Good")); identities(permittedOwner, permitted, permittedLoader);
    emit("permitted-retry=Child,Good");
    PayloadLoader sealedLoader = new PayloadLoader(current, "primary");
    Class<?> sealedOwner = owner(sealedLoader);
    originalVme(sealedOwner, sealedLoader, new SentinelVME(), true);
    emit("sealed-vme=original");
    require(sealedOwner.isSealed());
    permitted = sealedOwner.getPermittedSubclasses();
    require(names(permitted).equals("Child,Good")); identities(sealedOwner, permitted, sealedLoader);
    emit("sealed-retry=true"); finish();
  }

  public static void caseInvalidChildCode() throws Exception {
    begin(IDS[16]);
    PayloadLoader bad = new PayloadLoader(current, "primary"), good = new PayloadLoader(current, "foreign");
    Class<?> owner = owner(bad);
    Class<?>[] permitted = owner.getPermittedSubclasses();
    require(names(permitted).equals("Child,Good")); identities(owner, permitted, bad);
    Class<?> child = passive(CHILD, bad);
    boolean found = false;
    for (Class<?> type : permitted) if (type == child) found = true;
    require(found && initializationCount == 0); emit("passive=bad-child-visible"); emit("init-before=0");
    Throwable caught = exactFailure(CHILD, bad, VerifyError.class, true);
    require(initializationCount == 0 && bad.published(CHILD) == child);
    emit(new StringBuilder("active=").append(caught.getClass().getName()).toString()); emit("identity=published");
    Class<?> active = Class.forName(CHILD, true, good);
    require(active.getClassLoader() == good && initializationCount == 2); emit("active-control=2");
  }
  private static void evolvedChild(String id, boolean indirect) throws Exception {
    begin(id);
    PayloadLoader loader = new PayloadLoader(id, "primary");
    Class<?> owner = owner(loader), child = passive(CHILD, loader), good = passive(GOOD, loader);
    require(child.getSuperclass() == (indirect ? good : Object.class));
    Class<?>[] permitted = owner.getPermittedSubclasses();
    require(names(permitted).equals("Good") && permitted[0] == good); identities(owner, permitted, loader);
    require(owner.isSealed() && (!indirect || owner.isAssignableFrom(child)));
    emit("owner=sealed"); emit(indirect ? "child=indirect" : "child=unrelated");
    emit("permitted=Good"); emit("identity=actual-parent-filter"); finish();
  }
  public static void caseUnrelatedListed() throws Exception { evolvedChild(IDS[17], false); }
  public static void caseIndirectListed() throws Exception { evolvedChild(IDS[18], true); }

  /** Raw observed native taxonomy; the host manifest supplies fixed reviewed oracles. */
  private static void taxonomy(String id) {
    begin(id);
    PayloadLoader loader = new PayloadLoader(id, "primary");
    Class<?> owner;
    try { owner = owner(loader); }
    catch (Throwable failure) { emit(new StringBuilder("owner=").append(failure.getClass().getName()).toString()); finish(); return; }
    emit("owner=loaded");
    try { emit(new StringBuilder("sealed=").append(owner.isSealed()).toString()); }
    catch (Throwable failure) { emit(new StringBuilder("sealed=").append(failure.getClass().getName()).toString()); finish(); return; }
    try {
      Class<?>[] permitted = owner.getPermittedSubclasses();
      emit(new StringBuilder("permitted=").append(names(permitted)).toString());
      if (permitted != null) identities(owner, permitted, loader);
      emit(permitted == null ? "identity=not-applicable" : "identity=direct-local");
    } catch (Throwable failure) { emit(new StringBuilder("permitted=").append(failure.getClass().getName()).toString()); }
    finish();
  }
  public static void caseDuplicateEntry() { taxonomy(IDS[19]); }
  public static void caseArrayEntry() { taxonomy(IDS[20]); }
  public static void caseOldMajorOpaque() { taxonomy(IDS[21]); }

  public static void main(String[] args) throws Exception {
    if (args.length == 1 && args[0].equals("--taxonomy")) {
      caseDuplicateEntry(); caseArrayEntry(); caseOldMajorOpaque();
      System.out.println("SEALED_TAXONOMY_OBSERVED"); return;
    }
    require(args.length == IDS.length);
    for (int i = 0; i < IDS.length; i++) require(args[i].equals(IDS[i]));
    caseEmptyOwner(); caseEmptyRejectChild(); caseFinalWithPermits(); caseDuplicateAttribute();
    caseWrongIndexTag(); caseZeroIndex(); caseOobIndex(); caseBadLength(); caseTruncatedEntries(); caseExtraAttributeByte();
    caseMissingChild(); caseLoaderCnfe(); caseLoaderLinkageError(); caseLoaderAssertionError(); caseLoaderRuntimeException();
    caseLoaderVmeRetry(); caseInvalidChildCode(); caseUnrelatedListed(); caseIndirectListed();
    caseDuplicateEntry(); caseArrayEntry(); caseOldMajorOpaque();
    System.out.println("SEALED_METADATA_OK");
  }
}
