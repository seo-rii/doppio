package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.HashMap;

/** Genuine access, nest identity and per-constant-pool failure controls. */
public class JavaMemberAccess {
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
  private static String b(String name) { return "baseline:" + name; }

  private static byte[] read(String stage, String name) throws Exception {
    InputStream input = JavaMemberAccess.class.getResourceAsStream(
      "/member-access-cases/" + stage + "/" + name.replace('.', '/') + ".bin");
    require(input != null, "Missing genuine member-access payload " + stage + ":" + name);
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
    String delayedName;
    boolean available;
    boolean transientOome;
    int delayedAttempts;

    PayloadLoader(ClassLoader parent, String... payloads) {
      super(parent);
      for (String payload : payloads) {
        int separator = payload.indexOf(':');
        require(stages.put(payload.substring(separator + 1), payload.substring(0, separator)) == null,
          "Duplicate exact payload name");
      }
    }

    @Override protected synchronized Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
      if (name.equals(delayedName)) {
        delayedAttempts++;
        if (transientOome && delayedAttempts == 1) throw new OutOfMemoryError("Controlled first loader attempt");
        if (!available) throw new ClassNotFoundException(name);
      }
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

    Class<?> type(String name) throws Exception { return Class.forName(name, false, this); }

    Method ready(String name, String method) throws Exception {
      Class<?> type = type(name);
      require(type.getClassLoader() == this, "Caller must have its exact defining loader");
      Method result = type.getMethod(method);
      require(effects.length() == 0, "Preparing caller metadata initialized or executed a target");
      return result;
    }
  }

  private static ClassLoader driverLoader() { return JavaMemberAccess.class.getClassLoader(); }

  private static Object invoke(String id, String phase, Method method, String expectedError, String expectedValue) throws Exception {
    Object value = null;
    Throwable failure = null;
    try { value = method.invoke(null); }
    catch (InvocationTargetException caught) { failure = caught.getCause(); }
    catch (Throwable caught) { failure = caught; }
    String actual = failure == null ? "accepted" : failure.getClass().getName();
    require(actual.equals(expectedError), id + ": expected " + expectedError + "@" + phase + ", got " + actual);
    emit(id, actual + "@" + phase);
    if (failure == null) {
      String rendered = value instanceof Class<?> ? "class:" + ((Class<?>) value).getName() : String.valueOf(value);
      require(rendered.equals(expectedValue), id + ": wrong result " + rendered);
      emit(id, "value@" + phase + "=" + rendered);
    }
    return value;
  }

  private static void effects(String id, String expected) {
    require(effects.toString().equals(expected), id + ": unexpected effects " + effects.toString());
    emit(id, "effects=" + (expected.length() == 0 ? "none" : expected));
  }

  private static void access(String id, String caller, String owner, String ownerStage, boolean split,
      String expectedError, String expectedValue, String expectedEffects) throws Exception {
    PayloadLoader parent = split ? new PayloadLoader(driverLoader(), ownerStage + ":" + owner) : null;
    PayloadLoader loader = split ? new PayloadLoader(parent, b(caller)) :
      new PayloadLoader(driverLoader(), b(caller), ownerStage + ":" + owner);
    Class<?> target = loader.type(owner);
    Method method = loader.ready(caller, "run");
    require(target.getClassLoader() == (split ? parent : loader), "Exact target defining loader");
    require((method.getDeclaringClass().getClassLoader() == target.getClassLoader()) == !split,
      "Runtime package identity cannot be inferred from package spelling");
    emit(id, "metadata-ready-no-effects");
    emit(id, "defining-loaders=" + (split ? "distinct" : "shared"));
    Object value = invoke(id, "invoke", method, expectedError, expectedValue);
    if (value instanceof Class<?>) {
      Class<?> leaf = (Class<?>) value;
      while (leaf.isArray()) leaf = leaf.getComponentType();
      require(leaf == target, "Class/array reference must retain actual leaf identity");
    }
    effects(id, expectedEffects);
  }

  private static void members(Class<?> type, Class<?> host, Class<?>[] expected) {
    Class<?>[] actual = type.getNestMembers();
    require(actual.length == expected.length && actual[0] == host, "Exact nest members and host-first rule");
    for (Class<?> member : expected) {
      int count = 0;
      for (Class<?> candidate : actual) if (candidate == member) count++;
      require(count == 1, "Nest membership must use actual class identity exactly once");
    }
  }

