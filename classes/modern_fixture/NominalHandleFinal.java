package classes.modern_test;

import java.lang.constant.ClassDesc;
import java.lang.constant.Constable;
import java.lang.constant.ConstantDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.DirectMethodHandleDesc;
import java.lang.constant.MethodHandleDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.WrongMethodTypeException;
import static classes.modern_test.NominalConstantSupport.*;

/** C6 original-source nominal method-handle metadata and execution contracts. */
public final class NominalHandleFinal {
  private static final long WIDE = 9007199254740993L;
  private static final ClassDesc TARGET = ClassDesc.of("classes.modern_test.NominalHandleFinal$Target");
  private static final ClassDesc INTERFACE = ClassDesc.of("classes.modern_test.NominalHandleFinal$WideInterface");
  private static final MethodTypeDesc WIDE_TYPE = MethodTypeDesc.of(ConstantDescs.CD_long, ConstantDescs.CD_long);

  public static class Target {
    public static long staticValue = WIDE;
    public static int calls;
    public long instanceValue;
    public final long finalValue;
    private long privateValue;

    public Target(long value) {
      instanceValue = value;
      finalValue = value + 1;
      privateValue = value + 2;
      calls++;
    }

    public static MethodHandles.Lookup lookup() { return MethodHandles.lookup(); }
    public static long staticWide(long value) { calls++; return value + 1; }
    public long virtualWide(long value) { calls++; return instanceValue + value; }
    public long specialWide(long value) { calls++; return instanceValue + value + 2; }
    private static long privateWide(long value) { calls++; return value + 3; }
  }

  public static final class Derived extends Target {
    public Derived(long value) { super(value); }
    public static MethodHandles.Lookup lookup() { return MethodHandles.lookup(); }
    public long virtualWide(long value) { calls++; return instanceValue + value + 10; }
    public long specialWide(long value) { calls++; return instanceValue + value + 20; }
  }

  public interface WideInterface {
    long interfaceWide(long value);
    default long defaultWide(long value) { Target.calls++; return value + 5; }
    static long staticWide(long value) { Target.calls++; return value + 4; }
  }

  public static final class InterfaceCaller implements WideInterface {
    public static MethodHandles.Lookup lookup() { return MethodHandles.lookup(); }
    public long interfaceWide(long value) { Target.calls++; return value + 6; }
    public long defaultWide(long value) { Target.calls++; return value + 50; }
  }

  public static final class HiddenPayload {
    public static long wide(long value) { return value + 9; }
    public static Class<?> mirror() { return HiddenPayload.class; }
  }

