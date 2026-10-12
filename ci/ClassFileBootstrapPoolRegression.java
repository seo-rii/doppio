package classes.modern_test;

import java.lang.classfile.BootstrapMethodEntry;
import java.lang.classfile.ClassFile;
import java.lang.classfile.TypeKind;
import java.lang.classfile.constantpool.ConstantDynamicEntry;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.InvokeDynamicEntry;
import java.lang.classfile.constantpool.LoadableConstantEntry;
import java.lang.classfile.constantpool.MethodHandleEntry;
import java.lang.classfile.constantpool.MemberRefEntry;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.DirectMethodHandleDesc;
import java.lang.constant.DynamicCallSiteDesc;
import java.lang.constant.DynamicConstantDesc;
import java.lang.constant.MethodHandleDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/** Public bootstrap-import invariants; no class definition or bootstrap execution is used as a verifier. */
public final class ClassFileBootstrapPoolRegression {
  private static int completed;
  private static boolean nativeMode;
  private static void check(boolean condition, String name) {
    if (!condition) throw new AssertionError(name);
    completed++;
  }
  private static void invalidBootstrap(String name, int kind, boolean itf, String method, String descriptor,
      boolean nativeClean) {
    ClassFile api = ClassFile.of();
    ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    MemberRefEntry reference = itf ? pool.interfaceMethodRefEntry(ClassDesc.of("java.lang.Runnable"), method,
      MethodTypeDesc.ofDescriptor(descriptor)) : pool.methodRefEntry(ConstantDescs.CD_Object, method,
      MethodTypeDesc.ofDescriptor(descriptor));
    BootstrapMethodEntry bootstrap = pool.bsmEntry(pool.methodHandleEntry(kind, reference), Collections.emptyList());
    ConstantDynamicEntry constant = pool.constantDynamicEntry(bootstrap, pool.nameAndTypeEntry("invalid", ConstantDescs.CD_Object));
    byte[] bytes = api.build(pool.classEntry(ClassDesc.of("classes.modern_test.InvalidBootstrap" + name)), pool,
      builder -> builder.withMethodBody("run", MethodTypeDesc.of(ConstantDescs.CD_Object), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        code -> code.ldc(constant).areturn()));
    List<VerifyError> byteErrors = api.verify(bytes), modelErrors = api.verify(api.parse(bytes));
    // This metadata rejection is intentionally stricter than native for three cases;
    // it is a diagnostic policy boundary, not part of the original differential corpus.
    boolean clean = nativeMode && nativeClean;
    check(byteErrors.isEmpty() == clean && modelErrors.isEmpty() == clean, name + " byte/model bootstrap metadata verdict");
  }