  private static void nest(String id, String mode, String operation) throws Exception {
    String[] baseline = {b("nests.Host"), b("nests.Host$Member"), b("nests.Host$Probe"), b("nests.Host$Retained")};
    PayloadLoader hostLoader, memberLoader;
    if (mode.equals("split")) {
      hostLoader = new PayloadLoader(driverLoader(), baseline);
      memberLoader = new PayloadLoader(hostLoader, b("nests.Host$Member"));
    } else {
      String hostStage = mode.equals("valid") ? "baseline" : mode;
      hostLoader = new PayloadLoader(driverLoader(), hostStage + ":nests.Host", b("nests.Host$Member"),
        b("nests.Host$Probe"), b("nests.Host$Retained"));
      memberLoader = hostLoader;
    }
    Class<?> host = hostLoader.type("nests.Host");
    Class<?> member = memberLoader.type("nests.Host$Member");
    Method method = memberLoader.ready("nests.Host$Member", operation);
    boolean valid = mode.equals("valid");
    int hostCount = mode.equals("plain") ? 1 : mode.equals("unlisted") ? 2 : 4;
    Class<?>[] expected = hostCount == 1 ? new Class<?>[] {host} : hostCount == 2 ?
      new Class<?>[] {host, hostLoader.type("nests.Host$Retained")} :
      new Class<?>[] {host, hostLoader.type("nests.Host$Member"), hostLoader.type("nests.Host$Probe"), hostLoader.type("nests.Host$Retained")};
    require(host.getNestHost() == host && member.getNestHost() == (valid ? host : member), "Determined host identity");
    members(host, host, expected);
    members(member, valid ? host : member, valid ? expected : new Class<?>[] {member});
    require(host.isNestmateOf(member) == valid && member.isNestmateOf(host) == valid && member.isNestmateOf(member),
      "Symmetric nestmate identity and same-class shortcut");
    if (mode.equals("split")) require(hostLoader.type("nests.Host$Member") != member,
      "Same-name members in separate defining loaders remain independent");
    require(effects.length() == 0, "Nest reflection must not initialize host or members");
    emit(id, "metadata-ready-no-effects");
    emit(id, "nest-host=" + (valid ? "host" : "self"));
    emit(id, "nest-members=host:" + hostCount + ",member:" + (valid ? 4 : 1));
    emit(id, "nestmate=" + valid);
    String value = operation.equals("field") ? "31" : operation.equals("method") ? "32" : "33";
    invoke(id, "invoke", method, valid ? "accepted" : "java.lang.IllegalAccessError", value);
    String expectedEffects = valid || operation.equals("constructor") ? "nest-init" : "";
    if (valid && !operation.equals("field")) expectedEffects += ",nest-" + operation;
    effects(id, expectedEffects);
  }

  private static void attempts(String id, String phase, PayloadLoader loader, int expected) {
    require(loader.delayedAttempts == expected, id + ": unexpected loader attempts " + loader.delayedAttempts + "@" + phase);
    emit(id, "load-attempts@" + phase + "=" + expected);
  }

  private static void sticky(String id, String kind) throws Exception {
    String stem = kind.substring(0, 1).toUpperCase() + kind.substring(1), caller = "retry." + stem + "Caller",
      fresh = "retry.Fresh" + stem + "Caller";
    PayloadLoader loader = new PayloadLoader(driverLoader(), b("retry.Target"), b(caller), b(fresh));
    loader.delayedName = "retry.Target";
    Method original = loader.ready(caller, "run"), independent = loader.ready(fresh, "run");
    emit(id, "metadata-ready-no-effects");
    attempts(id, "prepare", loader, 0);
    invoke(id, "first", original, "java.lang.NoClassDefFoundError", null);
    attempts(id, "first", loader, 1);
    effects(id, "");
    loader.available = true;
    invoke(id, "retry", original, "java.lang.NoClassDefFoundError", null);
    attempts(id, "retry", loader, 1);
    effects(id, "");
    String value = kind.equals("class") ? "class:retry.Target" : kind.equals("field") ? "71" : "72";
    Object result = invoke(id, "independent", independent, "accepted", value);
    attempts(id, "independent", loader, 2);
    if (kind.equals("class")) require(((Class<?>) result).getClassLoader() == loader, "Fresh reference target identity");
    String expectedEffects = kind.equals("class") ? "" : kind.equals("field") ? "retry-init" : "retry-init,retry-method";
    effects(id, expectedEffects);
    invoke(id, "after-publication", original, "java.lang.NoClassDefFoundError", null);
    attempts(id, "after-publication", loader, 2);
    effects(id, expectedEffects);
  }

