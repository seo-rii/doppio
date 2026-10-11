package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Array;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.HashMap;

/** Old genuine callers against separately compiled member/hierarchy replacements. */
public class JavaMemberResolution {
  private static final String PREFIX = "members.";
  private static final StringBuilder effects = new StringBuilder();

  public static int mark(String name, int value) {
    if (effects.length() != 0) effects.append(',');
    effects.append(name);
    return value;
  }

  private static void require(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }

  private static void emit(String id, String event) { System.out.println(id + "=" + event); }
  private static String b(String name) { return "baseline:" + PREFIX + name; }
  private static String e(String name) { return "evolved:" + PREFIX + name; }

  private static byte[] read(String stage, String name) throws Exception {
    InputStream input = JavaMemberResolution.class.getResourceAsStream(
      "/member-resolution-cases/" + stage + "/" + name.replace('.', '/') + ".bin");
    require(input != null, "Missing genuine member-resolution payload " + stage + ":" + name);
    try {
      ByteArrayOutputStream output = new ByteArrayOutputStream();
      byte[] buffer = new byte[1024];
      int count;
      while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
      return output.toByteArray();
    } finally { input.close(); }
  }

  private static final class PayloadLoader extends ClassLoader {
    private final HashMap<String, String> stages = new HashMap<String, String>();
    private final String[] names;

    PayloadLoader(String... payloads) {
      super(JavaMemberResolution.class.getClassLoader());
      names = new String[payloads.length];
      for (int i = 0; i < payloads.length; i++) {
        int separator = payloads[i].indexOf(':');
        names[i] = payloads[i].substring(separator + 1);
        require(stages.put(names[i], payloads[i].substring(0, separator)) == null, "Duplicate payload name");
      }
    }

    @Override protected synchronized Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
      Class<?> found = findLoadedClass(name);
      if (found == null) {
        String stage = stages.get(name);
        if (stage == null) return super.loadClass(name, resolve);
        byte[] bytes;
        try { bytes = read(stage, name); }
        catch (Exception failure) { throw new ClassNotFoundException(name, failure); }
        found = defineClass(name, bytes, 0, bytes.length);
      }
      if (resolve) resolveClass(found);
      return found;
    }

    private void readyMetadata() throws Exception {
      for (String name : names) {
        Class<?> type = Class.forName(name, false, this);
        require(type.getClassLoader() == this && type.getName().equals(name), "Exact child-first payload identity");
      }
      require(effects.length() == 0, "Loading payload metadata caused initialization");
    }

    Method ready(String entry) throws Exception {
      readyMetadata();
      Method method = Class.forName(PREFIX + entry, false, this).getMethod("run");
      require(effects.length() == 0, "Preparing the caller caused target initialization or execution");
      return method;
    }

