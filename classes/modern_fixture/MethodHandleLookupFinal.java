package classes.modern_test;

import classes.modern_test.methodhandle_lookup.LookupForeign;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.WrongMethodTypeException;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;

/** Source-only C1 direct-handle probes, with independent assertions and traces. */
public final class MethodHandleLookupFinal {
  private static final Object FIRST = new Object();
  private static final Object SECOND = new Object();
  private static final long WIDE = 9007199254740993L;
  private static int calls;
  private static int constructors;
  private static int branch;
  private static Object observed;
  public static long staticWideField;
  public static final long FINAL_WIDE = 9007199254740993L;

  public interface Facet {
    Object echo(Object value);
  }

  public static class Target implements Facet {
    public Object reference;
    public long wide;

    private Target(Object reference) {
      constructors++;
      this.reference = reference;
    }

    public Object echo(Object value) {
      calls++;
      branch = 1;
      observed = value;
      return value;
    }

    private Object privateEcho(Object value) {
      calls++;
      observed = value;
      return value;
    }
  }

  public static final class OverrideTarget extends Target {
    public OverrideTarget(Object reference) { super(reference); }

    public Object echo(Object value) {
      calls++;
      branch = 2;
      observed = value;
      return value;
    }

    static MethodHandle specialHandle() throws ReflectiveOperationException {
      return MethodHandles.lookup().findSpecial(Target.class, "echo",
          MethodType.methodType(Object.class, Object.class), OverrideTarget.class);
    }
  }

  public static final class Nest {
    static MethodHandle capability() throws ReflectiveOperationException {
      return MethodHandles.lookup().findStatic(MethodHandleLookupFinal.class, "privateEcho",
          MethodType.methodType(Object.class, Object.class));
    }
  }

  public static final class ForeignSub extends LookupForeign {
    static MethodHandle protectedHandle() throws ReflectiveOperationException {
      return MethodHandles.lookup().findVirtual(LookupForeign.class, "protectedEcho",
          MethodType.methodType(Object.class, Object.class));
    }
  }

  private static void check(boolean value) {
    if (!value) throw new AssertionError("C1 Lookup probe failed");
  }

  private static void reset() {
    calls = 0;
    constructors = 0;
    branch = 0;
    observed = null;
    LookupForeign.calls = 0;
  }

  private static void emit(String id, String trace) {
    System.out.print(id);
    System.out.print('=');
    System.out.println(trace);
  }

  public static Object staticWide(long value, double decimal, Object reference) {
    check(value == WIDE && Double.doubleToRawLongBits(decimal) == Double.doubleToRawLongBits(-0.0d));
    calls++;
    observed = reference;
    return reference;
  }

  private static Object privateEcho(Object reference) {
    calls++;
    observed = reference;
    return reference;
  }

  public static void caseAuthority() throws Throwable {
    reset();
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    check(lookup.lookupClass() == MethodHandleLookupFinal.class && lookup.hasFullPrivilegeAccess());
    int original = lookup.lookupModes();
    check((original & (MethodHandles.Lookup.PRIVATE | MethodHandles.Lookup.MODULE | MethodHandles.Lookup.ORIGINAL)) ==
        (MethodHandles.Lookup.PRIVATE | MethodHandles.Lookup.MODULE | MethodHandles.Lookup.ORIGINAL));
    MethodHandles.Lookup restricted = lookup.dropLookupMode(MethodHandles.Lookup.PRIVATE);
    check(!restricted.hasFullPrivilegeAccess());
    check((restricted.lookupModes() & (MethodHandles.Lookup.PRIVATE | MethodHandles.Lookup.PROTECTED |
        MethodHandles.Lookup.ORIGINAL)) == 0);
    check((restricted.lookupModes() & MethodHandles.Lookup.PACKAGE) != 0);
    check(MethodHandles.publicLookup().lookupModes() == MethodHandles.Lookup.UNCONDITIONAL);
    int denied = 0;
    try {
      restricted.findStatic(MethodHandleLookupFinal.class, "privateEcho",
          MethodType.methodType(Object.class, Object.class));
    } catch (IllegalAccessException expected) { denied++; }
    check(denied == 1 && calls == 0 && observed == null);
    emit("lookup-authority", "original=private/module/original;drop-private=package-retained;public=unconditional;denied=1;effects=0");
  }