  private static void caseKindMetadata() {
    DirectMethodHandleDesc.Kind[] kinds = {
      DirectMethodHandleDesc.Kind.STATIC, DirectMethodHandleDesc.Kind.INTERFACE_STATIC,
      DirectMethodHandleDesc.Kind.VIRTUAL, DirectMethodHandleDesc.Kind.INTERFACE_VIRTUAL,
      DirectMethodHandleDesc.Kind.SPECIAL, DirectMethodHandleDesc.Kind.INTERFACE_SPECIAL,
      DirectMethodHandleDesc.Kind.CONSTRUCTOR, DirectMethodHandleDesc.Kind.GETTER,
      DirectMethodHandleDesc.Kind.SETTER, DirectMethodHandleDesc.Kind.STATIC_GETTER,
      DirectMethodHandleDesc.Kind.STATIC_SETTER
    };
    int[] refKinds = {6, 6, 5, 9, 7, 7, 8, 1, 3, 2, 4};
    boolean[] interfaces = {false, true, false, true, false, true, false, false, false, false, false};
    String owner = "Lclasses/modern_test/NominalHandleFinal$Target;";
    String iface = "Lclasses/modern_test/NominalHandleFinal$WideInterface;";
    String[] invocationTypes = {"(J)J", "(J)J", "(" + owner + "J)J", "(" + iface + "J)J",
      "(" + owner + "J)J", "(" + iface + "J)J", "()" + owner, "(" + owner + ")J",
      "(" + owner + "J)V", "()J", "(J)V"};
    for (int i = 0; i < kinds.length; i++) {
      boolean field = i >= 7;
      String descriptor = field ? "J" : i == 6 ? "()V" : "(J)J";
      ClassDesc declaring = interfaces[i] ? INTERFACE : TARGET;
      DirectMethodHandleDesc handle = MethodHandleDesc.of(kinds[i], declaring, "wide", descriptor);
      check(handle.kind() == kinds[i] && handle.refKind() == refKinds[i]);
      check(handle.isOwnerInterface() == interfaces[i] && handle.owner().equals(declaring));
      check(handle.lookupDescriptor().equals(descriptor));
      check(handle.methodName().equals(i == 6 ? "<init>" : "wide"));
      check(handle.invocationType().descriptorString().equals(invocationTypes[i]));
      check(DirectMethodHandleDesc.Kind.valueOf(refKinds[i], interfaces[i]) == kinds[i]);
      check(kinds[i].refKind == refKinds[i] && kinds[i].isInterface == interfaces[i]);
    }
    int rejected = 0;
    for (int value : new int[] {0, 10}) {
      try { DirectMethodHandleDesc.Kind.valueOf(value); }
      catch (IllegalArgumentException expected) { rejected++; }
    }
    check(rejected == 2);
    emit("nc-handle-kind-metadata", "kinds=11;reference/interface/owner/lookup/invocation=exact;invalid-reference=2");
  }

