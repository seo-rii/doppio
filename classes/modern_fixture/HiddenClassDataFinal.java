package classes.modern_test;

import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import static classes.modern_test.HiddenClassSupport.*;

/** C5 genuine class-data identity, initialization, conversions and authority. */
public final class HiddenClassDataFinal {
  public static int initializations;

  public static class Payload {
    static { initializations++; }
    public static Object selfData() throws IllegalAccessException {
      return MethodHandles.classData(MethodHandles.lookup(), "_", Object.class);
    }
  }

  private static byte[] payload() throws Exception {
    return bytes(HiddenClassDataFinal.class, "HiddenClassDataFinal$Payload.class");
  }

  private static MethodHandles.Lookup define(Object data) throws Exception {
    return MethodHandles.lookup().defineHiddenClassWithClassData(payload(), data, false);
  }

  private static MethodHandles.Lookup noData() throws Exception {
    return MethodHandles.lookup().defineHiddenClass(payload(), false);
  }

  private static void caseReferenceIdentity() throws Throwable {
    Object data = new Object();
    MethodHandles.Lookup lookup = define(data);
    check(MethodHandles.classData(lookup, "_", Object.class) == data);
    check(MethodHandles.classData(lookup, "_", Object.class) == data);
    emit("hc-data-reference-identity", "original-reference=identity;repeated-query=same;lookup=hidden");
  }

  private static void caseDefinitionIsolation() throws Throwable {
    Object first = new Object(), second = new Object();
    MethodHandles.Lookup a = define(first), b = define(second);
    check(a.lookupClass() != b.lookupClass());
    check(MethodHandles.classData(a, "_", Object.class) == first);
    check(MethodHandles.classData(b, "_", Object.class) == second);
    emit("hc-data-definition-isolation", "same-payload=distinct-classes;data=isolated-identities");
  }

  private static void caseQueryInitializes() throws Throwable {
    int before = initializations;
    Object data = new Object();
    MethodHandles.Lookup lookup = define(data);
    check(initializations == before);
    check(MethodHandles.classData(lookup, "_", Object.class) == data && initializations == before + 1);
    check(MethodHandles.classData(lookup, "_", Object.class) == data && initializations == before + 1);
    emit("hc-data-query-initializes", "definition=passive;first-query=initializer-once;repeat=no-extra-init");
  }

  private static void caseIndexedQueryInitializes() throws Throwable {
    int before = initializations;
    Object item = new Object();
    MethodHandles.Lookup lookup = define(Arrays.asList(item));
    check(initializations == before);
    check(MethodHandles.classDataAt(lookup, "_", Object.class, 0) == item && initializations == before + 1);
    check(MethodHandles.classDataAt(lookup, "_", Object.class, 0) == item && initializations == before + 1);
    emit("hc-data-indexed-query-initializes", "list-element=identity;definition=passive;indexed-query=initializer-once");
  }

  private static void caseMissingData() throws Throwable {
    int before = initializations;
    MethodHandles.Lookup lookup = noData();
    check(MethodHandles.classData(lookup, "_", Object.class) == null && initializations == before + 1);
    check(MethodHandles.classData(MethodHandles.lookup(), "_", Object.class) == null);
    emit("hc-data-missing-data", "hidden/ordinary=null;hidden-query=initializer-once");
  }

  private static void caseMissingDataConversionIndex() throws Throwable {
    MethodHandles.Lookup lookup = noData();
    Integer absent = MethodHandles.classData(lookup, "_", int.class);
    check(absent == null && MethodHandles.classDataAt(lookup, "_", Object.class, -1) == null);
    check(MethodHandles.classDataAt(lookup, "_", int.class, Integer.MAX_VALUE) == null);
    emit("hc-data-missing-data-conversion-index", "absent-primitive=null;absent-negative/max-index=null;no-unbox/index-access");
  }

  private static void caseReferenceConversion() throws Throwable {
    String text = new String("payload");
    MethodHandles.Lookup lookup = define(text);
    check(MethodHandles.classData(lookup, "_", String.class) == text);
    check(MethodHandles.classData(lookup, "_", CharSequence.class) == text);
    check(MethodHandles.classData(lookup, "_", Object.class) == text);
    emit("hc-data-reference-conversion", "String/CharSequence/Object=original-identity");
  }

  private static void caseReferenceConversionFailure() throws Throwable {
    MethodHandles.Lookup lookup = define(new Object());
    rejectData(lookup, "_", String.class, ClassCastException.class);
    rejectData(lookup, "_", List.class, ClassCastException.class);
    emit("hc-data-reference-conversion-failure", "Object-to-String/List=ClassCastException;rejections=2");
  }

  private static void casePrimitiveWidening() throws Throwable {
    MethodHandles.Lookup integer = define(Integer.valueOf(11));
    check(MethodHandles.classData(integer, "_", int.class).intValue() == 11);
    check(MethodHandles.classData(integer, "_", long.class).longValue() == 11L);
    check(MethodHandles.classData(integer, "_", double.class).doubleValue() == 11.0d);
    MethodHandles.Lookup wide = define(Long.valueOf(9007199254740993L));
    check(MethodHandles.classData(wide, "_", long.class).longValue() == 9007199254740993L);
    MethodHandles.Lookup character = define(Character.valueOf('a'));
    check(MethodHandles.classData(character, "_", int.class).intValue() == 97);
    MethodHandles.Lookup flag = define(Boolean.TRUE);
    check(MethodHandles.classData(flag, "_", boolean.class).booleanValue());
    emit("hc-data-primitive-widening", "Integer-to-int/long/double=11;wide-long=9007199254740993;char-to-int=97;boolean=true");
  }