  public static void caseStaticWide() throws Throwable {
    reset();
    MethodHandle handle = MethodHandles.publicLookup().findStatic(MethodHandleLookupFinal.class, "staticWide",
        MethodType.methodType(Object.class, long.class, double.class, Object.class));
    Object result = (Object) handle.invokeExact(WIDE, -0.0d, FIRST);
    check(result == FIRST && observed == FIRST && calls == 1);
    emit("lookup-static-wide", "reference=same;long=9007199254740993;double=-0.0;effects=1");
  }

  public static void caseVirtualDispatch() throws Throwable {
    Target receiver = new OverrideTarget(FIRST);
    reset();
    MethodHandle handle = MethodHandles.lookup().findVirtual(Target.class, "echo",
        MethodType.methodType(Object.class, Object.class));
    check(handle.type().parameterType(0) == Target.class);
    Object result = (Object) handle.invokeExact(receiver, SECOND);
    check(result == SECOND && observed == SECOND && branch == 2 && calls == 1);
    emit("lookup-virtual-dispatch", "receiver=Target;dispatch=override;reference=same;effects=1");
  }

  public static void caseInterfaceDispatch() throws Throwable {
    Facet receiver = new OverrideTarget(FIRST);
    reset();
    MethodHandle handle = MethodHandles.lookup().findVirtual(Facet.class, "echo",
        MethodType.methodType(Object.class, Object.class));
    Object result = (Object) handle.invokeExact(receiver, SECOND);
    check(handle.type().parameterType(0) == Facet.class);
    check(result == SECOND && branch == 2 && observed == SECOND && calls == 1);
    emit("lookup-interface-dispatch", "receiver=Facet;dispatch=override;reference=same;effects=1");
  }

  public static void caseSpecialNonvirtual() throws Throwable {
    OverrideTarget receiver = new OverrideTarget(FIRST);
    reset();
    MethodHandle handle = OverrideTarget.specialHandle();
    check(handle.type().parameterType(0) == OverrideTarget.class);
    Object result = (Object) handle.invokeExact(receiver, SECOND);
    check(result == SECOND && branch == 1 && observed == SECOND && calls == 1);
    emit("lookup-special-nonvirtual", "receiver=OverrideTarget;dispatch=base;reference=same;effects=1");
  }

  public static void caseConstructorIdentity() throws Throwable {
    reset();
    MethodHandle handle = MethodHandles.lookup().findConstructor(Target.class,
        MethodType.methodType(void.class, Object.class));
    check(handle.type().returnType() == Target.class);
    Target first = (Target) handle.invokeExact(FIRST);
    Target second = (Target) handle.invokeExact(FIRST);
    check(first != second && first.reference == FIRST && second.reference == FIRST && constructors == 2 && calls == 0);
    emit("lookup-constructor-identity", "result=Target;allocations=distinct;payload=same;constructors=2;calls=0");
  }

  public static void caseInstanceReferenceFields() throws Throwable {
    Target receiver = new Target(FIRST);
    reset();
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle getter = lookup.findGetter(Target.class, "reference", Object.class);
    MethodHandle setter = lookup.findSetter(Target.class, "reference", Object.class);
    Object before = (Object) getter.invokeExact(receiver);
    setter.invokeExact(receiver, SECOND);
    Object after = (Object) getter.invokeExact(receiver);
    check(before == FIRST && after == SECOND && receiver.reference == SECOND && calls == 0);
    emit("lookup-instance-reference-fields", "before=first;after=second;stored=same;calls=0");
  }

