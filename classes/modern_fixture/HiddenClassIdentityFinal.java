package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.VarHandle;
import java.lang.reflect.Array;
import java.lang.reflect.Field;
import static classes.modern_test.HiddenClassSupport.*;

/** C5 original hidden identity, non-discovery, nests and reflection contracts. */
public final class HiddenClassIdentityFinal {
  private static long secret = 9007199254740993L;
  public static int secretReads;

  public static class Payload {
    public int number = 7;
    public final boolean finalBoolean = true;
    public final byte finalByte = 3;
    public final char finalChar = 'a';
    public final short finalShort = 5;
    public final int finalInt = 9;
    public final long finalLong = 9007199254740993L;
    public final float finalFloat = 1.5f;
    public final double finalDouble = 2.5d;
    public final Object finalReference = new Object();
    public Payload ordinarySelf;
    public Payload nominalSelf() { return null; }
    public static Class<?> mirror() { return Payload.class; }
  }

  public static class NestPayload {
    public static long readSecret() {
      long value = secret;
      secretReads++;
      return value;
    }
  }

  private static int privateValue() { return 37; }

  private static MethodHandles.Lookup define(MethodHandles.Lookup.ClassOption... options)
      throws Exception {
    byte[] source = bytes(HiddenClassIdentityFinal.class, "HiddenClassIdentityFinal$Payload.class");
    return MethodHandles.lookup().defineHiddenClass(source, false, options);
  }

  private static MethodHandles.Lookup defineNest(MethodHandles.Lookup.ClassOption... options)
      throws Exception {
    byte[] source = bytes(HiddenClassIdentityFinal.class, "HiddenClassIdentityFinal$NestPayload.class");
    return MethodHandles.lookup().defineHiddenClass(source, false, options);
  }

  private static Object instance(MethodHandles.Lookup lookup) throws Throwable {
    return lookup.findConstructor(lookup.lookupClass(), MethodType.methodType(void.class)).invoke();
  }

  private static void rejectForName(String name, ClassLoader loader) throws Throwable {
    try { Class.forName(name, false, loader); }
    catch (ClassNotFoundException expected) { return; }
    throw new AssertionError("hidden name discovered");
  }

  private static void rejectFindClass(MethodHandles.Lookup lookup, String name) throws Throwable {
    try { lookup.findClass(name); }
    catch (ClassNotFoundException expected) { return; }
    throw new AssertionError("hidden lookup name discovered");
  }

  private static void caseDistinctDefinitions() throws Throwable {
    MethodHandles.Lookup first = define(), second = define();
    check(first.lookupClass() != second.lookupClass());
    check(!first.lookupClass().getName().equals(second.lookupClass().getName()));
    Object a = instance(first), b = instance(second);
    check(first.lookupClass().isInstance(a) && !first.lookupClass().isInstance(b));
    check(second.lookupClass().isInstance(b) && !second.lookupClass().isAssignableFrom(first.lookupClass()));
    emit("hc-identity-distinct-definitions", "same-source=distinct-classes/names;instances/casts=isolated");
  }

  private static void caseRuntimeNameDescriptor() throws Throwable {
    Class<?> hidden = define().lookupClass();
    String base = "classes.modern_test.HiddenClassIdentityFinal$Payload";
    String name = hidden.getName();
    check(name.startsWith(base + "/"));
    String suffix = name.substring(base.length() + 1);
    check(!suffix.isEmpty() && suffix.indexOf('/') < 0 && suffix.indexOf('.') < 0);
    String descriptor = new StringBuilder().append('L').append(base.replace('.', '/'))
        .append('.').append(suffix).append(';').toString();
    check(hidden.descriptorString().equals(descriptor) && hidden.getTypeName().equals(name));
    emit("hc-identity-runtime-name-descriptor", "name=GN/slash-suffix;descriptor=L-N-dot-suffix-semicolon;suffix-value=unclaimed");
  }

  private static void caseClassForNameNonDiscovery() throws Throwable {
    Class<?> hidden = define().lookupClass();
    rejectForName(hidden.getName(), hidden.getClassLoader());
    emit("hc-identity-for-name-non-discovery", "runtime-name=ClassNotFoundException;defining-loader=unchanged");
  }

  private static void caseLookupNonDiscovery() throws Throwable {
    MethodHandles.Lookup hidden = define();
    rejectFindClass(MethodHandles.lookup(), hidden.lookupClass().getName());
    rejectFindClass(hidden, hidden.lookupClass().getName());
    emit("hc-identity-lookup-non-discovery", "caller/hidden-lookups=ClassNotFoundException;rejections=2");
  }

  private static void caseOrdinaryTwinDistinct() throws Throwable {
    Class<?> hidden = define().lookupClass();
    Class<?> ordinary = Class.forName("classes.modern_test.HiddenClassIdentityFinal$Payload", false,
        HiddenClassIdentityFinal.class.getClassLoader());
    check(!ordinary.isHidden() && ordinary != hidden);
    check(ordinary.getClassLoader() == hidden.getClassLoader());
    check(ordinary == Payload.class && !ordinary.isAssignableFrom(hidden) && !hidden.isAssignableFrom(ordinary));
    emit("hc-identity-ordinary-twin-distinct", "original-name=ordinary-class;loader=same;hidden-twin=distinct/unassignable");
  }