  private static void nestFailure(String id) throws Exception {
    PayloadLoader loader = new PayloadLoader(driverLoader(), b("nests.Host"), b("nests.Host$Member"),
      b("nests.Host$Probe"), b("nests.Host$Retained"), b("nests.FreshHostCaller"));
    loader.delayedName = "nests.Host";
    Class<?> probe = loader.type("nests.Host$Probe");
    require(probe.isNestmateOf(probe), "Same-class nestmate must succeed without host lookup");
    attempts(id, "self-nestmate", loader, 0);
    require(probe.getNestHost() == probe, "Host resolution failure is swallowed and falls back to self");
    attempts(id, "getNestHost", loader, 1);
    members(probe, probe, new Class<?>[] {probe});
    require(effects.length() == 0, "Failed nest metadata lookup must not initialize anything");
    emit(id, "nest-host=self-without-throw");
    loader.available = true;
    Method original = loader.ready("nests.Host$Probe", "hostLiteral"), fresh = loader.ready("nests.FreshHostCaller", "run");
    emit(id, "metadata-ready-no-effects");
    invoke(id, "same-cp", original, "java.lang.NoClassDefFoundError", null);
    attempts(id, "same-cp", loader, 1);
    invoke(id, "retry", original, "java.lang.NoClassDefFoundError", null);
    attempts(id, "retry", loader, 1);
    Class<?> host = (Class<?>) invoke(id, "independent", fresh, "accepted", "class:nests.Host");
    attempts(id, "independent", loader, 2);
    require(host.getClassLoader() == loader && probe.getNestHost() == probe && !probe.isNestmateOf(host),
      "Nest fallback remains stable after successful independent host publication");
    invoke(id, "after-publication", original, "java.lang.NoClassDefFoundError", null);
    attempts(id, "after-publication", loader, 2);
    effects(id, "");
  }

  private static void transientClass(String id) throws Exception {
    PayloadLoader loader = new PayloadLoader(driverLoader(), b("retry.Target"), b("retry.ClassCaller"));
    loader.delayedName = "retry.Target";
    loader.available = loader.transientOome = true;
    Method method = loader.ready("retry.ClassCaller", "run");
    emit(id, "metadata-ready-no-effects");
    attempts(id, "prepare", loader, 0);
    invoke(id, "first", method, "java.lang.OutOfMemoryError", null);
    attempts(id, "first", loader, 1);
    effects(id, "");
    Class<?> target = (Class<?>) invoke(id, "retry", method, "accepted", "class:retry.Target");
    attempts(id, "retry", loader, 2);
    require(target.getClassLoader() == loader, "Transient class reference retains exact recovered identity");
    require(invoke(id, "cached", method, "accepted", "class:retry.Target") == target, "Successful reference becomes stable");
    attempts(id, "cached", loader, 2);
    effects(id, "");
  }

  private static void transientNestHost(String id) throws Exception {
    PayloadLoader loader = new PayloadLoader(driverLoader(), b("nests.Host"), b("nests.Host$Probe"));
    loader.delayedName = "nests.Host";
    loader.available = loader.transientOome = true;
    Class<?> probe = loader.type("nests.Host$Probe");
    Throwable failure = null;
    try { probe.getNestHost(); } catch (Throwable caught) { failure = caught; }
    require(failure != null && failure.getClass().getName().equals("java.lang.OutOfMemoryError"),
      "Selected pinned-native resource-error policy propagates VME without determining SELF");
    emit(id, "java.lang.OutOfMemoryError@getNestHost-first");
    attempts(id, "first", loader, 1);
    effects(id, "");
    Class<?> host = probe.getNestHost();
    require(host != probe && host.getName().equals("nests.Host") && host.getClassLoader() == loader,
      "Transient VME leaves nest-host determination retryable");
    emit(id, "accepted@getNestHost-retry");
    attempts(id, "retry", loader, 2);
    emit(id, "nest-host=host-after-retry");
    Method method = loader.ready("nests.Host$Probe", "hostLiteral");
    emit(id, "metadata-ready-no-effects");
    require(invoke(id, "same-cp", method, "accepted", "class:nests.Host") == host, "Host metadata and literal share recovered CP identity");
    attempts(id, "same-cp", loader, 2);
    require(probe.getNestHost() == host && probe.isNestmateOf(host), "Recovered genuine nest identity is stable");
    require(invoke(id, "cached", method, "accepted", "class:nests.Host") == host, "Recovered host class CP result is stable");
    attempts(id, "cached", loader, 2);
    effects(id, "");
  }