  public static void caseInstanceWideFields() throws Throwable {
    Target receiver = new Target(FIRST);
    reset();
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle setter = lookup.findSetter(Target.class, "wide", long.class);
    MethodHandle getter = lookup.findGetter(Target.class, "wide", long.class);
    setter.invokeExact(receiver, WIDE);
    long result = (long) getter.invokeExact(receiver);
    check(result == WIDE && receiver.wide == WIDE && calls == 0);
    emit("lookup-instance-wide-fields", "long=9007199254740993;stored=exact;calls=0");
  }

  public static void caseStaticWideFields() throws Throwable {
    reset();
    staticWideField = -1L;
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle setter = lookup.findStaticSetter(MethodHandleLookupFinal.class, "staticWideField", long.class);
    MethodHandle getter = lookup.findStaticGetter(MethodHandleLookupFinal.class, "staticWideField", long.class);
    setter.invokeExact(WIDE);
    long result = (long) getter.invokeExact();
    check(result == WIDE && staticWideField == WIDE && calls == 0);
    emit("lookup-static-wide-fields", "long=9007199254740993;stored=exact;calls=0");
  }

  public static void casePrivateNestCapability() throws Throwable {
    reset();
    MethodHandle handle = Nest.capability();
    Object result = (Object) handle.invokeExact(FIRST);
    check(result == FIRST && observed == FIRST && calls == 1);
    int denied = 0;
    try {
      MethodHandles.publicLookup().findStatic(MethodHandleLookupFinal.class, "privateEcho",
          MethodType.methodType(Object.class, Object.class));
    } catch (IllegalAccessException expected) { denied++; }
    check(denied == 1 && calls == 1);
    emit("lookup-private-nest-capability", "nest-creation=allowed;transferred-invocation=same;public-creation=denied;effects=1");
  }

  public static void casePrivateLookupIn() throws Throwable {
    Target receiver = new Target(FIRST);
    reset();
    MethodHandles.Lookup privateLookup = MethodHandles.privateLookupIn(Target.class, MethodHandles.lookup());
    check(privateLookup.lookupClass() == Target.class && privateLookup.hasFullPrivilegeAccess());
    check((privateLookup.lookupModes() & MethodHandles.Lookup.PRIVATE) != 0);
    MethodHandle handle = privateLookup.findVirtual(Target.class, "privateEcho",
        MethodType.methodType(Object.class, Object.class));
    Object result = (Object) handle.invokeExact(receiver, SECOND);
    int denied = 0;
    try { MethodHandles.privateLookupIn(Target.class, MethodHandles.publicLookup()); }
    catch (IllegalAccessException expected) { denied++; }
    check(result == SECOND && observed == SECOND && calls == 1 && denied == 1);
    emit("lookup-private-lookup-in", "lookup-class=Target;private=enabled;reference=same;public-caller=denied;effects=1");
  }

  public static void casePackageAccess() throws Throwable {
    reset();
    MethodHandle handle = MethodHandles.lookup().findStatic(LookupPackagePeer.class, "echo",
        MethodType.methodType(Object.class, Object.class));
    Object result = (Object) handle.invokeExact(FIRST);
    int denied = 0;
    try {
      MethodHandles.publicLookup().findStatic(LookupPackagePeer.class, "echo",
          MethodType.methodType(Object.class, Object.class));
    } catch (IllegalAccessException expected) { denied++; }
    check(result == FIRST && denied == 1 && calls == 1 && observed == FIRST);
    emit("lookup-package-access", "same-package=allowed;public-only=denied;reference=same;effects=1");
  }

  public static void caseProtectedReceiver() throws Throwable {
    reset();
    MethodHandle handle = ForeignSub.protectedHandle();
    check(handle.type().parameterType(0) == ForeignSub.class);
    ForeignSub receiver = new ForeignSub();
    Object result = (Object) handle.invokeExact(receiver, FIRST);
    int rejected = 0;
    try {
      Object unused = (Object) handle.invokeExact((LookupForeign) receiver, FIRST);
      check(unused == SECOND);
    } catch (WrongMethodTypeException expected) { rejected++; }
    check(result == FIRST && LookupForeign.calls == 1 && rejected == 1);
    emit("lookup-protected-receiver", "receiver=narrowed-ForeignSub;reference=same;wrong-exact-type=rejected;effects=1");
  }

