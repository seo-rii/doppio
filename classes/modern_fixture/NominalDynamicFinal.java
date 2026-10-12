package classes.modern_test;

import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.DirectMethodHandleDesc;
import java.lang.constant.DynamicConstantDesc;
import java.lang.constant.MethodHandleDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandles;
import static classes.modern_test.NominalConstantSupport.*;

/** Genuine javac21/25 source: API resolution, not a CONSTANT_Dynamic cache test. */
public final class NominalDynamicFinal {
  private static final ClassDesc OWNER = ClassDesc.of("classes.modern_test.NominalDynamicFinal");
  private static final ClassDesc MODE = OWNER.nested("Mode");
  private static final MethodHandles.Lookup LOOKUP = MethodHandles.lookup();
  private static final long WIDE = 9007199254740993L;
  private static int calls;
  private static String order;
  private static Object observedLookup;
  private static String observedName;
  private static Class<?> observedType;
  private static final AssertionError ERROR = new AssertionError("selected");
  private static final Exception CHECKED = new Exception("selected");
  public static int dataInits;

  public enum Mode { ALPHA, BETA }
  public static final class HiddenPayload {
    static { dataInits++; }
    public static Class<?> selfClass() { return HiddenPayload.class; }
  }

  public static Object value(MethodHandles.Lookup lookup, String name, Class<?> type) {
    calls++; observedLookup = lookup; observedName = name; observedType = type;
    return Integer.valueOf(17);
  }
  private static Object privateValue(MethodHandles.Lookup lookup, String name, Class<?> type) {
    calls++; return Long.valueOf(WIDE);
  }
  public static Object argument(MethodHandles.Lookup lookup, String name, Class<?> type) {
    calls++; order += name; return name;
  }
  public static Object combine(MethodHandles.Lookup lookup, String name, Class<?> type, Object... args) {
    calls++; order += name;
    return args[0].toString() + args[1].toString();
  }
  public static Object fresh(MethodHandles.Lookup lookup, String name, Class<?> type) {
    calls++; return new Object();
  }
  public static Object nothing(MethodHandles.Lookup lookup, String name, Class<?> type) {
    calls++; return null;
  }
  public static Object wide(MethodHandles.Lookup lookup, String name, Class<?> type, Object... args) {
    calls++; check(args.length == 3 && args[0] instanceof Long && args[1] instanceof Double && args[2] instanceof String);
    check(((Double) args[1]).doubleValue() == 1.5 && args[2].equals("tail"));
    return Long.valueOf(((Long) args[0]).longValue() + 1);
  }
  public static Object error(MethodHandles.Lookup lookup, String name, Class<?> type) { calls++; throw ERROR; }
  public static Object checked(MethodHandles.Lookup lookup, String name, Class<?> type) throws Exception { calls++; throw CHECKED; }
  public static Object wrongFirst(String lookup, String name, Class<?> type) { calls++; return null; }
  public static Object wrongArity() { calls++; return null; }
  public static Object data(MethodHandles.Lookup lookup, String name, Class<?> type) throws IllegalAccessException {
    calls++; return MethodHandles.classData(lookup, "_", Object.class);
  }