  private static void transientNestMembers(String id) throws Exception {
    PayloadLoader loader = new PayloadLoader(driverLoader(), b("nests.Host"), b("nests.Host$Member"),
      b("nests.Host$Probe"), b("nests.Host$Retained"));
    loader.delayedName = "nests.Host$Member";
    loader.available = loader.transientOome = true;
    Class<?> host = loader.type("nests.Host");
    require(effects.length() == 0, "Host metadata must not initialize targets");
    emit(id, "metadata-ready-no-effects");
    Throwable failure = null;
    try { host.getNestMembers(); } catch (Throwable caught) { failure = caught; }
    require(failure != null && failure.getClass().getName().equals("java.lang.OutOfMemoryError"),
      "getNestMembers must propagate non-Linkage VM failures");
    emit(id, "java.lang.OutOfMemoryError@getNestMembers-first");
    attempts(id, "first", loader, 1);
    effects(id, "");
    Class<?>[] recovered = host.getNestMembers();
    require(recovered.length == 4 && recovered[0] == host, "Retry recovers the complete host-first nest");
    String[] expected = {"nests.Host", "nests.Host$Member", "nests.Host$Probe", "nests.Host$Retained"};
    for (String name : expected) {
      int count = 0;
      for (Class<?> member : recovered) {
        require(member.getClassLoader() == loader && member.getNestHost() == host, "Recovered nest uses exact loader/host identities");
        if (member.getName().equals(name)) count++;
      }
      require(count == 1, "Every genuine declared member is recovered exactly once");
    }
    emit(id, "accepted@getNestMembers-retry");
    emit(id, "nest-members=4");
    attempts(id, "retry", loader, 2);
    members(host, host, recovered);
    emit(id, "accepted@getNestMembers-cached");
    attempts(id, "cached", loader, 2);
    effects(id, "");
  }

  private static void run(String id) throws Exception {
    effects.setLength(0);
    if (id.startsWith("package-") || id.startsWith("protected-")) {
      String[] parts = id.split("-");
      boolean subclass = parts[1].equals("subclass"), field = parts[subclass ? 2 : 1].equals("field");
      boolean protectedAccess = parts[0].equals("protected"), split = subclass || parts[2].equals("split");
      String owner = "access." + (protectedAccess ? "ProtectedOwner" : "PackageOwner");
      String caller = subclass ? "outside.ProtectedSubclass" + (field ? "Field" : "Method") :
        "access." + (protectedAccess ? "Protected" : "Package") + (field ? "FieldCaller" : "MethodCaller");
      boolean accepted = !split || subclass;
      String marker = protectedAccess ? "protected" : "package";
      access(id, caller, owner, "baseline", split, accepted ? "accepted" : "java.lang.IllegalAccessError",
        field ? (protectedAccess ? "21" : "11") : (protectedAccess ? "22" : "12"),
        accepted ? marker + "-init" + (field ? "" : "," + marker + "-method") : "");
    } else if (id.startsWith("hidden-")) {
      boolean array = id.startsWith("hidden-array"), split = id.endsWith("split");
      access(id, "access.Hidden" + (array ? "Array" : "") + "Caller", "access.Hidden", "baseline", split,
        split ? "java.lang.IllegalAccessError" : "accepted", array ? "class:[[Laccess.Hidden;" : "class:access.Hidden", "");
    } else if (id.startsWith("evolved-")) {
      boolean array = id.startsWith("evolved-array"), hidden = id.endsWith("hidden");
      access(id, "outside.Visible" + (array ? "Array" : "") + "Caller", "access.Visible", hidden ? "hidden" : "baseline", false,
        hidden ? "java.lang.IllegalAccessError" : "accepted", array ? "class:[[Laccess.Visible;" : "class:access.Visible", "");
    } else if (id.equals("class-resolution-transient-oome")) transientClass(id);
    else if (id.equals("nest-host-transient-oome")) transientNestHost(id);
    else if (id.equals("nest-members-transient-oome")) transientNestMembers(id);
    else if (id.equals("nest-host-failure-sticky")) nestFailure(id);
    else if (id.startsWith("nest-")) {
      String[] parts = id.split("-");
      nest(id, parts[2], parts[1]);
    } else if (id.endsWith("-resolution-failure-sticky")) sticky(id, id.substring(0, id.indexOf('-')));
    else throw new AssertionError("Unknown mandatory member-access case " + id);
  }

  public static void main(String[] arguments) throws Exception {
    require(arguments.length == 37, "Complete mandatory member-access inventory");
    HashMap<String, Boolean> seen = new HashMap<String, Boolean>();
    for (String id : arguments) {
      require(seen.put(id, Boolean.TRUE) == null, "Repeated mandatory case");
      run(id);
    }
    System.out.println("MEMBER_ACCESS_OK");
  }
}