  private static void casePrimitiveConversionFailure() throws Throwable {
    MethodHandles.Lookup integer = define(Integer.valueOf(11));
    rejectData(integer, "_", byte.class, ClassCastException.class);
    rejectData(integer, "_", boolean.class, ClassCastException.class);
    rejectData(integer, "_", void.class, IllegalArgumentException.class);
    emit("hc-data-primitive-conversion-failure", "narrowing/boolean=ClassCastException;void=IllegalArgumentException");
  }

  private static void caseListIdentityAndMutation() throws Throwable {
    Object first = new Object(), second = new Object();
    List<Object> list = new ArrayList<>(); list.add(first);
    MethodHandles.Lookup lookup = define(list);
    check(MethodHandles.classData(lookup, "_", List.class) == list);
    check(MethodHandles.classDataAt(lookup, "_", Object.class, 0) == first);
    list.set(0, second);
    check(MethodHandles.classDataAt(lookup, "_", Object.class, 0) == second);
    emit("hc-data-list-identity-mutation", "list=original-reference;elements=original-identities;caller-mutation=visible");
  }

  private static void caseListBounds() throws Throwable {
    List<Object> list = new ArrayList<>(); list.add(new Object());
    MethodHandles.Lookup lookup = define(list);
    rejectDataAt(lookup, "_", Object.class, -1, IndexOutOfBoundsException.class);
    rejectDataAt(lookup, "_", Object.class, 1, IndexOutOfBoundsException.class);
    emit("hc-data-list-bounds", "ArrayList-negative/size-index=IndexOutOfBoundsException-family;rejections=2");
  }

  private static void caseListConversionAndNull() throws Throwable {
    MethodHandles.Lookup list = define(Arrays.asList(Integer.valueOf(11), null));
    check(MethodHandles.classDataAt(list, "_", long.class, 0).longValue() == 11L);
    check(MethodHandles.classDataAt(list, "_", Object.class, 1) == null);
    rejectDataAt(list, "_", int.class, 1, NullPointerException.class);
    rejectDataAt(define("not-a-list"), "_", Object.class, 0, ClassCastException.class);
    emit("hc-data-list-conversion-null", "element-Integer-to-long=11;null-reference=null;null-unbox=NullPointerException;non-list=ClassCastException");
  }

  private static void caseInvalidArguments() throws Throwable {
    MethodHandles.Lookup lookup = define(new Object());
    MethodHandles.Lookup list = define(Arrays.asList(new Object()));
    rejectData(lookup, "wrong", Object.class, IllegalArgumentException.class);
    rejectData(lookup, null, Object.class, IllegalArgumentException.class);
    rejectData(lookup, "_", null, NullPointerException.class);
    rejectData(null, "_", Object.class, NullPointerException.class);
    rejectDataAt(list, "wrong", Object.class, 0, IllegalArgumentException.class);
    rejectDataAt(list, null, Object.class, 0, IllegalArgumentException.class);
    rejectDataAt(list, "_", null, 0, NullPointerException.class);
    rejectDataAt(null, "_", Object.class, 0, NullPointerException.class);
    try {
      MethodHandles.lookup().defineHiddenClassWithClassData(payload(), null, false);
      throw new AssertionError("null class data accepted");
    } catch (NullPointerException expected) { }
    emit("hc-data-invalid-arguments", "name/wrong-null=IllegalArgumentException;type/caller/data-null=NullPointerException;rejections=9");
  }

  private static void caseOriginalAuthorityRequired() throws Throwable {
    MethodHandles.Lookup lookup = define(new Object());
    MethodHandles.Lookup dropped = lookup.dropLookupMode(MethodHandles.Lookup.ORIGINAL);
    MethodHandles.Lookup privateLookup = MethodHandles.privateLookupIn(lookup.lookupClass(), MethodHandles.lookup());
    check(dropped.hasFullPrivilegeAccess() && privateLookup.hasFullPrivilegeAccess());
    check((privateLookup.lookupModes() & MethodHandles.Lookup.ORIGINAL) == 0);
    rejectData(dropped, "_", Object.class, IllegalAccessException.class);
    rejectData(privateLookup, "_", Object.class, IllegalAccessException.class);
    rejectData(MethodHandles.publicLookup(), "_", Object.class, IllegalAccessException.class);
    rejectDataAt(privateLookup, "_", Object.class, 0, IllegalAccessException.class);
    emit("hc-data-original-authority-required", "dropped/privateLookupIn=full-without-ORIGINAL;public=denied;data/indexed=IllegalAccessException;rejections=4");
  }

  private static void caseOriginatingHiddenLookup() throws Throwable {
    Object data = new Object();
    MethodHandles.Lookup lookup = define(data);
    check(lookup.in(lookup.lookupClass()) == lookup);
    Object actual = (Object) lookup.findStatic(lookup.lookupClass(), "selfData", MethodType.methodType(Object.class)).invokeExact();
    check(actual == data);
    rejectData(lookup.in(Object.class), "_", Object.class, IllegalAccessException.class);
    emit("hc-data-originating-hidden-lookup", "in-self=identity;lookup-from-hidden-bytecode=ORIGINAL/data-identity;in-other=denied");
  }

  public static void main(String[] args) throws Throwable {
    caseReferenceIdentity();
    caseDefinitionIsolation();
    caseQueryInitializes();
    caseIndexedQueryInitializes();
    caseMissingData();
    caseMissingDataConversionIndex();
    caseReferenceConversion();
    caseReferenceConversionFailure();
    casePrimitiveWidening();
    casePrimitiveConversionFailure();
    caseListIdentityAndMutation();
    caseListBounds();
    caseListConversionAndNull();
    caseInvalidArguments();
    caseOriginalAuthorityRequired();
    caseOriginatingHiddenLookup();
    System.out.println("HIDDEN_CLASS_DATA_OK");
  }
}