  private static DirectMethodHandleDesc bootstrap(String name, boolean varargs) {
    return MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC, OWNER, name,
        varargs ? MethodTypeDesc.of(ConstantDescs.CD_Object, ConstantDescs.CD_MethodHandles_Lookup,
            ConstantDescs.CD_String, ConstantDescs.CD_Class, ConstantDescs.CD_Object.arrayType())
        : MethodTypeDesc.of(ConstantDescs.CD_Object, ConstantDescs.CD_MethodHandles_Lookup,
            ConstantDescs.CD_String, ConstantDescs.CD_Class));
  }
  private static DynamicConstantDesc<Object> descriptor(String method, String name, ClassDesc type, ConstantDesc... args) {
    return DynamicConstantDesc.ofNamed(bootstrap(method, args.length != 0), name, type, args);
  }

  private static void caseFactoryMetadata() {
    DirectMethodHandleDesc bsm = bootstrap("wide", true);
    ConstantDesc[] args = {Long.valueOf(WIDE), Double.valueOf(1.5), "tail"};
    DynamicConstantDesc<Object> d = DynamicConstantDesc.ofNamed(bsm, "wide", ConstantDescs.CD_long, args);
    DynamicConstantDesc<Object> same = DynamicConstantDesc.ofNamed(bsm, "wide", ConstantDescs.CD_long, args);
    args[0] = Integer.valueOf(0);
    ConstantDesc[] copy = d.bootstrapArgs(); copy[0] = Integer.valueOf(0);
    check(d.bootstrapArgs()[0].equals(Long.valueOf(WIDE)) && d.bootstrapArgsList().get(0).equals(Long.valueOf(WIDE)));
    try { d.bootstrapArgsList().set(0, Integer.valueOf(0)); throw new AssertionError(); }
    catch (UnsupportedOperationException expected) { }
    check(d.equals(same) && d.hashCode() == same.hashCode() && !d.equals(null));
    check(d.bootstrapMethod().equals(bsm) && d.constantName().equals("wide") && d.constantType().equals(ConstantDescs.CD_long));
    DynamicConstantDesc<Object> defaults = DynamicConstantDesc.of(bootstrap("value", false));
    check(defaults.constantName().equals("_") && defaults.constantType().equals(ConstantDescs.CD_Object) && defaults.bootstrapArgs().length == 0);
    emit("nc-dynamic-factory-metadata", "clones=2;list=immutable;equal/hash=true;name/type/bootstrap/defaults=exact");
  }
  private static void caseFactoryValidation() {
    int bad = 0;
    for (String name : new String[] {"", "a.b", "a/b", "a[", "a;"}) {
      try { DynamicConstantDesc.ofNamed(bootstrap("value", false), name, ConstantDescs.CD_Object); }
      catch (IllegalArgumentException expected) { bad++; }
    }
    int nulls = 0;
    try { DynamicConstantDesc.ofNamed(null, "x", ConstantDescs.CD_Object); } catch (NullPointerException expected) { nulls++; }
    try { DynamicConstantDesc.ofNamed(bootstrap("value", false), null, ConstantDescs.CD_Object); } catch (NullPointerException expected) { nulls++; }
    try { DynamicConstantDesc.ofNamed(bootstrap("value", false), "x", null); } catch (NullPointerException expected) { nulls++; }
    try { DynamicConstantDesc.ofNamed(bootstrap("value", false), "x", ConstantDescs.CD_Object, (ConstantDesc[]) null); }
    catch (NullPointerException expected) { nulls++; }
    check(bad == 5 && nulls == 4);
    emit("nc-dynamic-factory-validation", "bad-name=IllegalArgumentException:5;null=NullPointerException:4");
  }
  private static void caseCanonicalNullPrimitive() throws Exception {
    ConstantDesc nil = DynamicConstantDesc.ofCanonical(ConstantDescs.BSM_NULL_CONSTANT, "other", ConstantDescs.CD_String, new ConstantDesc[0]);
    ConstantDesc primitive = DynamicConstantDesc.ofCanonical(ConstantDescs.BSM_PRIMITIVE_CLASS, "J", ConstantDescs.CD_Class, new ConstantDesc[0]);
    check(nil.equals(ConstantDescs.NULL) && nil.resolveConstantDesc(LOOKUP) == null);
    check(primitive.equals(ConstantDescs.CD_long) && primitive.resolveConstantDesc(LOOKUP) == long.class);
    emit("nc-dynamic-canonical-null-primitive", "null=name/type-independent;primitive=ClassDesc;resolved=null/long.class");
  }
  private static void caseCanonicalEnum() throws Exception {
    ConstantDesc value = DynamicConstantDesc.ofCanonical(ConstantDescs.BSM_ENUM_CONSTANT, "ALPHA", MODE, new ConstantDesc[0]);
    check(value instanceof Enum.EnumDesc && value.equals(Enum.EnumDesc.of(MODE, "ALPHA")));
    check(value.resolveConstantDesc(LOOKUP) == Mode.ALPHA);
    emit("nc-dynamic-canonical-enum", "canonical=EnumDesc;equal=true;resolved=ALPHA-identity");
  }
  private static void caseUserLookupNameType() throws Exception {
    calls = 0;
    Object result = descriptor("value", "named", ConstantDescs.CD_Integer).resolveConstantDesc(LOOKUP);
    check(result.equals(Integer.valueOf(17)) && calls == 1 && observedLookup == LOOKUP && observedName.equals("named") && observedType == Integer.class);
    emit("nc-dynamic-user-lookup-name-type", "caller-lookup=identity;name=named;type=Integer;value=17;calls=1");
  }
  private static void casePrivateBootstrapAccess() throws Exception {
    calls = 0; DynamicConstantDesc<Object> d = descriptor("privateValue", "x", ConstantDescs.CD_long);
    try { d.resolveConstantDesc(LOOKUP.dropLookupMode(MethodHandles.Lookup.PRIVATE)); throw new AssertionError(); }
    catch (BootstrapMethodError expected) { check(expected.getCause() instanceof IllegalAccessException && calls == 0); }
    check(((Long) d.resolveConstantDesc(LOOKUP)).longValue() == WIDE && calls == 1);
    emit("nc-dynamic-private-bootstrap-access", "reduced=BootstrapMethodError/IllegalAccessException;effects=0;own=wide;calls=1");
  }
  private static void caseNestedOrder() throws Exception {
    calls = 0; order = "";
    Object value = descriptor("combine", "C", ConstantDescs.CD_String,
        descriptor("argument", "A", ConstantDescs.CD_String), descriptor("argument", "B", ConstantDescs.CD_String)).resolveConstantDesc(LOOKUP);
    check(value.equals("AB") && order.equals("ABC") && calls == 3);
    emit("nc-dynamic-nested-order", "argument-order=AB;outer-last=C;result=AB;calls=3");
  }
  private static void caseNoCacheIdentity() throws Exception {
    calls = 0; DynamicConstantDesc<Object> d = descriptor("fresh", "x", ConstantDescs.CD_Object);
    Object a = d.resolveConstantDesc(LOOKUP), b = d.resolveConstantDesc(LOOKUP);
    check(a != null && b != null && a != b && calls == 2);
    emit("nc-dynamic-no-cache-identity", "same-descriptor=reinvoked;results=distinct;calls=2");
  }
  private static void caseNullResult() throws Exception {
    calls = 0; check(descriptor("nothing", "x", ConstantDescs.CD_Object).resolveConstantDesc(LOOKUP) == null && calls == 1);
    emit("nc-dynamic-null-result", "null=preserved;calls=1");
  }
  private static void caseWideVarargs() throws Exception {
    calls = 0;
    Object value = descriptor("wide", "x", ConstantDescs.CD_long, Long.valueOf(WIDE), Double.valueOf(1.5), "tail").resolveConstantDesc(LOOKUP);
    check(value instanceof Long && ((Long) value).longValue() == WIDE + 1 && calls == 1);
    emit("nc-dynamic-wide-varargs", "args=Long/Double/String;collector=3;value=9007199254740994;calls=1");
  }
  private static void caseErasedResult() throws Exception {
    calls = 0;
    ConstantDesc d = descriptor("value", "x", ConstantDescs.CD_String);
    Object value = d.resolveConstantDesc(LOOKUP);
    check(value instanceof Integer && value.equals(Integer.valueOf(17)) && observedType == String.class && calls == 1);
    emit("nc-dynamic-erased-result", "API-not-CP-ldc;declared=String;erased-result=Integer:17;calls=1");
  }
  private static void caseErrorPassthrough() throws Exception {
    calls = 0;
    try { descriptor("error", "x", ConstantDescs.CD_Object).resolveConstantDesc(LOOKUP); throw new AssertionError(); }
    catch (AssertionError expected) { check(expected == ERROR && calls == 1); }
    emit("nc-dynamic-error-passthrough", "Error=exact-identity;wrapper=none;calls=1");
  }
  private static void caseExceptionWrapper() throws Exception {
    calls = 0;
    try { descriptor("checked", "x", ConstantDescs.CD_Object).resolveConstantDesc(LOOKUP); throw new AssertionError(); }
    catch (BootstrapMethodError expected) { check(expected.getCause() == CHECKED && calls == 1); }
    emit("nc-dynamic-exception-wrapper", "checked=BootstrapMethodError;cause=exact-identity;calls=1");
  }
  private static void caseNestedFailureBarrier() throws Exception {
    calls = 0; order = "";
    try { descriptor("combine", "C", ConstantDescs.CD_Object, descriptor("error", "x", ConstantDescs.CD_Object),
        descriptor("argument", "B", ConstantDescs.CD_String)).resolveConstantDesc(LOOKUP); throw new AssertionError(); }
    catch (AssertionError expected) { check(expected == ERROR && calls == 1 && order.equals("")); }
    emit("nc-dynamic-nested-failure-barrier", "first-arg-error=identity;later/outer-effects=0;calls=1");
  }
  private static void caseBootstrapShape() throws Exception {
    calls = 0; int bad = 0;
    DirectMethodHandleDesc first = MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC, OWNER, "wrongFirst",
        MethodTypeDesc.of(ConstantDescs.CD_Object, ConstantDescs.CD_String, ConstantDescs.CD_String, ConstantDescs.CD_Class));
    DirectMethodHandleDesc arity = MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC, OWNER, "wrongArity", MethodTypeDesc.of(ConstantDescs.CD_Object));
    for (DirectMethodHandleDesc bsm : new DirectMethodHandleDesc[] {first, arity}) {
      try { DynamicConstantDesc.of(bsm).resolveConstantDesc(LOOKUP); }
      catch (BootstrapMethodError expected) { bad++; }
    }
    check(bad == 2 && calls == 0);
    emit("nc-dynamic-bootstrap-shape", "wrong-first/arity=BootstrapMethodError:2;effects=0");
  }
  private static byte[] hiddenPayload() throws Exception {
    return bytes(NominalDynamicFinal.class, "NominalDynamicFinal$HiddenPayload.class");
  }
  private static void caseHiddenClassData() throws Exception {
    Object token = new Object(); dataInits = 0; calls = 0;
    MethodHandles.Lookup hidden = LOOKUP.defineHiddenClassWithClassData(hiddenPayload(), token, false);
    DynamicConstantDesc<Object> d = descriptor("data", "x", ConstantDescs.CD_Object);
    try { d.resolveConstantDesc(hidden.dropLookupMode(MethodHandles.Lookup.ORIGINAL)); throw new AssertionError(); }
    catch (BootstrapMethodError expected) { check(expected.getCause() instanceof IllegalAccessException && dataInits == 0 && calls == 1); }
    check(d.resolveConstantDesc(hidden) == token && dataInits == 1 && calls == 2 && hidden.lookupClass().isHidden());
    emit("nc-dynamic-hidden-class-data", "ORIGINAL-required;denied-init=0;data=identity;init=1;calls=2");
  }
  public static void main(String[] args) throws Exception {
    check(ConstantDescs.CD_int.descriptorString().equals("I"));
    caseFactoryMetadata(); caseFactoryValidation(); caseCanonicalNullPrimitive(); caseCanonicalEnum();
    caseUserLookupNameType(); casePrivateBootstrapAccess(); caseNestedOrder(); caseNoCacheIdentity();
    caseNullResult(); caseWideVarargs(); caseErasedResult(); caseErrorPassthrough();
    caseExceptionWrapper(); caseNestedFailureBarrier(); caseBootstrapShape(); caseHiddenClassData();
    System.out.println("NOMINAL_DYNAMIC_OK");
  }
}
