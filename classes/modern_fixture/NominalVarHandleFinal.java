package classes.modern_test;

import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.DynamicConstantDesc;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.VarHandle;
import java.lang.invoke.VarHandle.VarHandleDesc;
import static classes.modern_test.NominalConstantSupport.*;

/** Executable nominal storage descriptors; no memory-order or GC claims. */
public final class NominalVarHandleFinal {
  private static final long WIDE = 9007199254740993L;
  private static final ClassDesc TARGET = ClassDesc.of("classes.modern_test.NominalVarHandleFinal$Target");
  private static final ClassDesc PASSIVE = ClassDesc.of("classes.modern_test.NominalVarHandleFinal$Passive");
  private static final MethodHandles.Lookup LOOKUP = MethodHandles.lookup();
  public static int passiveInits;
  public static final class Target {
    public long value = 7;
    public static long staticValue = 11;
    public final long finalValue = WIDE;
    private long privateValue = 13;
    public static MethodHandles.Lookup lookup() { return MethodHandles.lookup(); }
  }
  public static final class Passive {
    static { passiveInits++; }
    public long value;
  }
  public static final class HiddenPayload {
    public long value;
    public static Class<?> selfClass() { return HiddenPayload.class; }
  }
  private static VarHandleDesc field() { return VarHandleDesc.ofField(TARGET, "value", ConstantDescs.CD_long); }
  private static VarHandleDesc staticField() { return VarHandleDesc.ofStaticField(TARGET, "staticValue", ConstantDescs.CD_long); }
  private static VarHandle roundtrip(VarHandle source, VarHandleDesc expected, MethodHandles.Lookup lookup) throws Exception {
    check(source.describeConstable().isPresent() && source.describeConstable().get().equals(expected));
    ConstantDesc erased = source.describeConstable().get();
    VarHandle value = source.describeConstable().get().resolveConstantDesc(lookup);
    check(erased.resolveConstantDesc(lookup) instanceof VarHandle && value.varType() == source.varType()
        && value.coordinateTypes().equals(source.coordinateTypes()));
    return value;
  }
  private static void caseFactoryMetadata() {
    VarHandleDesc f = field(), s = staticField(), a = VarHandleDesc.ofArray(ConstantDescs.CD_long.arrayType());
    check(f.varType().equals(ConstantDescs.CD_long) && s.varType().equals(ConstantDescs.CD_long) && a.varType().equals(ConstantDescs.CD_long));
    check(f.constantType().equals(ConstantDescs.CD_VarHandle) && f.constantName().equals("value"));
    check(f.bootstrapMethod().equals(ConstantDescs.BSM_VARHANDLE_FIELD) && s.bootstrapMethod().equals(ConstantDescs.BSM_VARHANDLE_STATIC_FIELD)
        && a.bootstrapMethod().equals(ConstantDescs.BSM_VARHANDLE_ARRAY));
    check(f.bootstrapArgs().length == 2 && f.bootstrapArgs()[0].equals(TARGET) && f.bootstrapArgs()[1].equals(ConstantDescs.CD_long));
    check(a.bootstrapArgs().length == 1 && a.bootstrapArgs()[0].equals(ConstantDescs.CD_long.arrayType()) && a.constantName().equals("_"));
    check(f.equals(field()) && f.hashCode() == field().hashCode() && !f.equals(s));
    emit("nc-varhandle-factory-metadata", "kinds=field/static/array;type/name/bootstrap/args=exact;equal/hash=true");
  }
  private static void caseFactoryValidation() {
    int bad = 0, nulls = 0;
    for (String name : new String[] {"", "a.b", "a/b", "a[", "a;"}) {
      try { VarHandleDesc.ofField(TARGET, name, ConstantDescs.CD_long); }
      catch (IllegalArgumentException expected) { bad++; }
    }
    for (ClassDesc notArray : new ClassDesc[] {ConstantDescs.CD_Object, ConstantDescs.CD_int}) {
      try { VarHandleDesc.ofArray(notArray); } catch (IllegalArgumentException expected) { bad++; }
    }
    try { VarHandleDesc.ofField(null, "value", ConstantDescs.CD_long); } catch (NullPointerException expected) { nulls++; }
    try { VarHandleDesc.ofStaticField(TARGET, null, ConstantDescs.CD_long); } catch (NullPointerException expected) { nulls++; }
    try { VarHandleDesc.ofField(TARGET, "value", null); } catch (NullPointerException expected) { nulls++; }
    try { VarHandleDesc.ofArray(null); } catch (NullPointerException expected) { nulls++; }
    check(bad == 7 && nulls == 4);
    emit("nc-varhandle-factory-validation", "invalid-name/array=IllegalArgumentException:7;null=NullPointerException:4");
  }
  private static void caseInstanceWide() throws Exception {
    Target target = new Target(); VarHandle h = field().resolveConstantDesc(LOOKUP);
    check((long) h.get(target) == 7); h.set(target, WIDE);
    check(target.value == WIDE && (long) h.get(target) == WIDE && h.varType() == long.class && h.coordinateTypes().get(0) == Target.class);
    emit("nc-varhandle-instance-wide", "before=7;after=9007199254740993;alias=true;coordinates=Target");
  }
  private static void caseStaticWide() throws Exception {
    Target.staticValue = 11; VarHandle h = staticField().resolveConstantDesc(LOOKUP);
    check((long) h.get() == 11); h.set(WIDE);
    check(Target.staticValue == WIDE && (long) h.get() == WIDE && h.coordinateTypes().isEmpty());
    emit("nc-varhandle-static-wide", "before=11;after=9007199254740993;alias=true;coordinates=empty");
  }
  private static void caseArrayWide() throws Exception {
    long[] array = {3, 5, 7}; VarHandle h = VarHandleDesc.ofArray(ConstantDescs.CD_long.arrayType()).resolveConstantDesc(LOOKUP);
    h.set(array, 1, WIDE); check((long) h.get(array, 1) == WIDE && array[0] == 3 && array[1] == WIDE && array[2] == 7);
    check(h.coordinateTypes().get(0) == long[].class && h.coordinateTypes().get(1) == int.class);
    emit("nc-varhandle-array-wide", "index=1;value=9007199254740993;neighbors=3/7;coordinates=long[]/int");
  }
  private static void caseReferenceArray() throws Exception {
    Object token = new Object(); Object[] array = new Object[2];
    VarHandle h = VarHandleDesc.ofArray(ConstantDescs.CD_Object.arrayType()).resolveConstantDesc(LOOKUP);
    h.set(array, 1, token); check(h.get(array, 1) == token && array[1] == token && array[0] == null);
    try { h.set(new String[1], 0, token); throw new AssertionError(); } catch (ArrayStoreException expected) { }
    emit("nc-varhandle-reference-array", "identity/alias=true;neighbor=null;covariant-store=ArrayStoreException");
  }
  private static void casePrivateAccess() throws Exception {
    VarHandleDesc d = VarHandleDesc.ofField(TARGET, "privateValue", ConstantDescs.CD_long);
    MethodHandles.Lookup own = Target.lookup(); Target target = new Target();
    try { d.resolveConstantDesc(own.dropLookupMode(MethodHandles.Lookup.PRIVATE)); throw new AssertionError(); }
    catch (IllegalAccessException expected) { check(target.privateValue == 13); }
    VarHandle h = d.resolveConstantDesc(own); h.set(target, WIDE); check(target.privateValue == WIDE);
    emit("nc-varhandle-private-access", "reduced=IllegalAccessException;denied-store=unchanged;own-store=wide");
  }
  private static void caseResolutionFailures() throws Exception {
    int missing = 0, wrongKind = 0;
    for (VarHandleDesc d : new VarHandleDesc[] {VarHandleDesc.ofField(TARGET, "absent", ConstantDescs.CD_long),
        VarHandleDesc.ofField(TARGET, "value", ConstantDescs.CD_int)}) {
      try { d.resolveConstantDesc(LOOKUP); } catch (NoSuchFieldException expected) { missing++; }
    }
    for (VarHandleDesc d : new VarHandleDesc[] {VarHandleDesc.ofField(TARGET, "staticValue", ConstantDescs.CD_long),
        VarHandleDesc.ofStaticField(TARGET, "value", ConstantDescs.CD_long)}) {
      try { d.resolveConstantDesc(LOOKUP); } catch (IllegalAccessException expected) { wrongKind++; }
    }
    try { field().resolveConstantDesc(null); throw new AssertionError(); } catch (NullPointerException expected) { }
    check(missing == 2 && wrongKind == 2);
    emit("nc-varhandle-resolution-failures", "missing/type=NoSuchFieldException:2;staticness=IllegalAccessException:2;null=NullPointerException");
  }
  private static void caseFinalReadonly() throws Exception {
    VarHandle h = VarHandleDesc.ofField(TARGET, "finalValue", ConstantDescs.CD_long).resolveConstantDesc(LOOKUP);
    Target target = new Target(); check((long) h.get(target) == WIDE && !h.isAccessModeSupported(VarHandle.AccessMode.SET));
    try { h.set(target, 0L); throw new AssertionError(); } catch (UnsupportedOperationException expected) { check(target.finalValue == WIDE); }
    emit("nc-varhandle-final-readonly", "get=wide;set-supported=false;set=UnsupportedOperationException;unchanged=true");
  }
  private static void caseFieldRoundtrip() throws Exception {
    VarHandle source = LOOKUP.findVarHandle(Target.class, "value", long.class), copy = roundtrip(source, field(), LOOKUP);
    Target target = new Target(); copy.set(target, WIDE); check((long) source.get(target) == WIDE && target.value == WIDE);
    emit("nc-varhandle-field-roundtrip", "Optional=field;typed/erased=VarHandle;source/copy/storage=wide-alias");
  }
  private static void caseStaticRoundtrip() throws Exception {
    VarHandle source = LOOKUP.findStaticVarHandle(Target.class, "staticValue", long.class), copy = roundtrip(source, staticField(), LOOKUP);
    copy.set(WIDE); check((long) source.get() == WIDE && Target.staticValue == WIDE);
    emit("nc-varhandle-static-roundtrip", "Optional=static;typed/erased=VarHandle;source/copy/storage=wide-alias");
  }
  private static void caseArrayRoundtrip() throws Exception {
    VarHandleDesc desc = VarHandleDesc.ofArray(ConstantDescs.CD_long.arrayType());
    VarHandle source = MethodHandles.arrayElementVarHandle(long[].class), copy = roundtrip(source, desc, LOOKUP);
    long[] array = new long[1]; copy.set(array, 0, WIDE); check((long) source.get(array, 0) == WIDE && array[0] == WIDE);
    emit("nc-varhandle-array-roundtrip", "Optional=array;typed/erased=VarHandle;source/copy/storage=wide-alias");
  }
  private static void caseViewRoundtrip() throws Exception {
    VarHandle source = LOOKUP.findVarHandle(Target.class, "value", long.class);
    VarHandle exact = source.withInvokeExactBehavior(), loose = exact.withInvokeBehavior();
    check(exact.hasInvokeExactBehavior() && !loose.hasInvokeExactBehavior());
    check(exact.describeConstable().get().equals(field()) && loose.describeConstable().get().equals(field()));
    Target target = new Target(); VarHandle copy = roundtrip(exact, field(), LOOKUP); copy.set(target, WIDE);
    check((long) exact.get(target) == WIDE && (long) loose.get(target) == WIDE);
    emit("nc-varhandle-view-roundtrip", "exact/loose=stable-descriptor;copy=executable;capability-alias=wide");
  }
  private static void caseCanonicalProjection() throws Exception {
    VarHandleDesc[] expected = {field(), staticField(), VarHandleDesc.ofArray(ConstantDescs.CD_long.arrayType())};
    int count = 0;
    for (VarHandleDesc d : expected) {
      ConstantDesc canonical = DynamicConstantDesc.ofCanonical(d.bootstrapMethod(), d.constantName(), d.constantType(), d.bootstrapArgs());
      check(canonical instanceof VarHandleDesc && canonical.equals(d) && canonical.resolveConstantDesc(LOOKUP) instanceof VarHandle); count++;
    }
    check(count == 3);
    emit("nc-varhandle-canonical-projection", "field/static/array=VarHandleDesc;equal=true;resolved=executable:3");
  }
  private static void casePassiveResolution() throws Exception {
    passiveInits = 0;
    VarHandle h = VarHandleDesc.ofField(PASSIVE, "value", ConstantDescs.CD_long).resolveConstantDesc(LOOKUP);
    check(h.varType() == long.class && h.coordinateTypes().get(0) == Passive.class && passiveInits == 0);
    LOOKUP.ensureInitialized(Passive.class); check(passiveInits == 1);
    emit("nc-varhandle-passive-resolution", "instance-descriptor=resolved;initialization=0;ensureInitialized=1");
  }
  private static byte[] hiddenPayload() throws Exception {
    return bytes(NominalVarHandleFinal.class, "NominalVarHandleFinal$HiddenPayload.class");
  }
  private static void caseHiddenDescription() throws Throwable {
    MethodHandles.Lookup hidden = LOOKUP.defineHiddenClass(hiddenPayload(), false);
    Class<?> owner = hidden.lookupClass();
    VarHandle field = hidden.findVarHandle(owner, "value", long.class);
    VarHandle array = MethodHandles.arrayElementVarHandle(owner.arrayType());
    check(owner.isHidden() && owner.describeConstable().isEmpty() && field.describeConstable().isEmpty() && array.describeConstable().isEmpty());
    Object instance = hidden.findConstructor(owner, java.lang.invoke.MethodType.methodType(void.class)).invokeWithArguments();
    field.set(instance, WIDE); check((long) field.get(instance) == WIDE);
    emit("nc-varhandle-hidden-description", "hidden-owner/field/array=Optional.empty;held-field=executable-wide");
  }
  public static void main(String[] args) throws Throwable {
    check(ConstantDescs.CD_int.descriptorString().equals("I"));
    caseFactoryMetadata(); caseFactoryValidation(); caseInstanceWide(); caseStaticWide();
    caseArrayWide(); caseReferenceArray(); casePrivateAccess(); caseResolutionFailures();
    caseFinalReadonly(); caseFieldRoundtrip(); caseStaticRoundtrip(); caseArrayRoundtrip();
    caseViewRoundtrip(); caseCanonicalProjection(); casePassiveResolution(); caseHiddenDescription();
    System.out.println("NOMINAL_VARHANDLE_OK");
  }
}