  public static void main(String[] arguments) {
    nativeMode = arguments.length == 1 && "native".equals(arguments[0]);
    ConstantPoolBuilder source = ConstantPoolBuilder.of();
    MethodHandleEntry nullMethod = source.methodHandleEntry(ConstantDescs.BSM_NULL_CONSTANT);
    check(nullMethod.kind() == 6 && nullMethod.reference().tag() == 10, "static nominal handle uses a method reference");
    check(nullMethod.asSymbol().equals(ConstantDescs.BSM_NULL_CONSTANT), "method-handle symbol roundtrip");
    DirectMethodHandleDesc field = MethodHandleDesc.ofField(DirectMethodHandleDesc.Kind.STATIC_GETTER,
      ClassDesc.of("java.lang.Integer"), "MAX_VALUE", ConstantDescs.CD_int);
    MethodHandleEntry fieldEntry = source.methodHandleEntry(field);
    check(fieldEntry.kind() == 2 && fieldEntry.reference().tag() == 9 && fieldEntry.asSymbol().equals(field), "field nominal handle shape");
    check(source.loadableConstantEntry(ConstantDescs.BSM_NULL_CONSTANT) == nullMethod, "nominal handles are loadable and interned");

    BootstrapMethodEntry empty = source.bsmEntry(nullMethod, Collections.emptyList());
    check(empty == source.bsmEntry(ConstantDescs.BSM_NULL_CONSTANT, Collections.emptyList()), "nominal bootstrap interning");
    DynamicConstantDesc<?> nominal = DynamicConstantDesc.ofNamed(ConstantDescs.BSM_NULL_CONSTANT,
      "nothing", ConstantDescs.CD_Object);
    ConstantDynamicEntry nested = source.constantDynamicEntry(nominal);
    check(nested.tag() == 17 && nested.width() == 1 && nested.typeKind() == TypeKind.REFERENCE, "reference condy consumes one pool slot");
    check(nested.asSymbol().equals(nominal) && nested.constantValue().equals(nominal), "condy description roundtrip is non-resolving");
    check(nested.bootstrap() == empty && nested.bootstrapMethodIndex() == empty.bsmIndex(), "condy bootstrap is owned and interned");
    check(source.loadableConstantEntry(nominal) == nested, "nominal condy is loadable and interned");
    check(nested.asSymbol() == nested.asSymbol() && nested.constantValue() == nested.asSymbol(), "pooled condy symbol is cached");
    ConstantDynamicEntry diamond = nested;
    for (int depth = 0; depth < 24; depth++)
      diamond = source.constantDynamicEntry(source.bsmEntry(nullMethod, Arrays.<LoadableConstantEntry>asList(diamond, diamond)),
        source.nameAndTypeEntry("diamond" + depth, ConstantDescs.CD_Object));
    DynamicConstantDesc<?> diamondSymbol = diamond.asSymbol();
    check(diamondSymbol == diamond.asSymbol(), "deep finite diamond root symbol is cached");
    boolean sharedDiamond = true;
    DynamicConstantDesc<?> cursor = diamondSymbol;
    for (int depth = 0; depth < 24; depth++) {
      ConstantDesc[] children = cursor.bootstrapArgs();
      sharedDiamond &= children.length == 2 && children[0] == children[1];
      cursor = (DynamicConstantDesc<?>) children[0];
    }
    check(sharedDiamond && cursor == nested.asSymbol(), "diamond nodes share cached child symbols without exponential reconstruction");
    ConstantDynamicEntry wide = source.constantDynamicEntry(DynamicConstantDesc.ofNamed(ConstantDescs.BSM_EXPLICIT_CAST,
      "wide", ConstantDescs.CD_long, (ConstantDesc) (Object) Long.valueOf(17)));
    check(wide.typeKind() == TypeKind.LONG && wide.typeKind().slotSize() == 2 && wide.width() == 1,
      "category-two condy has one CP slot but two operand slots");

    List<LoadableConstantEntry> rich = Arrays.<LoadableConstantEntry>asList(source.stringEntry("recipe"),
      source.intEntry(42), source.longEntry(43), source.doubleEntry(44), source.methodTypeEntry(MethodTypeDesc.of(ConstantDescs.CD_int)),
      source.classEntry(ConstantDescs.CD_String), nullMethod, nested);
    BootstrapMethodEntry foreign = source.bsmEntry(nullMethod, rich);
    check(foreign.arguments().size() == 8 && foreign.arguments().get(7) == nested, "all selected argument tags retained");
    ConstantPoolBuilder target = ConstantPoolBuilder.of();
    target.bsmEntry(target.methodHandleEntry(ConstantDescs.BSM_NULL_CONSTANT),
      Collections.<LoadableConstantEntry>singletonList(target.stringEntry("seed0")));
    target.bsmEntry(target.methodHandleEntry(ConstantDescs.BSM_NULL_CONSTANT),
      Collections.<LoadableConstantEntry>singletonList(target.stringEntry("seed1")));
    ConstantDynamicEntry imported = target.constantDynamicEntry(foreign, target.nameAndTypeEntry("imported", ConstantDescs.CD_Object));
    BootstrapMethodEntry rebuilt = imported.bootstrap();
    check(rebuilt.constantPool() == target && rebuilt.bootstrapMethod().constantPool() == target, "foreign bootstrap method rebuilt in target pool");
    check(rebuilt.bsmIndex() != foreign.bsmIndex() && imported.bootstrapMethodIndex() == rebuilt.bsmIndex(), "bootstrap indexes are remapped, not copied");
    boolean allOwned = true;
    for (LoadableConstantEntry argument : rebuilt.arguments()) allOwned &= argument.constantPool() == target;
    check(allOwned, "all bootstrap arguments rebuilt in target pool");
    ConstantDynamicEntry rebuiltNested = (ConstantDynamicEntry) rebuilt.arguments().get(7);
    check(rebuiltNested.bootstrap().constantPool() == target && rebuiltNested.asSymbol().equals(nominal), "nested condy bootstrap imported recursively");
    check(target.constantDynamicEntry(foreign, target.nameAndTypeEntry("imported", ConstantDescs.CD_Object)) == imported,
      "repeated foreign import is semantically interned");
    check(!target.canWriteDirect(source), "semantic import does not grant foreign raw-copy authority");

    DirectMethodHandleDesc concat = MethodHandleDesc.ofMethod(DirectMethodHandleDesc.Kind.STATIC,
      ClassDesc.of("java.lang.invoke.StringConcatFactory"), "makeConcatWithConstants",
      MethodTypeDesc.of(ConstantDescs.CD_CallSite, ConstantDescs.CD_MethodHandles_Lookup,
        ConstantDescs.CD_String, ConstantDescs.CD_MethodType, ConstantDescs.CD_String, ConstantDescs.CD_Object.arrayType()));
    ConstantDesc[] recipe = new ConstantDesc[] {(ConstantDesc) (Object) "value=\u0001"};
    DynamicCallSiteDesc callSite = DynamicCallSiteDesc.of(concat, "concat", MethodTypeDesc.of(ConstantDescs.CD_String, ConstantDescs.CD_String), recipe);
    recipe[0] = (ConstantDesc) (Object) "changed";
    check("value=\u0001".equals(callSite.bootstrapArgs()[0]), "nominal bootstrap arguments defensively copied");
    ConstantDesc[] accessor = callSite.bootstrapArgs(); accessor[0] = (ConstantDesc) (Object) "changed-again";
    check("value=\u0001".equals(callSite.bootstrapArgs()[0]), "nominal bootstrap argument accessor defensive");
    InvokeDynamicEntry invocation = target.invokeDynamicEntry(callSite);
    check(invocation.tag() == 18 && invocation.asSymbol().equals(callSite), "invokedynamic nominal symbol roundtrip");
    check(invocation.typeSymbol().equals(callSite.invocationType()) && invocation.name().equalsString("concat"), "invokedynamic name and method type");
    check(target.invokeDynamicEntry(callSite) == invocation &&
      callSite.withNameAndType("concat", callSite.invocationType()).equals(callSite), "invokedynamic and nominal descriptor interning/equality");
    check("<init>".equals(callSite.withNameAndType("<init>", callSite.invocationType()).invocationName()),
      "constructor name is allowed as an unresolved nominal description");
    check("<clinit>".equals(callSite.withNameAndType("<clinit>", callSite.invocationType()).invocationName()),
      "class initializer name is allowed as an unresolved nominal description");
    invalidBootstrap("Kind8Interface", 8, true, "<init>", "()V", true);
    invalidBootstrap("Kind8WrongName", 8, false, "notify", "()V", true);
    invalidBootstrap("Kind8NonVoid", 8, false, "<init>", "()I", false);
    invalidBootstrap("Kind6Init", 6, false, "<init>", "()V", true);
    System.out.println("CLASSFILE_BOOTSTRAP_POOL_REGRESSION_OK|" + completed);
  }
}
