package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.Signature.*;
import java.lang.classfile.attribute.SignatureAttribute;
import java.lang.classfile.constantpool.*;
import java.lang.constant.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/** Complete generic-signature factory/tree and real typed-attribute diagnostics. */
public final class ClassFileSignatureTreeRegression {
  private static int checks;
  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
    checks++;
  }
  private static void expect(Class<? extends Throwable> type, Runnable action) {
    try { action.run(); }
    catch (Throwable error) {
      check(type.isInstance(error), "Expected " + type.getName() + ", got " + error.getClass().getName());
      return;
    }
    throw new AssertionError("Expected " + type.getName());
  }
  private static ClassTypeSig objectType() { return ClassTypeSig.of(ConstantDescs.CD_Object); }

  private static void parameters() {
    RefTypeSig object = objectType(), serializable = ClassTypeSig.of("java.io.Serializable");
    RefTypeSig[] interfaces = {serializable};
    TypeParam bounded = TypeParam.of("T", object, interfaces);
    check(bounded.identifier().equals("T") && bounded.classBound().get() == object && bounded.interfaceBounds().get(0) == serializable,
      "Type parameter retains real bound trees");
    interfaces[0] = ClassTypeSig.of("java.lang.Cloneable");
    check(bounded.interfaceBounds().get(0) == serializable, "Type parameter defensively copies its varargs");
    expect(UnsupportedOperationException.class, () -> bounded.interfaceBounds().clear());
    TypeParam optional = TypeParam.of("T", Optional.of(object), serializable);
    check(optional.equals(bounded) && optional.hashCode() == bounded.hashCode(), "Raw/Optional bound factories have structural values");
    TypeParam noClassBound = TypeParam.of("T", (RefTypeSig) null, serializable);
    check(!noClassBound.classBound().isPresent() && noClassBound.interfaceBounds().equals(Collections.singletonList(serializable)),
      "Nullable raw bound represents an interface-only declaration");
    check(TypeParam.of("T", Optional.empty(), serializable).equals(noClassBound), "Empty optional bound is genuine absence");
    check(TypeParam.of("", (RefTypeSig) null).identifier().equals("") && TypeParam.of("bad:name", object).identifier().equals("bad:name"),
      "Factories require non-null identifiers, not invented grammar validation");
    expect(UnsupportedOperationException.class, () -> TypeParam.of("T", (RefTypeSig) null).interfaceBounds().clear());
    expect(NullPointerException.class, () -> TypeParam.of(null, object));
    expect(NullPointerException.class, () -> TypeParam.of("T", (Optional<RefTypeSig>) null));
    expect(NullPointerException.class, () -> TypeParam.of("T", object, (RefTypeSig[]) null));
    expect(NullPointerException.class, () -> TypeParam.of("T", object, new RefTypeSig[] {null}));
  }

  private static void classes() {
    String[] signatures = {"Ljava/lang/Object;", "Ljava/lang/Object;Ljava/io/Serializable;Ljava/lang/Comparable<Ljava/lang/String;>;",
      "<T:Ljava/lang/Object;>Ljava/lang/Object;", "<T::Ljava/io/Serializable;:Ljava/lang/Comparable<TT;>;>Ljava/lang/Object;",
      "<K:Ljava/lang/Object;V:TK;>Ljava/util/AbstractMap<TK;TV;>;Ljava/util/Map<TK;TV;>;",
      "<T:[I>Ljava/lang/Object;", "Lpkg/Outer<TT;>.Inner<*>;Ljava/lang/Cloneable;"};
    for (String source : signatures) {
      ClassSignature parsed = ClassSignature.parseFrom(source);
      check(parsed.signatureString().equals(source) && parsed.equals(ClassSignature.parseFrom(source)), "Class signatures roundtrip as complete typed trees");
      check(parsed.hashCode() == ClassSignature.parseFrom(source).hashCode(), "Class tree structural hash equality");
    }
    ClassSignature interfaceOnly = ClassSignature.parseFrom("<T::Ljava/io/Serializable;:Ljava/lang/Comparable<TT;>;>Ljava/lang/Object;");
    TypeParam parameter = interfaceOnly.typeParameters().get(0);
    check(parameter.identifier().equals("T") && !parameter.classBound().isPresent() && parameter.interfaceBounds().size() == 2,
      "Parser preserves absent class bound and multiple interfaces");
    check(((TypeArg.Bounded) ((ClassTypeSig) parameter.interfaceBounds().get(1)).typeArgs().get(0)).boundType().equals(TypeVarSig.of("T")),
      "Bound type argument is a real type-variable node");
    ClassSignature nested = ClassSignature.parseFrom(signatures[6]);
    check(nested.superclassSignature().outerType().get().className().equals("pkg/Outer") &&
      nested.superclassSignature().classDesc().equals(ClassDesc.of("pkg.Outer$Inner")), "Class supertype retains nested structure");
    List<TypeParam> parameters = new ArrayList<TypeParam>(); parameters.add(TypeParam.of("T", objectType()));
    ClassTypeSig serializable = ClassTypeSig.of("java.io.Serializable");
    ClassTypeSig[] interfaces = {serializable};
    ClassSignature nominal = ClassSignature.of(parameters, objectType(), interfaces);
    String expected = "<T:Ljava/lang/Object;>Ljava/lang/Object;Ljava/io/Serializable;";
    parameters.clear(); interfaces[0] = objectType();
    check(nominal.signatureString().equals(expected) && nominal.equals(ClassSignature.parseFrom(expected)), "Generic class factory copies both collections");
    check(ClassSignature.of(objectType(), serializable).signatureString().equals("Ljava/lang/Object;Ljava/io/Serializable;"), "Simple class factory");
    expect(UnsupportedOperationException.class, () -> nominal.typeParameters().clear());
    expect(UnsupportedOperationException.class, () -> nominal.superinterfaceSignatures().clear());
    expect(UnsupportedOperationException.class, () -> ClassSignature.parseFrom("Ljava/lang/Object;").typeParameters().clear());
    expect(UnsupportedOperationException.class, () -> ClassSignature.parseFrom("Ljava/lang/Object;").superinterfaceSignatures().clear());
    expect(NullPointerException.class, () -> ClassSignature.of((ClassTypeSig) null));
    expect(NullPointerException.class, () -> ClassSignature.of((List<TypeParam>) null, objectType()));
    expect(NullPointerException.class, () -> ClassSignature.of(Arrays.asList((TypeParam) null), objectType()));
    expect(NullPointerException.class, () -> ClassSignature.of(objectType(), (ClassTypeSig[]) null));
    expect(NullPointerException.class, () -> ClassSignature.of(objectType(), new ClassTypeSig[] {null}));
    expect(NullPointerException.class, () -> ClassSignature.parseFrom(null));
    for (String invalid : Arrays.asList("", "I", "TT;", "[Ljava/lang/Object;", "Ljava/lang/Object;I", "Ljava/lang/Object;;",
      "<>Ljava/lang/Object;", "<T:>Ljava/lang/Object;", "<T:Ljava/lang/Object;", "<:Ljava/lang/Object;>Ljava/lang/Object;",
      "<T:::Ljava/lang/Object;>Ljava/lang/Object;", "Ljava/lang/Object"))
      expect(IllegalArgumentException.class, () -> ClassSignature.parseFrom(invalid));
  }

  private static void methods() {
    String[] signatures = {"()V", "(I[JLjava/lang/String;)Ljava/lang/Object;", "<T:Ljava/lang/Object;>(TT;)TT;",
      "<T::Ljava/lang/Comparable<TT;>;>(TT;)TT;^Ljava/lang/Exception;^TT;", "<T:[I>([TT;[V)V", "(V)V",
      "(Ljava/util/List<+TT;>;)[Ljava/util/List<-TT;>;^Ljava/lang/RuntimeException;"};
    for (String source : signatures) {
      MethodSignature parsed = MethodSignature.parseFrom(source);
      check(parsed.signatureString().equals(source) && parsed.equals(MethodSignature.parseFrom(source)), "Complete method tree roundtrip");
      check(parsed.hashCode() == MethodSignature.parseFrom(source).hashCode(), "Method tree structural hash equality");
    }
    MethodSignature generic = MethodSignature.parseFrom(signatures[3]);
    check(generic.typeParameters().get(0).classBound().equals(Optional.empty()) && generic.arguments().get(0).equals(TypeVarSig.of("T")) &&
      generic.result().equals(TypeVarSig.of("T")), "Method parameters/result reference actual generic nodes");
    check(generic.throwableSignatures().get(0) instanceof ClassTypeSig && generic.throwableSignatures().get(1) instanceof TypeVarSig,
      "Thrown signatures retain class and type-variable variants");
    List<TypeParam> parameters = new ArrayList<TypeParam>(); parameters.add(TypeParam.of("T", objectType()));
    List<ThrowableSig> exceptions = new ArrayList<ThrowableSig>(); exceptions.add(ClassTypeSig.of("java.lang.Exception"));
    Signature[] arguments = {TypeVarSig.of("T")};
    MethodSignature nominal = MethodSignature.of(parameters, exceptions, TypeVarSig.of("T"), arguments);
    String expected = "<T:Ljava/lang/Object;>(TT;)TT;^Ljava/lang/Exception;";
    parameters.clear(); exceptions.clear(); arguments[0] = Signature.of(ConstantDescs.CD_int);
    check(nominal.signatureString().equals(expected) && nominal.equals(MethodSignature.parseFrom(expected)), "Full method factory copies every collection");
    check(MethodSignature.of(Signature.of(ConstantDescs.CD_void), Signature.of(ConstantDescs.CD_int)).signatureString().equals("(I)V"), "Simple method factory");
    MethodTypeDesc descriptor = MethodTypeDesc.of(ConstantDescs.CD_int.arrayType(), ConstantDescs.CD_String, ConstantDescs.CD_int, ConstantDescs.CD_Object.arrayType());
    MethodSignature erased = MethodSignature.of(descriptor);
    check(erased.signatureString().equals(descriptor.descriptorString()) && erased.typeParameters().isEmpty() && erased.throwableSignatures().isEmpty(),
      "Nominal method descriptor becomes a real reifiable signature tree");
    expect(UnsupportedOperationException.class, () -> nominal.typeParameters().clear());
    expect(UnsupportedOperationException.class, () -> nominal.throwableSignatures().clear());
    expect(UnsupportedOperationException.class, () -> nominal.arguments().clear());
    expect(UnsupportedOperationException.class, () -> erased.typeParameters().clear());
    expect(UnsupportedOperationException.class, () -> erased.throwableSignatures().clear());
    expect(UnsupportedOperationException.class, () -> MethodSignature.parseFrom("()V").typeParameters().clear());
    expect(UnsupportedOperationException.class, () -> MethodSignature.parseFrom("()V").arguments().clear());
    expect(UnsupportedOperationException.class, () -> MethodSignature.parseFrom("()V").throwableSignatures().clear());
    expect(NullPointerException.class, () -> MethodSignature.of((MethodTypeDesc) null));
    expect(NullPointerException.class, () -> MethodSignature.of((Signature) null));
    expect(NullPointerException.class, () -> MethodSignature.of(Signature.of(ConstantDescs.CD_void), (Signature[]) null));
    expect(NullPointerException.class, () -> MethodSignature.of(Signature.of(ConstantDescs.CD_void), new Signature[] {null}));
    expect(NullPointerException.class, () -> MethodSignature.of(null, Collections.emptyList(), Signature.of(ConstantDescs.CD_void)));
    expect(NullPointerException.class, () -> MethodSignature.of(Collections.emptyList(), null, Signature.of(ConstantDescs.CD_void)));
    expect(NullPointerException.class, () -> MethodSignature.of(Arrays.asList((TypeParam) null), Collections.emptyList(), Signature.of(ConstantDescs.CD_void)));
    expect(NullPointerException.class, () -> MethodSignature.of(Collections.emptyList(), Arrays.asList((ThrowableSig) null), Signature.of(ConstantDescs.CD_void)));
    expect(NullPointerException.class, () -> MethodSignature.parseFrom(null));
    for (String invalid : Arrays.asList("", "V", "()", "(", "(I", "(I)", "()VI", "()V^I", "()V^[I", "()V^", "()V^T;",
      "()V^^Ljava/lang/Exception;", "<>();", "<T:>()V", "Ljava/lang/Object;", "(X)V"))
      expect(IllegalArgumentException.class, () -> MethodSignature.parseFrom(invalid));
  }

  private static void attributes() {
    ClassSignature classSignature = ClassSignature.parseFrom("<T:Ljava/lang/Object;>Ljava/lang/Object;");
    MethodSignature methodSignature = MethodSignature.parseFrom("<T:Ljava/lang/Object;>(TT;)TT;^Ljava/lang/Exception;");
    Signature fieldSignature = Signature.parseFrom("[Ljava/util/List<+TT;>;");
    SignatureAttribute clazz = SignatureAttribute.of(classSignature), method = SignatureAttribute.of(methodSignature), field = SignatureAttribute.of(fieldSignature);
    check(clazz.asClassSignature().equals(classSignature) && method.asMethodSignature().equals(methodSignature) && field.asTypeSignature().equals(fieldSignature),
      "All three nominal attribute factories expose typed trees");
    check(clazz.signature().index() == -1 && method.signature().index() == -1 && field.signature().index() == -1 &&
      clazz.signature().constantPool() == method.signature().constantPool() && clazz.signature().constantPool() == field.signature().constantPool(),
      "Nominal attributes have genuine temporary UTF ownership");
    check(SignatureAttribute.of(classSignature).signature() != clazz.signature(), "Nominal signature UTF values are distinct, not false regular-pool interned entries");
    Utf8Entry raw = ConstantPoolBuilder.of().utf8Entry("Ljava/lang/String;");
    SignatureAttribute direct = SignatureAttribute.of(raw);
    check(direct.signature() == raw && direct.asTypeSignature().equals(Signature.of(ConstantDescs.CD_String)), "Raw attribute factory preserves exact entry identity");
    expect(IllegalArgumentException.class, () -> clazz.asMethodSignature());
    expect(IllegalArgumentException.class, () -> clazz.asTypeSignature());
    expect(IllegalArgumentException.class, () -> method.asClassSignature());
    expect(IllegalArgumentException.class, () -> field.asClassSignature());
    expect(IllegalArgumentException.class, () -> field.asMethodSignature());
    SignatureAttribute malformed = SignatureAttribute.of(ConstantPoolBuilder.of().utf8Entry("not-a-signature"));
    expect(IllegalArgumentException.class, () -> malformed.asClassSignature());
    expect(IllegalArgumentException.class, () -> malformed.asMethodSignature());
    expect(IllegalArgumentException.class, () -> malformed.asTypeSignature());
    expect(NullPointerException.class, () -> SignatureAttribute.of((ClassSignature) null));
    expect(NullPointerException.class, () -> SignatureAttribute.of((MethodSignature) null));
    expect(NullPointerException.class, () -> SignatureAttribute.of((Signature) null));
    expect(NullPointerException.class, () -> SignatureAttribute.of((Utf8Entry) null));
  }

  private static void encodedModels() {
    ClassSignature classSignature = ClassSignature.parseFrom("<T:Ljava/lang/Object;>Ljava/lang/Object;");
    MethodSignature methodSignature = MethodSignature.parseFrom("<U:Ljava/lang/Object;>(TU;)TU;^Ljava/lang/Exception;");
    Signature fieldSignature = Signature.parseFrom("Ljava/util/List<+TT;>;");
    ClassDesc list = ClassDesc.of("java.util.List");
    ClassFile classFile = ClassFile.of();
    byte[] bytes = classFile.build(ClassDesc.of("classes.modern_test.SignatureTreeOutput"), builder -> {
      builder.with(SignatureAttribute.of(classSignature));
      builder.withField("items", list, field -> field.withFlags(ClassFile.ACC_PUBLIC).with(SignatureAttribute.of(fieldSignature)));
      builder.withMethod("identity", MethodTypeDesc.of(ConstantDescs.CD_Object, ConstantDescs.CD_Object), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        method -> method.with(SignatureAttribute.of(methodSignature)).withCode(code -> code.aload(0).areturn()));
    });
    check(classFile.verify(bytes).isEmpty(), "Actual class/field/method signature output verifies");
    ClassModel model = classFile.parse(bytes);
    SignatureAttribute clazz = model.findAttribute(Attributes.signature()).get();
    SignatureAttribute field = model.fields().get(0).findAttribute(Attributes.signature()).get();
    SignatureAttribute method = model.methods().get(0).findAttribute(Attributes.signature()).get();
    check(clazz.asClassSignature().equals(classSignature) && field.asTypeSignature().equals(fieldSignature) && method.asMethodSignature().equals(methodSignature),
      "Bound models retain the complete typed signature information");
    for (SignatureAttribute attribute : Arrays.asList(clazz, field, method))
      check(attribute.signature().index() > 0 && attribute.signature().constantPool() == model.constantPool(), "Encoded signatures have real indexed output ownership");
    byte[] rewritten = ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL).transformClass(model, ClassTransform.ACCEPT_ALL);
    ClassModel rebuilt = classFile.parse(rewritten);
    check(rebuilt.findAttribute(Attributes.signature()).get().asClassSignature().equals(classSignature) &&
      rebuilt.methods().get(0).findAttribute(Attributes.signature()).get().asMethodSignature().equals(methodSignature) &&
      rebuilt.fields().get(0).findAttribute(Attributes.signature()).get().asTypeSignature().equals(fieldSignature),
      "NEW_POOL imports typed class/field/method attributes without raw-index shortcuts");
  }

  public static void main(String[] arguments) {
    parameters(); classes(); methods(); attributes(); encodedModels();
    System.out.println("CLASSFILE_SIGNATURE_TREE_REGRESSION_OK|" + checks);
  }
}