  private static void caseThisClassMirror() throws Throwable {
    MethodHandles.Lookup lookup = define();
    Class<?> hidden = lookup.lookupClass();
    MethodHandle mirror = lookup.findStatic(hidden, "mirror", MethodType.methodType(Class.class));
    check((Class<?>) mirror.invokeExact() == hidden);
    check(hidden.getDeclaredMethod("mirror").invoke(null) == hidden);
    emit("hc-identity-this-class-mirror", "ldc-this-class=exact-hidden;method-handle/reflection=same-mirror");
  }

  private static void caseOrdinarySelfDescriptors() throws Throwable {
    Class<?> hidden = define().lookupClass();
    Class<?> fieldType = hidden.getDeclaredField("ordinarySelf").getType();
    Class<?> returnType = hidden.getDeclaredMethod("nominalSelf").getReturnType();
    check(fieldType == Payload.class && returnType == Payload.class && !fieldType.isHidden());
    emit("hc-identity-ordinary-self-descriptors", "field/return-original-N=ordinary-class;descriptors=not-rewritten");
  }

  private static void caseHiddenArrays() throws Throwable {
    MethodHandles.Lookup lookup = define();
    Class<?> hidden = lookup.lookupClass(), arrayType = hidden.arrayType();
    check(!arrayType.isHidden() && arrayType.getComponentType() == hidden);
    check(hidden.getPackageName().equals("classes.modern_test") && arrayType.getPackageName().equals(hidden.getPackageName()));
    check(hidden.arrayType() == arrayType);
    Object array = Array.newInstance(hidden, 2), owner = instance(lookup);
    check(array.getClass() == arrayType && Array.getLength(array) == 2);
    Array.set(array, 0, owner);
    check(Array.get(array, 0) == owner && Array.get(array, 1) == null);
    Object matrix = Array.newInstance(hidden, 2, 3);
    check(matrix.getClass() == arrayType.arrayType());
    check(matrix.getClass().getComponentType().getComponentType() == hidden);
    emit("hc-identity-array-mirrors", "array-hidden=false;component=exact-hidden;cached=true;values=identity;dimensions=2x3");
  }

  private static void caseHiddenArrayNonDiscovery() throws Throwable {
    Class<?> hidden = define().lookupClass(), array = hidden.arrayType();
    rejectForName(array.getName(), hidden.getClassLoader());
    rejectFindClass(MethodHandles.lookup(), array.getName());
    emit("hc-identity-array-non-discovery", "array-runtime-name=ClassNotFoundException;loader/lookup-rejections=2");
  }

  private static void caseNonNominalRestrictions() throws Throwable {
    Class<?> hidden = define().lookupClass(), array = hidden.arrayType();
    check(hidden.getCanonicalName() == null && array.getCanonicalName() == null);
    check(!hidden.describeConstable().isPresent() && !array.describeConstable().isPresent());
    emit("hc-identity-non-nominal-restrictions", "hidden/array-canonical=null;hidden/array-constable=empty;C6-resolution=unclaimed");
  }

  private static void caseDefaultNestIsolation() throws Throwable {
    Class<?> hidden = define().lookupClass();
    check(hidden.getNestHost() == hidden && !hidden.isNestmateOf(HiddenClassIdentityFinal.class));
    Class<?>[] members = hidden.getNestMembers();
    check(members.length == 1 && members[0] == hidden);
    emit("hc-identity-default-nest-isolation", "raw-NestHost=ignored;host=self;members=self-only;caller-nest=separate");
  }

  private static void caseNestmateNonEnumeration() throws Throwable {
    Class<?> hidden = define(MethodHandles.Lookup.ClassOption.NESTMATE).lookupClass();
    check(hidden.getNestHost() == HiddenClassIdentityFinal.class && hidden.isNestmateOf(HiddenClassIdentityFinal.class));
    for (Class<?> member : hidden.getNestMembers()) check(member != hidden);
    for (Class<?> member : HiddenClassIdentityFinal.class.getNestMembers()) check(member != hidden);
    emit("hc-identity-nestmate-non-enumeration", "host=caller-nest;nestmate=true;hidden-excluded-from-members=true");
  }

  private static void caseNestBytecodeAccess() throws Throwable {
    int before = secretReads;
    MethodHandles.Lookup isolated = defineNest();
    MethodHandle denied = isolated.findStatic(isolated.lookupClass(), "readSecret", MethodType.methodType(long.class));
    try { long unused = (long) denied.invokeExact(); throw new AssertionError(unused); }
    catch (IllegalAccessError expected) { check(secretReads == before); }
    MethodHandles.Lookup nested = defineNest(MethodHandles.Lookup.ClassOption.NESTMATE);
    MethodHandle allowed = nested.findStatic(nested.lookupClass(), "readSecret", MethodType.methodType(long.class));
    check((long) allowed.invokeExact() == secret && secretReads == before + 1);
    emit("hc-identity-nest-bytecode-access", "without-option=IllegalAccessError/no-effect;NESTMATE=private-getstatic;wide=9007199254740993;effects=1");
  }