  public static void caseUnreflectIdentity() throws Throwable {
    Target receiver = new OverrideTarget(FIRST);
    reset();
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Method method = Target.class.getDeclaredMethod("echo", Object.class);
    MethodHandle virtual = lookup.unreflect(method);
    Object first = (Object) virtual.invokeExact(receiver, FIRST);
    Method privateMethod = Target.class.getDeclaredMethod("privateEcho", Object.class);
    MethodHandle privateHandle = lookup.unreflect(privateMethod);
    Object second = (Object) privateHandle.invokeExact(receiver, SECOND);
    Constructor<Target> constructor = Target.class.getDeclaredConstructor(Object.class);
    MethodHandle maker = lookup.unreflectConstructor(constructor);
    Target made = (Target) maker.invokeExact(FIRST);
    int denied = 0;
    try { MethodHandles.publicLookup().unreflect(privateMethod); }
    catch (IllegalAccessException expected) { denied++; }
    check(first == FIRST && second == SECOND && made.reference == FIRST && calls == 2 && constructors == 1 && denied == 1);
    emit("lookup-unreflect-identity", "virtual=override;private=same;constructor-payload=same;public-private=denied;calls=2;constructors=1");
  }

  public static void caseCreationErrors() throws Throwable {
    reset();
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    int missing = 0;
    int denied = 0;
    try { lookup.findStatic(MethodHandleLookupFinal.class, "missing", MethodType.methodType(void.class)); }
    catch (NoSuchMethodException expected) { missing++; }
    try { lookup.findStatic(MethodHandleLookupFinal.class, "staticWide", MethodType.methodType(Object.class, int.class)); }
    catch (NoSuchMethodException expected) { missing++; }
    try { lookup.findStatic(LookupForeign.class, "privateEcho", MethodType.methodType(Object.class, Object.class)); }
    catch (IllegalAccessException expected) { denied++; }
    try { lookup.findStaticSetter(MethodHandleLookupFinal.class, "FINAL_WIDE", long.class); }
    catch (IllegalAccessException expected) { denied++; }
    check(missing == 2 && denied == 2 && calls == 0 && LookupForeign.calls == 0 && observed == null);
    emit("lookup-creation-errors", "missing=2;denied=2;effects=0;reference=unobserved");
  }

  public static void caseNullReceiver() throws Throwable {
    reset();
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle virtual = lookup.findVirtual(Target.class, "echo", MethodType.methodType(Object.class, Object.class));
    MethodHandle getter = lookup.findGetter(Target.class, "reference", Object.class);
    int rejected = 0;
    try {
      Object unused = (Object) virtual.invokeExact((Target) null, FIRST);
      check(unused == SECOND);
    } catch (NullPointerException expected) { rejected++; }
    try {
      Object unused = (Object) getter.invokeExact((Target) null);
      check(unused == SECOND);
    } catch (NullPointerException expected) { rejected++; }
    check(rejected == 2 && calls == 0 && observed == null);
    emit("lookup-null-receiver", "null-virtual/getter=rejected;effects=0;reference=unobserved");
  }

  static Object packageEcho(Object reference) { return privateEcho(reference); }

  public static void main(String[] args) throws Throwable {
    caseAuthority();
    caseStaticWide();
    caseVirtualDispatch();
    caseInterfaceDispatch();
    caseSpecialNonvirtual();
    caseConstructorIdentity();
    caseInstanceReferenceFields();
    caseInstanceWideFields();
    caseStaticWideFields();
    casePrivateNestCapability();
    casePrivateLookupIn();
    casePackageAccess();
    caseProtectedReceiver();
    caseUnreflectIdentity();
    caseCreationErrors();
    caseNullReceiver();
    System.out.println("METHODHANDLE_LOOKUP_OK");
  }
}

final class LookupPackagePeer {
  static Object echo(Object reference) { return MethodHandleLookupFinal.packageEcho(reference); }
}
