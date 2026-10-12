package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.Arrays;
import static classes.modern_test.HiddenClassSupport.*;

/** C5 original javac inputs: definition, initialization and rejected bytes. */
public final class HiddenClassDefinitionFinal {
  public static int initializations;

  public static class Payload {
    static { initializations++; }
    private final int number;
    public Payload() { number = 41; }
    private int value() { return number; }
    public static int staticValue() { return 43; }
  }

  public interface InterfacePayload {
    static int value() { return 59; }
  }

  public static class BadSelf {
    public BadSelf self() { return this; }
  }

  private static byte[] payload() throws Exception {
    return bytes(HiddenClassDefinitionFinal.class, "HiddenClassDefinitionFinal$Payload.class");
  }

  private static MethodHandles.Lookup define(boolean initialize,
      MethodHandles.Lookup.ClassOption... options) throws Exception {
    return MethodHandles.lookup().defineHiddenClass(payload(), initialize, options);
  }

  private static void casePassiveDefinition() throws Throwable {
    int before = initializations;
    MethodHandles.Lookup lookup = define(false);
    Class<?> hidden = lookup.lookupClass();
    check(hidden.isHidden() && !HiddenClassDefinitionFinal.class.isHidden());
    check(lookup.lookupModes() == 95 && lookup.hasFullPrivilegeAccess());
    check(initializations == before);
    check(hidden.getClassLoader() == HiddenClassDefinitionFinal.class.getClassLoader());
    check(hidden.getPackageName().equals(HiddenClassDefinitionFinal.class.getPackageName()));
    check(hidden.getProtectionDomain() == HiddenClassDefinitionFinal.class.getProtectionDomain());
    emit("hc-definition-passive", "hidden=true;ordinary=false;lookup=95;loader/domain=same;initialization=absent");
  }

  private static void caseEagerDefinition() throws Throwable {
    int before = initializations;
    MethodHandles.Lookup lookup = define(true);
    check(initializations == before + 1);
    check((int) lookup.findStatic(lookup.lookupClass(), "staticValue", MethodType.methodType(int.class)).invokeExact() == 43);
    check(initializations == before + 1);
    emit("hc-definition-eager", "initialize=true;initializer=once;static-call=43");
  }

  private static void caseEnsureInitialized() throws Throwable {
    int before = initializations;
    MethodHandles.Lookup lookup = define(false);
    Class<?> hidden = lookup.lookupClass();
    check(initializations == before);
    check(lookup.ensureInitialized(hidden) == hidden);
    check(lookup.ensureInitialized(hidden) == hidden && initializations == before + 1);
    emit("hc-definition-ensure-initialized", "passive=0;ensure=identity;repeated-ensure=once");
  }

  private static void caseConstructorPrivateHandle() throws Throwable {
    MethodHandles.Lookup lookup = define(false);
    Class<?> hidden = lookup.lookupClass();
    MethodHandle constructor = lookup.findConstructor(hidden, MethodType.methodType(void.class));
    check(constructor.type().returnType() == hidden);
    Object owner = constructor.invoke();
    check(owner.getClass() == hidden);
    MethodHandle value = lookup.findVirtual(hidden, "value", MethodType.methodType(int.class));
    check(value.type().parameterType(0) == hidden && (int) value.invoke(owner) == 41);
    emit("hc-definition-private-constructor-handle", "constructor-return=hidden;private-method=41;receiver=exact-class");
  }

  private static void casePublicLookupDenied() throws Throwable {
    int before = initializations;
    rejectDefinition(MethodHandles.publicLookup(), payload(), true, IllegalAccessException.class);
    check(initializations == before);
    emit("hc-definition-public-lookup-denied", "IllegalAccessException;initialization=absent");
  }

  private static void caseDroppedPrivateDenied() throws Throwable {
    MethodHandles.Lookup dropped = MethodHandles.lookup().dropLookupMode(MethodHandles.Lookup.PRIVATE);
    check(!dropped.hasFullPrivilegeAccess());
    rejectDefinition(dropped, payload(), false, IllegalAccessException.class);
    emit("hc-definition-dropped-private-denied", "PRIVATE-absent;full=false;IllegalAccessException");
  }

  private static void caseDroppedModuleDenied() throws Throwable {
    MethodHandles.Lookup dropped = MethodHandles.lookup().dropLookupMode(MethodHandles.Lookup.MODULE);
    check(!dropped.hasFullPrivilegeAccess());
    rejectDefinition(dropped, payload(), false, IllegalAccessException.class);
    emit("hc-definition-dropped-module-denied", "MODULE-absent;full=false;IllegalAccessException");
  }

  private static void caseDroppedOriginalAllowed() throws Throwable {
    MethodHandles.Lookup dropped = MethodHandles.lookup().dropLookupMode(MethodHandles.Lookup.ORIGINAL);
    check(dropped.hasFullPrivilegeAccess() && (dropped.lookupModes() & MethodHandles.Lookup.ORIGINAL) == 0);
    MethodHandles.Lookup hidden = dropped.defineHiddenClass(payload(), false);
    check(hidden.lookupClass().isHidden() && hidden.lookupModes() == 95);
    emit("hc-definition-dropped-original-allowed", "caller-ORIGINAL=absent;full=true;defined-lookup=95");
  }