  private static void caseFactoryEquality() {
    DirectMethodHandleDesc first = MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC,
        TARGET, "staticWide", WIDE_TYPE);
    DirectMethodHandleDesc second = MethodHandleDesc.of(DirectMethodHandleDesc.Kind.STATIC,
        TARGET, "staticWide", "(J)J");
    check(first.equals(second) && second.equals(first) && first.hashCode() == second.hashCode());
    check(!first.equals(null) && !first.equals("staticWide"));
    check(!first.equals(MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.VIRTUAL,
        TARGET, "staticWide", WIDE_TYPE)));
    check(first.asType(first.invocationType()) == first);
    DirectMethodHandleDesc constructor = MethodHandleDesc.ofConstructor(TARGET, ConstantDescs.CD_long);
    check(constructor.equals(MethodHandleDesc.of(DirectMethodHandleDesc.Kind.CONSTRUCTOR, TARGET, null, "(J)V")));
    check(constructor.equals(MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.CONSTRUCTOR,
        TARGET, "ignored/name", MethodTypeDesc.of(ConstantDescs.CD_void, ConstantDescs.CD_long))));
    check(constructor.methodName().equals("<init>") && constructor.lookupDescriptor().equals("(J)V"));
    check(constructor.invocationType().descriptorString().equals("(J)Lclasses/modern_test/NominalHandleFinal$Target;"));
    emit("nc-handle-factory-equality", "of/ofMethod=equal/hash;constructor-name=null/invalid-ignored;invocation=receiver-result;identity-asType=true");
  }

  private static void rejectInvalidFactory(int scenario) {
    try {
      switch (scenario) {
        case 0: MethodHandleDesc.of(DirectMethodHandleDesc.Kind.STATIC, ConstantDescs.CD_int, "wide", "(J)J"); break;
        case 1: MethodHandleDesc.of(DirectMethodHandleDesc.Kind.STATIC, TARGET.arrayType(), "wide", "(J)J"); break;
        case 2: MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.GETTER, TARGET, "wide", WIDE_TYPE); break;
        case 3: MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.STATIC, TARGET, "wide", ConstantDescs.CD_long); break;
        case 4: MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.GETTER, TARGET, "wide", ConstantDescs.CD_void); break;
        case 5: MethodHandleDesc.of(DirectMethodHandleDesc.Kind.CONSTRUCTOR, TARGET, "ignored", "(J)J"); break;
        case 6: MethodHandleDesc.of(DirectMethodHandleDesc.Kind.STATIC, TARGET, "wide", "(J)Vjunk"); break;
        case 7: MethodHandleDesc.of(DirectMethodHandleDesc.Kind.STATIC, TARGET, "wide", "(V)J"); break;
        case 8: MethodHandleDesc.of(DirectMethodHandleDesc.Kind.STATIC, TARGET, "wide", "J"); break;
        default: throw new AssertionError("factory scenario");
      }
    } catch (IllegalArgumentException expected) { return; }
    throw new AssertionError("invalid handle factory accepted");
  }

  private static void rejectNullFactory(int scenario) throws Throwable {
    try {
      switch (scenario) {
        case 0: MethodHandleDesc.of(null, TARGET, "wide", "(J)J"); break;
        case 1: MethodHandleDesc.of(DirectMethodHandleDesc.Kind.STATIC, null, "wide", "(J)J"); break;
        case 2: MethodHandleDesc.of(DirectMethodHandleDesc.Kind.STATIC, TARGET, null, "(J)J"); break;
        case 3: MethodHandleDesc.of(DirectMethodHandleDesc.Kind.STATIC, TARGET, "wide", null); break;
        case 4: MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC, TARGET, "wide", null); break;
        case 5: MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.GETTER, TARGET, "wide", null); break;
        case 6: MethodHandleDesc.ofConstructor(TARGET, (ClassDesc[]) null); break;
        case 7: MethodHandleDesc.ofConstructor(TARGET, (ClassDesc) null); break;
        case 8: MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC, TARGET, "wide", WIDE_TYPE).asType(null); break;
        default: throw new AssertionError("null factory scenario");
      }
    } catch (NullPointerException expected) { return; }
    throw new AssertionError("null handle factory accepted");
  }

  private static void caseFactoryValidation() throws Throwable {
    int rejected = 0;
    for (String name : new String[] {"", "bad.name", "bad/name", "bad;name", "bad[name", "bad<name"}) {
      try { MethodHandleDesc.of(DirectMethodHandleDesc.Kind.STATIC, TARGET, name, "(J)J"); }
      catch (IllegalArgumentException expected) { rejected++; }
    }
    for (String name : new String[] {"", "bad.name", "bad/name", "bad;name", "bad[name"}) {
      try { MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.GETTER, TARGET, name, ConstantDescs.CD_long); }
      catch (IllegalArgumentException expected) { rejected++; }
    }
    check(rejected == 11);
    for (int i = 0; i < 9; i++) rejectInvalidFactory(i);
    for (int i = 0; i < 9; i++) rejectNullFactory(i);
    emit("nc-handle-factory-validation", "invalid-name=11;owner/kind/descriptor=9;null=9;families=IllegalArgumentException/NullPointerException");
  }

  private static void caseStaticWide() throws Throwable {
    Target.calls = 0;
    DirectMethodHandleDesc description = MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC,
        TARGET, "staticWide", WIDE_TYPE);
    MethodHandle handle = description.resolveConstantDesc(MethodHandles.lookup());
    check((long) handle.invokeExact(WIDE) == WIDE + 1 && Target.calls == 1);
    check(handle.type().toMethodDescriptorString().equals("(J)J"));
    emit("nc-handle-static-wide", "kind=STATIC;value=9007199254740994;calls=1;type=(J)J");
  }

  private static void caseInterfaceStaticWide() throws Throwable {
    Target.calls = 0;
    MethodHandle handle = MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.INTERFACE_STATIC,
        INTERFACE, "staticWide", WIDE_TYPE).resolveConstantDesc(MethodHandles.lookup());
    check((long) handle.invokeExact(WIDE) == WIDE + 4 && Target.calls == 1);
    emit("nc-handle-interface-static-wide", "kind=INTERFACE_STATIC;value=9007199254740997;calls=1;type=(J)J");
  }

  private static void caseVirtualDispatch() throws Throwable {
    Target receiver = new Derived(7);
    Target.calls = 0;
    MethodHandle handle = MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.VIRTUAL,
        TARGET, "virtualWide", WIDE_TYPE).resolveConstantDesc(MethodHandles.lookup());
    check((long) handle.invokeExact(receiver, WIDE) == WIDE + 17 && Target.calls == 1);
    check(handle.type().parameterType(0) == Target.class);
    emit("nc-handle-virtual-dispatch", "owner=Target;receiver=Derived;override=true;value=9007199254741010;calls=1");
  }

  private static void caseInterfaceVirtualDispatch() throws Throwable {
    WideInterface receiver = new InterfaceCaller();
    Target.calls = 0;
    MethodHandle handle = MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.INTERFACE_VIRTUAL,
        INTERFACE, "interfaceWide", WIDE_TYPE).resolveConstantDesc(MethodHandles.lookup());
    check((long) handle.invokeExact(receiver, WIDE) == WIDE + 6 && Target.calls == 1);
    check(handle.type().parameterType(0) == WideInterface.class);
    emit("nc-handle-interface-virtual-dispatch", "owner=WideInterface;receiver=InterfaceCaller;value=9007199254740999;calls=1");
  }

  private static void caseClassSpecialDispatch() throws Throwable {
    Derived receiver = new Derived(7);
    Target.calls = 0;
    DirectMethodHandleDesc description = MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.SPECIAL,
        TARGET, "specialWide", WIDE_TYPE);
    MethodHandle handle = description.resolveConstantDesc(Derived.lookup());
    check((long) handle.invokeExact(receiver, WIDE) == WIDE + 9 && Target.calls == 1);
    check(handle.type().parameterType(0) == Derived.class);
    check(description.invocationType().parameterType(0).equals(TARGET));
    emit("nc-handle-class-special-dispatch", "owner=Target;caller/receiver=Derived;base-body=true;value=9007199254741002;calls=1");
  }

  private static void caseInterfaceSpecialDispatch() throws Throwable {
    InterfaceCaller receiver = new InterfaceCaller();
    Target.calls = 0;
    DirectMethodHandleDesc description = MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.INTERFACE_SPECIAL,
        INTERFACE, "defaultWide", WIDE_TYPE);
    MethodHandle handle = description.resolveConstantDesc(InterfaceCaller.lookup());
    check((long) handle.invokeExact(receiver, WIDE) == WIDE + 5 && Target.calls == 1);
    check(handle.type().parameterType(0) == InterfaceCaller.class);
    emit("nc-handle-interface-special-dispatch", "owner=WideInterface;caller/receiver=InterfaceCaller;default-body=true;value=9007199254740998;calls=1");
  }

  private static void caseConstructorWide() throws Throwable {
    Target.calls = 0;
    MethodHandleDesc description = MethodHandleDesc.ofConstructor(TARGET, ConstantDescs.CD_long);
    MethodHandle handle = description.resolveConstantDesc(MethodHandles.lookup());
    Target instance = (Target) handle.invokeExact(WIDE);
    check(instance.instanceValue == WIDE && instance.finalValue == WIDE + 1 && instance.privateValue == WIDE + 2);
    check(Target.calls == 1 && handle.type().returnType() == Target.class);
    ConstantDesc erased = description;
    check(((MethodHandle) erased.resolveConstantDesc(MethodHandles.lookup())).type().equals(handle.type()));
    emit("nc-handle-constructor-wide", "argument=9007199254740993;fields=exact;calls=1;typed/erased-resolution=MethodHandle");
  }

  private static void caseInstanceFieldWide() throws Throwable {
    Target receiver = new Target(7);
    MethodHandle getter = MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.GETTER,
        TARGET, "instanceValue", ConstantDescs.CD_long).resolveConstantDesc(MethodHandles.lookup());
    MethodHandle setter = MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.SETTER,
        TARGET, "instanceValue", ConstantDescs.CD_long).resolveConstantDesc(MethodHandles.lookup());
    check((long) getter.invokeExact(receiver) == 7);
    setter.invokeExact(receiver, WIDE);
    check(receiver.instanceValue == WIDE && (long) getter.invokeExact(receiver) == WIDE);
    check(getter.type().toMethodDescriptorString().equals("(Lclasses/modern_test/NominalHandleFinal$Target;)J"));
    check(setter.type().toMethodDescriptorString().equals("(Lclasses/modern_test/NominalHandleFinal$Target;J)V"));
    emit("nc-handle-instance-field-wide", "get/set=exact;before=7;after=9007199254740993;receiver=Target;store-visible=true");
  }

  private static void caseStaticFieldWide() throws Throwable {
    Target.staticValue = 11;
    MethodHandle getter = MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.STATIC_GETTER,
        TARGET, "staticValue", ConstantDescs.CD_long).resolveConstantDesc(MethodHandles.lookup());
    MethodHandle setter = MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.STATIC_SETTER,
        TARGET, "staticValue", ConstantDescs.CD_long).resolveConstantDesc(MethodHandles.lookup());
    check((long) getter.invokeExact() == 11);
    setter.invokeExact(WIDE);
    check(Target.staticValue == WIDE && (long) getter.invokeExact() == WIDE);
    check(getter.type().toMethodDescriptorString().equals("()J") && setter.type().toMethodDescriptorString().equals("(J)V"));
    emit("nc-handle-static-field-wide", "get/set=exact;before=11;after=9007199254740993;types=()J/(J)V;store-visible=true");
  }

  private static void caseAsTypeAdaptation() throws Throwable {
    Target.calls = 0;
    MethodHandleDesc base = MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC,
        TARGET, "staticWide", WIDE_TYPE);
    MethodTypeDesc boxedType = MethodTypeDesc.of(ConstantDescs.CD_Object, ConstantDescs.CD_Long);
    MethodHandleDesc first = base.asType(boxedType), second = base.asType(boxedType);
    check(first.equals(second) && first.hashCode() == second.hashCode() && first.invocationType().equals(boxedType));
    check(base.asType(WIDE_TYPE) == base && !first.equals(base));
    MethodHandle boxed = first.resolveConstantDesc(MethodHandles.lookup());
    Object boxedValue = boxed.invokeExact(Long.valueOf(WIDE));
    check(boxedValue instanceof Long && ((Long) boxedValue).longValue() == WIDE + 1);
    MethodHandle widened = base.asType(MethodTypeDesc.of(ConstantDescs.CD_long, ConstantDescs.CD_int))
        .resolveConstantDesc(MethodHandles.lookup());
    check((long) widened.invokeExact(7) == 8 && Target.calls == 2);
    try {
      base.asType(MethodTypeDesc.of(ConstantDescs.CD_long, ConstantDescs.CD_String))
          .resolveConstantDesc(MethodHandles.lookup());
    } catch (WrongMethodTypeException expected) {
      emit("nc-handle-as-type-adaptation", "descriptor=equal/hash;identity=true;Long-unbox/result-box=exact;int-widen=8;calls=2;impossible=WrongMethodTypeException");
      return;
    }
    throw new AssertionError("impossible descriptor adaptation accepted");
  }

  private static void rejectResolution(MethodHandleDesc description, MethodHandles.Lookup lookup,
      Class<? extends Throwable> expected) throws Throwable {
    try { description.resolveConstantDesc(lookup); }
    catch (Throwable error) { check(expected.isInstance(error)); return; }
    throw new AssertionError("nominal handle resolution unexpectedly succeeded");
  }

  private static void caseResolutionFailures() throws Throwable {
    MethodHandles.Lookup full = Target.lookup();
    MethodHandles.Lookup reduced = full.dropLookupMode(MethodHandles.Lookup.PRIVATE);
    rejectResolution(MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC, TARGET, "missing", WIDE_TYPE), full,
        NoSuchMethodException.class);
    rejectResolution(MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC, TARGET, "staticWide",
        MethodTypeDesc.of(ConstantDescs.CD_long, ConstantDescs.CD_int)), full, NoSuchMethodException.class);
    rejectResolution(MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.GETTER, TARGET, "missing", ConstantDescs.CD_long), full,
        NoSuchFieldException.class);
    rejectResolution(MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.GETTER, TARGET, "instanceValue", ConstantDescs.CD_int), full,
        NoSuchFieldException.class);
    rejectResolution(MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC, TARGET, "privateWide", WIDE_TYPE), reduced,
        IllegalAccessException.class);
    rejectResolution(MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.GETTER, TARGET, "privateValue", ConstantDescs.CD_long), reduced,
        IllegalAccessException.class);
    rejectResolution(MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.SETTER, TARGET, "finalValue", ConstantDescs.CD_long), full,
        IllegalAccessException.class);
    rejectResolution(MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC, TARGET, "staticWide", WIDE_TYPE), null,
        NullPointerException.class);
    emit("nc-handle-resolution-failures", "missing/type=NoSuchMethodException:2/NoSuchFieldException:2;private/final=IllegalAccessException:3;null-lookup=NullPointerException");
  }

  private static MethodHandle roundtrip(MethodHandle handle, MethodHandleDesc expected, MethodHandles.Lookup lookup)
      throws Throwable {
    check(handle instanceof Constable && handle.describeConstable().isPresent());
    MethodHandleDesc actual = handle.describeConstable().get();
    check(actual instanceof DirectMethodHandleDesc && actual.equals(expected));
    check(actual.invocationType().descriptorString().equals(handle.type().toMethodDescriptorString()));
    MethodHandle resolved = actual.resolveConstantDesc(lookup);
    check(resolved.type().equals(handle.type()));
    ConstantDesc erased = actual;
    check(((MethodHandle) erased.resolveConstantDesc(lookup)).type().equals(handle.type()));
    return resolved;
  }

  private static void caseDirectDescriptionRoundtrip() throws Throwable {
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodType type = MethodType.methodType(long.class, long.class);
    Target receiver = new Target(8);
    Target.calls = 0;
    MethodHandle staticHandle = roundtrip(lookup.findStatic(Target.class, "staticWide", type),
        MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC, TARGET, "staticWide", WIDE_TYPE), lookup);
    check((long) staticHandle.invokeExact(WIDE) == WIDE + 1);
    MethodHandle virtual = roundtrip(lookup.findVirtual(Target.class, "virtualWide", type),
        MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.VIRTUAL, TARGET, "virtualWide", WIDE_TYPE), lookup);
    check((long) virtual.invokeExact(receiver, 5L) == 13);
    MethodHandle interfaceStatic = roundtrip(lookup.findStatic(WideInterface.class, "staticWide", type),
        MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.INTERFACE_STATIC, INTERFACE, "staticWide", WIDE_TYPE), lookup);
    check((long) interfaceStatic.invokeExact(WIDE) == WIDE + 4);
    MethodHandle interfaceVirtual = roundtrip(lookup.findVirtual(WideInterface.class, "interfaceWide", type),
        MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.INTERFACE_VIRTUAL, INTERFACE, "interfaceWide", WIDE_TYPE), lookup);
    WideInterface interfaceReceiver = new InterfaceCaller();
    check((long) interfaceVirtual.invokeExact(interfaceReceiver, WIDE) == WIDE + 6);
    MethodHandle constructor = roundtrip(lookup.findConstructor(Target.class, MethodType.methodType(void.class, long.class)),
        MethodHandleDesc.ofConstructor(TARGET, ConstantDescs.CD_long), lookup);
    check(((Target) constructor.invokeExact(WIDE)).instanceValue == WIDE && Target.calls == 5);
    MethodHandle getter = roundtrip(lookup.findGetter(Target.class, "instanceValue", long.class),
        MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.GETTER, TARGET, "instanceValue", ConstantDescs.CD_long), lookup);
    MethodHandle setter = roundtrip(lookup.findSetter(Target.class, "instanceValue", long.class),
        MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.SETTER, TARGET, "instanceValue", ConstantDescs.CD_long), lookup);
    setter.invokeExact(receiver, WIDE);
    check((long) getter.invokeExact(receiver) == WIDE && receiver.instanceValue == WIDE);
    MethodHandle staticGetter = roundtrip(lookup.findStaticGetter(Target.class, "staticValue", long.class),
        MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.STATIC_GETTER, TARGET, "staticValue", ConstantDescs.CD_long), lookup);
    MethodHandle staticSetter = roundtrip(lookup.findStaticSetter(Target.class, "staticValue", long.class),
        MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.STATIC_SETTER, TARGET, "staticValue", ConstantDescs.CD_long), lookup);
    staticSetter.invokeExact(WIDE + 1);
    check((long) staticGetter.invokeExact() == WIDE + 1 && Target.staticValue == WIDE + 1);
    emit("nc-handle-direct-description-roundtrip", "direct-kinds=9;Constable/metadata/typed-erased-resolution=exact;wide-invocation/stores=true;calls=5");
  }

  private static byte[] hiddenPayload() throws Exception {
    return bytes(NominalHandleFinal.class, "NominalHandleFinal$HiddenPayload.class");
  }

  private static void caseHiddenBoundDescription() throws Throwable {
    MethodHandles.Lookup hidden = MethodHandles.lookup().defineHiddenClass(hiddenPayload(), false);
    Class<?> owner = hidden.lookupClass();
    MethodHandle hiddenHandle = hidden.findStatic(owner, "wide", MethodType.methodType(long.class, long.class));
    check(owner.isHidden() && !owner.describeConstable().isPresent());
    check(!hiddenHandle.describeConstable().isPresent() && (long) hiddenHandle.invokeExact(WIDE) == WIDE + 9);
    MethodHandle mirror = hidden.findStatic(owner, "mirror", MethodType.methodType(Class.class));
    check((Class<?>) mirror.invokeExact() == owner && !mirror.describeConstable().isPresent());
    Target receiver = new Target(7);
    Target.calls = 0;
    MethodHandle bound = MethodHandles.lookup().findVirtual(Target.class, "virtualWide",
        MethodType.methodType(long.class, long.class)).bindTo(receiver);
    check(!bound.describeConstable().isPresent() && (long) bound.invokeExact(3L) == 10 && Target.calls == 1);
    MethodHandle identity = MethodHandles.identity(long.class);
    check(!identity.describeConstable().isPresent() && (long) identity.invokeExact(WIDE) == WIDE);
    emit("nc-handle-hidden-bound-description", "hidden-owner/mirror/bound/identity=Optional.empty;hidden-ldc=exact-owner;wide-invocation=true;bound-calls=1");
  }

  public static void main(String[] args) throws Throwable {
    caseKindMetadata();
    caseFactoryEquality();
    caseFactoryValidation();
    caseStaticWide();
    caseInterfaceStaticWide();
    caseVirtualDispatch();
    caseInterfaceVirtualDispatch();
    caseClassSpecialDispatch();
    caseInterfaceSpecialDispatch();
    caseConstructorWide();
    caseInstanceFieldWide();
    caseStaticFieldWide();
    caseAsTypeAdaptation();
    caseResolutionFailures();
    caseDirectDescriptionRoundtrip();
    caseHiddenBoundDescription();
    System.out.println("NOMINAL_HANDLE_OK");
  }
}
