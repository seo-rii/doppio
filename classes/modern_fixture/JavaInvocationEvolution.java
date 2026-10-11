package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.HashMap;

/** Actual old javac call sites against separately compiled replacement owners. */
public class JavaInvocationEvolution {
  private static final String PREFIX = "invocation.";
  private static final String AME = "java.lang.AbstractMethodError";
  private static final String ICCE = "java.lang.IncompatibleClassChangeError";
  private static final String NPE = "java.lang.NullPointerException";
  private static boolean native21Oracle;
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
  private static String version(boolean evolved, String name) { return (evolved ? "evolved:" : "baseline:") + PREFIX + name; }

  private static byte[] read(String stage, String name) throws Exception {
    InputStream input = JavaInvocationEvolution.class.getResourceAsStream(
      "/invocation-evolution-cases/" + stage + "/" + name.replace('.', '/') + ".bin");
    require(input != null, "Missing genuine invocation payload " + stage + ":" + name);
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

    PayloadLoader(String entry, String... payloads) throws Exception {
      super(JavaInvocationEvolution.class.getClassLoader());
      names = new String[payloads.length + 1];
      names[0] = PREFIX + entry;
      stages.put(names[0], "baseline");
      for (int i = 0; i < payloads.length; i++) {
        int separator = payloads[i].indexOf(':');
        names[i + 1] = payloads[i].substring(separator + 1);
        require(stages.put(names[i + 1], payloads[i].substring(0, separator)) == null, "Duplicate payload name");
      }
      for (String name : names) {
        Class<?> type = Class.forName(name, false, this);
        require(type.getClassLoader() == this && type.getName().equals(name), "Exact child-first payload identity");
      }
      require(effects.length() == 0, "Passive metadata caused initialization or execution");
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

    Class<?> type(String name) throws Exception { return Class.forName(PREFIX + name, false, this); }

    Method entry(String name, String parameter) throws Exception {
      Method method = parameter == null ? type(name).getMethod("run") : type(name).getMethod("run", type(parameter));
      require(method.getDeclaringClass() == type(name), "Exact old caller declaration identity");
      require(effects.length() == 0, "Preparing an old caller caused initialization or execution");
      return method;
    }

    Object receiver(String name) throws Exception {
      // A default conflict or inherited abstract method must not prevent this
      // unchanged concrete receiver from being defined, linked and initialized.
      Class<?> type = Class.forName(PREFIX + name, true, this);
      Object receiver = type.getConstructor().newInstance();
      require(receiver.getClass() == type, "Exact old receiver identity");
      require(effects.length() == 0, "Receiver setup executed a target method");
      return receiver;
    }

    void conflictMetadata(boolean changed) throws Exception {
      Class<?> left = type("ConflictLeft"), right = type("ConflictRight"), implementation = type("ConflictImpl");
      Class<?>[] implemented = implementation.getInterfaces();
      require(implemented.length == 2 && implemented[0] == left && implemented[1] == right,
        "Conflict receiver must implement these exact loaded interface identities");
      require(implementation.getDeclaredMethods().length == 0, "Old conflict receiver has no declared masking method");
      Method leftMethod = left.getDeclaredMethod("value");
      require(leftMethod.getDeclaringClass() == left && leftMethod.isDefault() && leftMethod.getModifiers() == Modifier.PUBLIC,
        "Actual loaded Left declares the public nonabstract default");
      Method[] rightMethods = right.getDeclaredMethods();
      require(rightMethods.length == (changed ? 1 : 0), "Actual Right metadata must match the routed stage");
      if (changed) require(rightMethods[0].getName().equals("value") && rightMethods[0].getReturnType() == Integer.TYPE &&
        rightMethods[0].getParameterTypes().length == 0 && rightMethods[0].getDeclaringClass() == right &&
        rightMethods[0].isDefault() && rightMethods[0].getModifiers() == Modifier.PUBLIC,
        "Actual loaded evolved Right declares its unrelated public nonabstract default");
      require(stages.get(PREFIX + "ConflictRight").equals(changed ? "evolved" : "baseline"), "Exact replacement stage routing");
      require(left.getClassLoader() == this && right.getClassLoader() == this && implementation.getClassLoader() == this,
        "Default candidates and receiver share the exact defining loader");
      require(effects.length() == 0, "Inspecting actual loaded defaults must not initialize or execute them");
    }
  }

  private static void invoke(String id, String phase, Method method, Object target, Object[] arguments,
      String expectedError, int expectedValue) throws Exception {
    Object result = null;
    Throwable failure = null;
    try { result = method.invoke(target, arguments); }
    catch (InvocationTargetException caught) { failure = caught.getCause(); }
    catch (Throwable caught) { failure = caught; }
    String actual = failure == null ? "accepted" : failure.getClass().getName();
    String expected = expectedError == null ? "accepted" : expectedError;
    require(actual.equals(expected), id + ": expected " + expected + "@" + phase + ", got " + actual);
    emit(id, actual + "@" + phase);
    if (failure == null) {
      require(result instanceof Integer && ((Integer) result).intValue() == expectedValue,
        "Wrong selected declaration or field value for " + id);
      emit(id, "value@" + phase + "=" + expectedValue);
    }
  }

  private static void checkEffects(String id, String expected) {
    require(effects.toString().equals(expected), id + ": unexpected effects " + effects.toString());
    emit(id, "effects=" + (expected.length() == 0 ? "none" : expected));
  }

  private static void selection(String id, String entry, String parameter, String receiverName,
      String error, int value, String effect, Boolean abstractOwner, String... payloads) throws Exception {
    PayloadLoader loader = new PayloadLoader(entry, payloads);
    Method method = loader.entry(entry, parameter);
    emit(id, "metadata-ready-no-effects");
    if (abstractOwner != null) {
      Method declaration = loader.type(receiverName).getMethod("value");
      require(declaration.getDeclaringClass() == loader.type("ClassBase"), "Inherited declaration must retain Base identity");
      require(Modifier.isAbstract(declaration.getModifiers()) == abstractOwner.booleanValue(), "Exact abstract declaration flag");
      require(loader.type(receiverName).getDeclaredMethods().length == 0, "Old receiver must not gain a compiler bridge");
      emit(id, "declaring-owner=invocation.ClassBase;abstract=" + abstractOwner);
    }
    Object receiver = loader.receiver(receiverName);
    emit(id, "receiver-ready-no-effects");
    invoke(id, "invoke", method, parameter == null ? receiver : null,
      parameter == null ? new Object[0] : new Object[] {receiver}, error, value);
    checkEffects(id, effect);
  }

  private static void simple(String id, String entry, String parameter, String error, int value,
      String effect, String... payloads) throws Exception {
    PayloadLoader loader = new PayloadLoader(entry, payloads);
    Method method = loader.entry(entry, parameter);
    emit(id, "metadata-ready-no-effects");
    invoke(id, "invoke", method, null, parameter == null ? new Object[0] : new Object[] {null}, error, value);
    checkEffects(id, effect);
  }

  private static void conflict(String id, boolean virtual, boolean changed) throws Exception {
    String entry = virtual ? "ConflictVirtualCaller" : "ConflictInterfaceCaller";
    PayloadLoader loader = new PayloadLoader(entry, b("ConflictLeft"), version(changed, "ConflictRight"),
      b("ConflictImpl"), b("ConflictOverride"));
    Method method = loader.entry(entry, virtual ? "ConflictImpl" : "ConflictLeft");
    emit(id, "metadata-ready-no-effects");
    loader.conflictMetadata(changed);
    emit(id, "runtime-default-identities-proven");
    Object overriding = loader.receiver("ConflictOverride"), plain = loader.receiver("ConflictImpl");
    emit(id, "receivers-ready-no-effects");
    // Pinned 21 has a narrowly recorded exception-subtype difference here.
    // The operation, loaded bytes and receiver sequence remain identical.
    // Pinned 25 and both guest hosts must produce the normative exact ICCE.
    String error = changed ? (!virtual && native21Oracle ? AME : ICCE) : null;
    // All five calls enter the same Method of the same old caller class, hence
    // the very same bytecode instruction and run-time constant-pool entry.
    invoke(id, "override-before", method, null, new Object[] {overriding}, null, 23);
    invoke(id, "plain", method, null, new Object[] {plain}, error, 21);
    invoke(id, "override-after", method, null, new Object[] {overriding}, null, 23);
    invoke(id, "null", method, null, new Object[] {null}, NPE, 0);
    invoke(id, "plain-repeat", method, null, new Object[] {plain}, error, 21);
    checkEffects(id, changed ? "override,override" : "override,left-default,override,left-default");
  }

  private static void initialization(String id, boolean iface) throws Exception {
    String entry = iface ? "InitInterfaceCaller" : "InitClassCaller";
    String owner = iface ? "InitRole" : "InitBase", deferred = iface ? "InitParent" : "InitChild";
    PayloadLoader loader = new PayloadLoader(entry, b(owner), b(deferred));
    Method method = loader.entry(entry, null);
    Class<?> symbolicOwner = loader.type(iface ? owner : deferred);
    require(symbolicOwner.getMethod("value").getDeclaringClass() == loader.type(owner), "Exact static declaring owner");
    require(effects.length() == 0, "Declaration inspection initialized the target");
    emit(id, "metadata-ready-no-effects");
    emit(id, "declaring-owner=" + PREFIX + owner);
    invoke(id, "invoke", method, null, new Object[0], null, iface ? 52 : 51);
    checkEffects(id, iface ? "init-role,role-static" : "init-base,base-static");
    require(Class.forName(PREFIX + deferred, true, loader) == loader.type(deferred), "Explicit initialization preserves identity");
    emit(id, "accepted@explicit-initialize");
    checkEffects(id, iface ? "init-role,role-static,init-parent" : "init-base,base-static,init-child");
  }

  private static void run(String id) throws Exception {
    effects.setLength(0);
    boolean changed = id.endsWith("-abstract") || id.endsWith("-evolved") || id.contains("-became-");
    if (id.startsWith("default-interface-") || id.startsWith("default-virtual-")) {
      boolean virtual = id.startsWith("default-virtual-");
      selection(id, virtual ? "DefaultVirtualCaller" : "DefaultInterfaceCaller", virtual ? "DefaultImpl" : "DefaultRole",
        "DefaultImpl", changed ? AME : null, 11, changed ? "" : "removed-default", null,
        b("DefaultImpl"), version(changed, "DefaultRole"));
    } else if (id.equals("subinterface-positive") || id.equals("subinterface-reabstract")) {
      changed = id.endsWith("-reabstract");
      selection(id, "ReCaller", "ReSub", "ReImpl", changed ? AME : null, 12, changed ? "" : "root-default", null,
        b("ReRoot"), version(changed, "ReSub"), b("ReImpl"));
    } else if (id.startsWith("conflict-interface-") || id.startsWith("conflict-virtual-")) {
      conflict(id, id.startsWith("conflict-virtual-"), changed);
    } else if (id.equals("super-default-positive") || id.equals("super-default-conflict")) {
      changed = id.endsWith("-conflict");
      selection(id, "SuperCaller", null, "SuperCaller", changed ? ICCE : null, 21, changed ? "" : "left-default", null,
        b("ConflictLeft"), version(changed, "ConflictRight"), b("ConflictImpl"));
    } else if (id.equals("single-default-positive") || id.equals("single-default-with-abstract")) {
      selection(id, "SingleCaller", "SingleImpl", "SingleImpl", null, 24, "single-default", null,
        b("SingleLeft"), version(changed, "SingleRight"), b("SingleImpl"));
    } else if (id.equals("diamond-common-default") || id.equals("diamond-more-specific-default")) {
      changed = id.equals("diamond-more-specific-default");
      selection(id, "DiamondCaller", "DiamondImpl", "DiamondImpl", null, changed ? 26 : 25,
        changed ? "diamond-left" : "diamond-root", null,
        b("DiamondRoot"), version(changed, "DiamondLeft"), b("DiamondRight"), b("DiamondImpl"));
    } else if (id.startsWith("class-interface-") || id.startsWith("class-virtual-")) {
      boolean virtual = id.startsWith("class-virtual-");
      selection(id, virtual ? "ClassVirtualCaller" : "ClassInterfaceCaller", virtual ? "ClassImpl" : "ClassRole",
        "ClassImpl", changed ? AME : null, 32, changed ? "" : "class-base", Boolean.valueOf(changed),
        b("ClassRole"), version(changed, "ClassBase"), b("ClassImpl"));
    } else if (id.equals("static-inherited-declaring-initialization") || id.equals("static-interface-declaring-initialization")) {
      initialization(id, id.equals("static-interface-declaring-initialization"));
    } else if (id.startsWith("static-class-") || id.startsWith("static-interface-")) {
      boolean iface = id.startsWith("static-interface-");
      String owner = iface ? "StaticRole" : "StaticClass";
      simple(id, owner + "Caller", null, changed ? ICCE : null, iface ? 42 : 41,
        changed ? "" : iface ? "static-role-init,static-role-body" : "static-class-init,static-class-body", version(changed, owner));
    } else if (id.startsWith("virtual-class-") || id.startsWith("virtual-interface-")) {
      String owner = id.startsWith("virtual-interface-") ? "VirtualRole" : "VirtualClass";
      simple(id, owner + "Caller", owner, changed ? ICCE : NPE, 0, "", version(changed, owner));
    } else if (id.equals("getstatic-positive") || id.equals("getstatic-became-instance")) {
      simple(id, "FieldStaticCaller", null, changed ? ICCE : null, 61, changed ? "" : "field-static-init",
        version(changed, "FieldStaticOwner"));
    } else if (id.equals("getfield-positive") || id.equals("getfield-became-static")) {
      simple(id, "FieldInstanceCaller", "FieldInstanceOwner", changed ? ICCE : NPE, 0, "", version(changed, "FieldInstanceOwner"));
    } else throw new AssertionError("Unknown invocation evolution case " + id);
  }

  public static void main(String[] args) throws Exception {
    require(args.length == 35, "Explicit host profile and complete 34-case evolved invocation manifest required");
    require(args[0].equals("pinned-native-21") || args[0].equals("pinned-native-25") || args[0].equals("jvms"),
      "Unknown invocation evolution expectation profile");
    native21Oracle = args[0].equals("pinned-native-21");
    for (int index = 1; index < args.length; index++) run(args[index]);
    System.out.println("INVOCATION_EVOLUTION_OK");
  }
}