  private static void caseForeignPackageDenied() throws Throwable {
    byte[] foreign = bytes(HiddenClassDefinitionFinal.class,
        "/classes/modern_hidden_foreign/ForeignPayload.class");
    rejectDefinition(MethodHandles.lookup(), foreign, false, IllegalArgumentException.class);
    emit("hc-definition-foreign-package-denied", "different-package=IllegalArgumentException");
  }

  private static void caseNullArguments() throws Throwable {
    MethodHandles.Lookup caller = MethodHandles.lookup();
    rejectDefinition(caller, null, false, NullPointerException.class);
    rejectDefinition(caller, payload(), false, NullPointerException.class,
        (MethodHandles.Lookup.ClassOption[]) null);
    rejectDefinition(caller, payload(), false, NullPointerException.class,
        new MethodHandles.Lookup.ClassOption[]{null});
    emit("hc-definition-null-arguments", "bytes/options/option-element=NullPointerException;rejections=3");
  }

  private static void caseMalformedBytes() throws Throwable {
    MethodHandles.Lookup caller = MethodHandles.lookup();
    byte[] source = payload(), magic = source.clone();
    magic[0] = 0;
    rejectDefinition(caller, new byte[0], false, ClassFormatError.class);
    rejectDefinition(caller, prefix(source, 7), false, ClassFormatError.class);
    rejectDefinition(caller, magic, false, ClassFormatError.class);
    check((source[0] & 255) == 202);
    emit("hc-definition-malformed-bytes", "empty/truncated/bad-magic=ClassFormatError;original-bytes=unchanged");
  }

  private static void caseUnsupportedVersion() throws Throwable {
    byte[] source = payload(), future = source.clone();
    future[6] = 127; future[7] = -1;
    rejectDefinition(MethodHandles.lookup(), future, false, UnsupportedClassVersionError.class);
    check(Arrays.equals(source, payload()));
    emit("hc-definition-unsupported-version", "invalid-request-major=32767;UnsupportedClassVersionError;original-bytes=unchanged");
  }

  private static void caseInterfaceDefinition() throws Throwable {
    byte[] source = bytes(HiddenClassDefinitionFinal.class,
        "HiddenClassDefinitionFinal$InterfacePayload.class");
    MethodHandles.Lookup lookup = MethodHandles.lookup().defineHiddenClass(source, true);
    Class<?> hidden = lookup.lookupClass();
    check(hidden.isHidden() && hidden.isInterface() && hidden.getNestHost() == hidden);
    check((int) lookup.findStatic(hidden, "value", MethodType.methodType(int.class)).invokeExact() == 59);
    emit("hc-definition-interface", "hidden/interface=true;self-nest=true;static-value=59");
  }

  private static void caseStrongOption() throws Throwable {
    MethodHandles.Lookup lookup = define(false, MethodHandles.Lookup.ClassOption.STRONG);
    check(lookup.lookupClass().isHidden() && lookup.lookupClass().getNestHost() == lookup.lookupClass());
    emit("hc-definition-strong-option", "definition=accepted;hidden=true;self-nest=true;GC-lifetime=unclaimed");
  }

  private static void caseNestmateStrongOptions() throws Throwable {
    MethodHandles.Lookup lookup = define(false, MethodHandles.Lookup.ClassOption.NESTMATE,
        MethodHandles.Lookup.ClassOption.STRONG);
    check(lookup.lookupClass().isHidden());
    check(lookup.lookupClass().getNestHost() == HiddenClassDefinitionFinal.class);
    check(lookup.lookupClass().isNestmateOf(HiddenClassDefinitionFinal.class));
    rejectDefinition(MethodHandles.lookup(), payload(), false, IllegalArgumentException.class,
        MethodHandles.Lookup.ClassOption.NESTMATE, MethodHandles.Lookup.ClassOption.NESTMATE);
    emit("hc-definition-combined-options", "NESTMATE/STRONG=accepted;duplicate=IllegalArgumentException;host=caller-nest;GC-lifetime=unclaimed");
  }

  private static void caseSelfReturnVerification() throws Throwable {
    byte[] bad = bytes(HiddenClassDefinitionFinal.class, "HiddenClassDefinitionFinal$BadSelf.class");
    rejectDefinition(MethodHandles.lookup(), bad, false, VerifyError.class);
    MethodHandles.Lookup valid = define(false);
    check(valid.lookupClass().isHidden());
    emit("hc-definition-self-return-verification", "hidden-this-to-ordinary-return=VerifyError;subsequent-valid-definition=allowed");
  }

  public static void main(String[] args) throws Throwable {
    casePassiveDefinition();
    caseEagerDefinition();
    caseEnsureInitialized();
    caseConstructorPrivateHandle();
    casePublicLookupDenied();
    caseDroppedPrivateDenied();
    caseDroppedModuleDenied();
    caseDroppedOriginalAllowed();
    caseForeignPackageDenied();
    caseNullArguments();
    caseMalformedBytes();
    caseUnsupportedVersion();
    caseInterfaceDefinition();
    caseStrongOption();
    caseNestmateStrongOptions();
    caseSelfReturnVerification();
    System.out.println("HIDDEN_CLASS_DEFINITION_OK");
  }
}