  private static void caseNestLookupAccess() throws Throwable {
    MethodHandles.Lookup isolated = define();
    try {
      isolated.findStatic(HiddenClassIdentityFinal.class, "privateValue", MethodType.methodType(int.class));
      throw new AssertionError("private nest lookup succeeded");
    } catch (IllegalAccessException expected) { }
    MethodHandles.Lookup nested = define(MethodHandles.Lookup.ClassOption.NESTMATE);
    MethodHandle allowed = nested.findStatic(HiddenClassIdentityFinal.class, "privateValue", MethodType.methodType(int.class));
    check((int) allowed.invokeExact() == 37);
    emit("hc-identity-nest-lookup-access", "without-option=IllegalAccessException;NESTMATE=private-method/37");
  }

  private static void rejectFinalWrite(Field field, Object owner, int kind) throws Throwable {
    field.setAccessible(true);
    try {
      switch (kind) {
        case 0: field.setBoolean(owner, false); break;
        case 1: field.setByte(owner, (byte) 4); break;
        case 2: field.setChar(owner, 'b'); break;
        case 3: field.setShort(owner, (short) 6); break;
        case 4: field.setInt(owner, 10); break;
        case 5: field.setLong(owner, 9007199254740994L); break;
        case 6: field.setFloat(owner, 3.5f); break;
        case 7: field.setDouble(owner, 4.5d); break;
        default: field.set(owner, new Object()); break;
      }
    } catch (IllegalAccessException expected) { return; }
    throw new AssertionError("hidden final field changed");
  }

  private static void caseFinalFieldReflection() throws Throwable {
    MethodHandles.Lookup lookup = define();
    Class<?> hidden = lookup.lookupClass();
    Object owner = instance(lookup);
    String[] names = {"finalBoolean", "finalByte", "finalChar", "finalShort", "finalInt", "finalLong",
        "finalFloat", "finalDouble", "finalReference"};
    Object[] original = new Object[names.length];
    for (int index = 0; index < names.length; index++) {
      Field field = hidden.getDeclaredField(names[index]);
      original[index] = field.get(owner);
      rejectFinalWrite(field, owner, index);
      Object after = field.get(owner);
      check(index == 8 ? after == original[index] : after.equals(original[index]));
    }
    Field field = hidden.getDeclaredField("finalLong"); field.setAccessible(true);
    try {
      lookup.unreflectSetter(field);
      throw new AssertionError("hidden final unreflect setter accepted");
    } catch (IllegalAccessException expected) { }
    try {
      lookup.findSetter(hidden, "finalLong", long.class);
      throw new AssertionError("hidden final direct setter accepted");
    } catch (IllegalAccessException expected) { }
    VarHandle variable = lookup.findVarHandle(hidden, "finalLong", long.class);
    check((long) variable.get(owner) == 9007199254740993L);
    check(!variable.isAccessModeSupported(VarHandle.AccessMode.SET));
    try {
      variable.set(owner, 9007199254740994L);
      throw new AssertionError("hidden final VarHandle write accepted");
    } catch (UnsupportedOperationException expected) { }
    emit("hc-identity-final-field-reflection", "accessible=true;all-9-set-families/findSetter/unreflectSetter=IllegalAccessException;VarHandle=read-only;values=unchanged");
  }

  private static void caseMutableReflection() throws Throwable {
    MethodHandles.Lookup lookup = define();
    Class<?> hidden = lookup.lookupClass();
    Object owner = hidden.getDeclaredConstructor().newInstance();
    check(owner.getClass() == hidden);
    Field field = hidden.getDeclaredField("number");
    check(field.getDeclaringClass() == hidden && field.getInt(owner) == 7);
    field.set(owner, Integer.valueOf(11)); field.setInt(owner, 13);
    check(field.getInt(owner) == 13);
    emit("hc-identity-mutable-reflection", "reflected-constructor=hidden;declaring-class=exact;ordinary-set/setInt=allowed;value=13");
  }

  public static void main(String[] args) throws Throwable {
    caseDistinctDefinitions();
    caseRuntimeNameDescriptor();
    caseClassForNameNonDiscovery();
    caseLookupNonDiscovery();
    caseOrdinaryTwinDistinct();
    caseThisClassMirror();
    caseOrdinarySelfDescriptors();
    caseHiddenArrays();
    caseHiddenArrayNonDiscovery();
    caseNonNominalRestrictions();
    caseDefaultNestIsolation();
    caseNestmateNonEnumeration();
    caseNestBytecodeAccess();
    caseNestLookupAccess();
    caseFinalFieldReflection();
    caseMutableReflection();
    System.out.println("HIDDEN_CLASS_IDENTITY_OK");
  }
}