    Method readyCopy(String entry, Class<?> arrayType) throws Exception {
      readyMetadata();
      Method method = Class.forName(entry, false, this).getMethod("copy", arrayType);
      require(effects.length() == 0, "Preparing array clone caused target initialization or execution");
      return method;
    }
  }

  private static void invoke(String id, String phase, Method method, String expected, int value) throws Exception {
    Object result = null;
    Throwable failure = null;
    try { result = method.invoke(null); }
    catch (InvocationTargetException caught) { failure = caught.getCause(); }
    catch (Throwable caught) { failure = caught; }
    String actual = failure == null ? "accepted" : failure.getClass().getName();
    require(actual.equals(expected), id + ": expected " + expected + "@" + phase + ", got " + actual);
    emit(id, actual + "@" + phase);
    if (failure == null) {
      require(result instanceof Integer && ((Integer) result).intValue() == value, "Wrong field/method selected for " + id);
      emit(id, "value" + (phase.equals("invoke") ? "" : phase.substring("invoke".length())) + "=" + value);
    }
  }

  private static void effects(String id, String expected) {
    require(effects.toString().equals(expected), id + ": unexpected effects " + effects.toString());
    emit(id, "effects=" + (expected.length() == 0 ? "none" : expected));
  }

  private static void single(String id, String entry, String expected, int value, String expectedEffects, String... payloads) throws Exception {
    Method method = new PayloadLoader(payloads).ready(entry);
    emit(id, "metadata-ready-no-effects");
    invoke(id, "invoke", method, expected, value);
    effects(id, expectedEffects);
  }

  private static void identity(String id, boolean iface) throws Exception {
    PayloadLoader a = iface ? new PayloadLoader(b("InterfaceFieldCaller"), b("InterfaceOwner"), b("InterfaceSuper"), b("First"), b("Second")) :
      new PayloadLoader(b("IdentityCaller"), b("IdentityOwner"));
    PayloadLoader b = iface ? new PayloadLoader(b("InterfaceFieldCaller"), b("InterfaceOwner"), b("InterfaceSuper"), e("First"), b("Second")) :
      new PayloadLoader(b("IdentityCaller"), e("IdentityOwner"));
    String entry = iface ? "InterfaceFieldCaller" : "IdentityCaller", owner = PREFIX + (iface ? "First" : "IdentityOwner");
    Method first = a.ready(entry), second = b.ready(entry);
    emit(id, "metadata-ready-no-effects");
    Class<?> left = Class.forName(owner, false, a), right = Class.forName(owner, false, b);
    require(left != right && left.getName().equals(right.getName()) && left.getClassLoader() == a && right.getClassLoader() == b,
      "Same spelling must retain independent defining-loader identities");
    require(left.isInterface() == iface && right.isInterface() == iface, "Identity control must retain owner kind");
    require(first.getDeclaringClass() != second.getDeclaringClass(), "Callers must also belong to their own loaders");
    emit(id, "same-name-" + (iface ? "interface" : "class") + "-identities-distinct");
    invoke(id, "invoke-a", first, "accepted", iface ? 41 : 71);
    invoke(id, "invoke-b", second, "accepted", iface ? 43 : 72);
    effects(id, iface ? "first,first" : "identity-owner,identity-owner");
  }

  private static void objectCloneMetadata(String id, String phase) throws Exception {
    Method method = Object.class.getDeclaredMethod("clone");
    int flags = method.getModifiers();
    require(method.getDeclaringClass() == Object.class && Object.class.getClassLoader() == null,
      "Object.clone must remain declared by bootstrap Object");
    require(Modifier.isProtected(flags) && !Modifier.isPublic(flags) && !Modifier.isStatic(flags),
      "Public array clone must not change protected Object.clone metadata");
    require(method.getReturnType() == Object.class && method.getParameterTypes().length == 0,
      "Object.clone must retain its exact ()Object descriptor");
    emit(id, "object-clone-bootstrap-protected-" + phase);
  }

  private static void arrayClone(String id, int kind, boolean nullReceiver, boolean hiddenLeaf) throws Exception {
    String entry = kind == 0 ? PREFIX + "PrimitiveCloneCaller" : kind == 1 ? PREFIX + "ReferenceCloneCaller" :
      kind == 2 ? PREFIX + "MultirankCloneCaller" : "cloneaccess.LeafCloneCaller";
    PayloadLoader loader = kind == 3 ? new PayloadLoader("baseline:" + entry, hiddenLeaf ? e("CloneLeaf") : b("CloneLeaf")) :
      new PayloadLoader("baseline:" + entry);
    Object original;
    if (kind == 0) original = new int[] {3, 5};
    else if (kind == 1) original = new Object[] {new StringBuilder("shared"), null};
    else if (kind == 2) original = new int[][] {new int[] {7, 11}, null};
    else {
      Class<?> leaf = Class.forName(PREFIX + "CloneLeaf", false, loader);
      original = Array.newInstance(leaf, 2);
      require(original.getClass().getComponentType() == leaf && original.getClass().getClassLoader() == loader,
        "Array leaf must retain the exact defining-loader identity");
    }
    Class<?> arrayType = original.getClass();
    Method method = loader.readyCopy(entry, arrayType);
    emit(id, "metadata-ready-no-effects");
    objectCloneMetadata(id, "before");
    Object copy = null;
    Throwable failure = null;
    try { copy = method.invoke(null, new Object[] {nullReceiver ? null : original}); }
    catch (InvocationTargetException caught) { failure = caught.getCause(); }
    catch (Throwable caught) { failure = caught; }
    String expected = hiddenLeaf ? "java.lang.IllegalAccessError" : nullReceiver ? "java.lang.NullPointerException" : "accepted";
    String actual = failure == null ? "accepted" : failure.getClass().getName();
    require(actual.equals(expected), id + ": expected " + expected + "@invoke, got " + actual);
    emit(id, actual + "@invoke");
    if (failure == null) {
      require(copy != original && copy.getClass() == arrayType && copy.getClass().getClassLoader() == arrayType.getClassLoader(),
        "Clone must have independent object identity and the exact original array class");
      emit(id, "clone-identity-and-array-type");
      if (kind == 0) {
        int[] source = (int[]) original, result = (int[]) copy;
        require(result.length == 2 && result[0] == 3 && result[1] == 5, "Primitive clone values");
        result[0] = 13;
        require(source[0] == 3 && result[0] == 13, "Primitive array slots must be independent");
        emit(id, "primitive-values-and-independent-slots");
      } else if (kind == 1) {
        Object[] source = (Object[]) original, result = (Object[]) copy;
        require(result.length == 2 && result[0] == source[0] && result[1] == null, "Reference clone shares element identities");
        ((StringBuilder) result[0]).append("-changed");
        require(source[0].toString().equals("shared-changed"), "Reference clone must be shallow");
        result[0] = null;
        require(source[0] != null, "Reference array slots must be independent");
        emit(id, "shared-elements-and-independent-slots");
      } else if (kind == 2) {
        int[][] source = (int[][]) original, result = (int[][]) copy;
        require(result.length == 2 && result[0] == source[0] && result[1] == null && result[0][1] == 11,
          "Multirank clone shares the original inner array");
        result[0][0] = 17;
        require(source[0][0] == 17, "Multirank clone must be shallow");
        result[0] = null;
        require(source[0] != null, "Outer array slots must be independent");
        emit(id, "shared-inner-arrays-and-independent-slots");
      } else {
        Object[] result = (Object[]) copy;
        require(result.length == 2 && result[0] == null && result[1] == null, "Public leaf array clone values");
        emit(id, "public-leaf-values-and-loader-identity");
      }
    }
    objectCloneMetadata(id, "after");
    effects(id, "");
  }

  private static void run(String id) throws Exception {
    effects.setLength(0);
    if (id.equals("declared-field-positive")) single(id, "TypeCaller", "accepted", 10, "type-owner", b("TypeCaller"), b("TypeOwner"));
    else if (id.equals("declared-field-descriptor-change")) single(id, "TypeCaller", "java.lang.NoSuchFieldError", 0, "", b("TypeCaller"), e("TypeOwner"));
    else if (id.equals("missing-field-positive")) single(id, "GoneFieldCaller", "accepted", 11, "gone-field", b("GoneFieldCaller"), b("GoneFieldOwner"));
    else if (id.equals("missing-field-evolved")) single(id, "GoneFieldCaller", "java.lang.NoSuchFieldError", 0, "", b("GoneFieldCaller"), e("GoneFieldOwner"));
    else if (id.equals("inherited-field-positive")) single(id, "InheritedCaller", "accepted", 20, "field-parent", b("InheritedCaller"), b("FieldChild"), b("FieldParent"));
    else if (id.equals("inherited-field-different-descriptor")) single(id, "InheritedCaller", "accepted", 20, "field-parent", b("InheritedCaller"), e("FieldChild"), b("FieldParent"));
    else if (id.equals("interface-field-positive")) single(id, "InterfaceFieldCaller", "accepted", 41, "first", b("InterfaceFieldCaller"), b("InterfaceOwner"), b("InterfaceSuper"), b("First"), b("Second"));
    else if (id.equals("interface-field-second-added")) single(id, "InterfaceFieldCaller", "accepted", 41, "first", b("InterfaceFieldCaller"), b("InterfaceOwner"), b("InterfaceSuper"), b("First"), e("Second"));
    else if (id.equals("interface-field-reversed")) single(id, "InterfaceFieldCaller", "accepted", 42, "second", b("InterfaceFieldCaller"), e("InterfaceOwner"), b("InterfaceSuper"), b("First"), e("Second"));
    else if (id.equals("interface-field-before-superclass")) single(id, "InterfaceFieldCaller", "accepted", 41, "first", b("InterfaceFieldCaller"), b("InterfaceOwner"), e("InterfaceSuper"), b("First"), b("Second"));
    else if (id.equals("class-method-positive")) single(id, "ClassCaller", "accepted", 51, "class-owner-init,class-method", b("ClassCaller"), b("ClassOwner"));
    else if (id.equals("methodref-owner-interface")) single(id, "ClassCaller", "java.lang.IncompatibleClassChangeError", 0, "", b("ClassCaller"), e("ClassOwner"));
    else if (id.equals("missing-class-method-positive")) single(id, "GoneMethodCaller", "accepted", 52, "gone-method-init,gone-method", b("GoneMethodCaller"), b("GoneMethodOwner"));
    else if (id.equals("missing-class-method-evolved")) single(id, "GoneMethodCaller", "java.lang.NoSuchMethodError", 0, "", b("GoneMethodCaller"), e("GoneMethodOwner"));
    else if (id.equals("interface-method-positive")) single(id, "InterfaceCaller", "java.lang.NullPointerException", 0, "", b("InterfaceCaller"), b("Role"));
    else if (id.equals("interfacemethodref-owner-class")) single(id, "InterfaceCaller", "java.lang.IncompatibleClassChangeError", 0, "", b("InterfaceCaller"), e("Role"));
    else if (id.equals("missing-interface-method-positive")) single(id, "GoneInterfaceCaller", "java.lang.NullPointerException", 0, "", b("GoneInterfaceCaller"), b("GoneRole"));
    else if (id.equals("missing-interface-method-evolved")) single(id, "GoneInterfaceCaller", "java.lang.NoSuchMethodError", 0, "", b("GoneInterfaceCaller"), e("GoneRole"));
    else if (id.equals("fieldref-owner-class-positive")) single(id, "FieldKindCaller", "accepted", 12, "field-kind", b("FieldKindCaller"), b("FieldKindOwner"));
    else if (id.equals("fieldref-owner-interface-positive")) single(id, "FieldKindCaller", "accepted", 12, "field-kind", b("FieldKindCaller"), e("FieldKindOwner"));
    else if (id.equals("independent-class-identity")) identity(id, false);
    else if (id.equals("independent-interface-identity")) identity(id, true);
    else if (id.equals("primitive-array-clone")) arrayClone(id, 0, false, false);
    else if (id.equals("primitive-array-clone-null")) arrayClone(id, 0, true, false);
    else if (id.equals("reference-array-clone")) arrayClone(id, 1, false, false);
    else if (id.equals("reference-array-clone-null")) arrayClone(id, 1, true, false);
    else if (id.equals("multirank-array-clone")) arrayClone(id, 2, false, false);
    else if (id.equals("multirank-array-clone-null")) arrayClone(id, 2, true, false);
    else if (id.equals("public-leaf-array-clone")) arrayClone(id, 3, false, false);
    else if (id.equals("hidden-leaf-array-clone")) arrayClone(id, 3, false, true);
    else throw new AssertionError("Unknown mandatory member-resolution case " + id);
  }

  public static void main(String[] args) throws Exception {
    require(args.length == 30, "Complete 30-case member-resolution manifest required");
    for (String id : args) run(id);
    System.out.println("MEMBER_RESOLUTION_OK");
  }
}
