package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.annotation.ElementType;
import java.util.List;
import java.util.Optional;
import static java.lang.constant.ConstantDescs.*;
import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.bytes;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;

/** Original stock Java25 signature and declaration-annotation recipes. */
public final class ClassFileDeclarationsFinal {
  private static final int PUBLIC_STATIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static final ClassDesc NUMBER=ClassDesc.of("java.lang.Number"),SERIALIZABLE=ClassDesc.of("java.io.Serializable");
  private static final ClassDesc VISIBLE=ClassDesc.of("classes.modern_test.D4DeclVisible"),INVISIBLE=ClassDesc.of("classes.modern_test.D4DeclInvisible");
  private static final String METHOD="<T:Ljava/lang/Number;:Ljava/io/Serializable;E:Ljava/lang/Exception;>(TT;I)TT;^TE;";
  private static final String CLASS="<T::Ljava/lang/CharSequence;>Ljava/lang/Object;Ljava/io/Serializable;";
  private static Signature.RefTypeSig ref(ClassDesc type) {return (Signature.RefTypeSig)Signature.of(type);}
  private static MethodSignature methodSignature() {
    Signature.TypeVarSig t=Signature.TypeVarSig.of("T"),e=Signature.TypeVarSig.of("E");
    return MethodSignature.of(List.of(Signature.TypeParam.of("T",ref(NUMBER),ref(SERIALIZABLE)),
      Signature.TypeParam.of("E",ref(ClassDesc.of("java.lang.Exception")))),List.of(e),t,t,Signature.of(CD_int));
  }
  private static ClassSignature classSignature() {
    return ClassSignature.of(List.of(Signature.TypeParam.of("T",Optional.empty(),ref(ClassDesc.of("java.lang.CharSequence")))),
      (Signature.ClassTypeSig)Signature.of(CD_Object),(Signature.ClassTypeSig)Signature.of(SERIALIZABLE));
  }
  private static ClassModel original(ClassFile api) throws Exception {return api.parse(bytes(ClassFileDeclarationsFinal.class,"D4DeclarationTarget.class"));}
  private static MethodModel method(ClassModel model,String name) {for(MethodModel m:model.methods())if(m.methodName().equalsString(name))return m;throw new AssertionError(name);}
  private static FieldModel field(ClassModel model,String name) {for(FieldModel f:model.fields())if(f.fieldName().equalsString(name))return f;throw new AssertionError(name);}
  private static void copy(ClassBuilder b,ClassElement element) {b.with(element);}
  private static void flags(ClassBuilder b) {b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);}
  private static void codeReference(CodeBuilder b) {b.aload(0).areturn();}
  private static void codeThirteen(CodeBuilder b) {b.bipush(13).ireturn();}
  private static void codeFive(CodeBuilder b) {b.iconst_5().ireturn();}
  private static void codeInput(CodeBuilder b) {b.iload(0).ireturn();}
  private static void buildMethod(ClassBuilder b) {flags(b);b.withMethod("value",MethodTypeDesc.of(NUMBER,NUMBER,CD_int),PUBLIC_STATIC,ClassFileDeclarationsFinal::methodGeneric);}
  private static void methodGeneric(MethodBuilder b) {b.with(SignatureAttribute.of(methodSignature())).withCode(ClassFileDeclarationsFinal::codeReference);}
  private static void buildClass(ClassBuilder b) {flags(b);b.withInterfaceSymbols(SERIALIZABLE).with(SignatureAttribute.of(classSignature())).withMethodBody("value",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileDeclarationsFinal::codeThirteen);}
  private static Annotation allValues() {
    return Annotation.of(ClassDesc.of("classes.modern_test.D4AllValues"),
      AnnotationElement.ofByte("b",(byte)-7),AnnotationElement.ofChar("c",'Z'),AnnotationElement.ofDouble("d",2.5),
      AnnotationElement.ofFloat("f",1.25f),AnnotationElement.ofInt("i",42),AnnotationElement.ofLong("j",1234567890123L),
      AnnotationElement.ofShort("s",(short)1234),AnnotationElement.ofBoolean("z",true),AnnotationElement.ofString("text","values"),
      AnnotationElement.ofClass("type",CD_String),AnnotationElement.of("kind",AnnotationValue.ofEnum(ClassDesc.of("java.lang.annotation.RetentionPolicy"),"RUNTIME")),
      AnnotationElement.ofAnnotation("nested",Annotation.of(ClassDesc.of("classes.modern_test.D4Nested"),AnnotationElement.ofInt("value",9))),
      AnnotationElement.ofArray("numbers",AnnotationValue.ofInt(2),AnnotationValue.ofInt(3)));
  }
  private static void buildValues(ClassBuilder b) {flags(b);b.with(RuntimeVisibleAnnotationsAttribute.of(allValues())).withMethodBody("value",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileDeclarationsFinal::codeFive);}
  private static Annotation visible(int value) {return Annotation.of(VISIBLE,AnnotationElement.ofInt("value",value),AnnotationElement.ofString("name","parameter"));}
  private static Annotation invisible(int value) {return Annotation.of(INVISIBLE,AnnotationElement.ofInt("value",value));}
  private static void buildParameters(ClassBuilder b) {flags(b);b.withMethod("value",MethodTypeDesc.of(CD_int,CD_int,CD_String),PUBLIC_STATIC,ClassFileDeclarationsFinal::methodParameters);}
  private static void methodParameters(MethodBuilder b) {
    b.with(RuntimeVisibleParameterAnnotationsAttribute.of(List.of(List.of(visible(61)),List.of())))
      .with(RuntimeInvisibleParameterAnnotationsAttribute.of(List.of(List.of(),List.of(invisible(62)))))
      .withCode(ClassFileDeclarationsFinal::codeInput);
  }
  private static void buildDefaults(ClassBuilder b) {
    b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_INTERFACE|ClassFile.ACC_ABSTRACT|ClassFile.ACC_ANNOTATION).withInterfaceSymbols(ClassDesc.of("java.lang.annotation.Annotation"));
    b.withMethod("amount",MethodTypeDesc.of(CD_int),ClassFile.ACC_PUBLIC|ClassFile.ACC_ABSTRACT,ClassFileDeclarationsFinal::defaultInt);
    b.withMethod("text",MethodTypeDesc.of(CD_String),ClassFile.ACC_PUBLIC|ClassFile.ACC_ABSTRACT,ClassFileDeclarationsFinal::defaultString);
    b.withMethod("numbers",MethodTypeDesc.of(CD_int.arrayType()),ClassFile.ACC_PUBLIC|ClassFile.ACC_ABSTRACT,ClassFileDeclarationsFinal::defaultArray);
  }
  private static void defaultInt(MethodBuilder b) {b.with(AnnotationDefaultAttribute.of(AnnotationValue.ofInt(17)));}
  private static void defaultString(MethodBuilder b) {b.with(AnnotationDefaultAttribute.of(AnnotationValue.ofString("fallback")));}
  private static void defaultArray(MethodBuilder b) {b.with(AnnotationDefaultAttribute.of(AnnotationValue.ofArray(AnnotationValue.ofInt(2),AnnotationValue.ofInt(3))));}
  private static void buildNames(ClassBuilder b) {flags(b);b.withMethod("value",MethodTypeDesc.of(CD_int,CD_int,CD_long),PUBLIC_STATIC,ClassFileDeclarationsFinal::optionalNames);}
  private static void optionalNames(MethodBuilder b) {
    b.with(MethodParametersAttribute.of(MethodParameterInfo.ofParameter(Optional.of("input"),ClassFile.ACC_FINAL),
      MethodParameterInfo.ofParameter(Optional.empty(),0))).withCode(ClassFileDeclarationsFinal::codeInput);
  }
  private static void caseMethod() throws Throwable {
    MethodSignature built=methodSignature(),parsed=MethodSignature.parseFrom(METHOD);
    check(built.signatureString().equals(METHOD)&&parsed.signatureString().equals(METHOD)&&parsed.typeParameters().size()==2&&parsed.arguments().size()==2&&parsed.throwableSignatures().size()==1);
    check(parsed.typeParameters().get(0).interfaceBounds().size()==1&&((Signature.TypeVarSig)parsed.result()).identifier().equals("T"));
    check(MethodSignature.of(MethodTypeDesc.of(CD_int,CD_int)).signatureString().equals("(I)I")&&MethodSignature.of(Signature.of(CD_int),Signature.of(CD_int)).signatureString().equals("(I)I"));
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7dMethodSignature"),ClassFileDeclarationsFinal::buildMethod);
    check(method(api.parse(output),"value").findAttribute(Attributes.signature()).get().asMethodSignature().signatureString().equals(METHOD)&&api.verify(output).isEmpty());
    artifact("cf-decl-method-signature","decl-method-signature",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(Number.class,Number.class,int.class));Number held=Integer.valueOf(7);check((Number)handle.invokeExact(held,1)==held);
    emit("cf-decl-method-signature","MethodSignature=factory/parse/full-tree;typeParameters=T/E;arguments=T/I;throws=E;SignatureAttribute=typed;value=held-Number;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseClass() throws Throwable {
    ClassSignature built=classSignature(),parsed=ClassSignature.parseFrom(CLASS);
    check(built.signatureString().equals(CLASS)&&parsed.signatureString().equals(CLASS)&&parsed.typeParameters().get(0).classBound().isEmpty()&&parsed.typeParameters().get(0).interfaceBounds().size()==1&&parsed.superinterfaceSignatures().size()==1);
    check(ClassSignature.of((Signature.ClassTypeSig)Signature.of(CD_Object)).signatureString().equals("Ljava/lang/Object;"));
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7dClassSignature"),ClassFileDeclarationsFinal::buildClass);
    check(api.parse(output).findAttribute(Attributes.signature()).get().asClassSignature().signatureString().equals(CLASS)&&api.verify(output).isEmpty());
    artifact("cf-decl-class-signature","decl-class-signature",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==13);
    emit("cf-decl-class-signature","ClassSignature=factory/parse/full-tree;interface-only-bound=CharSequence;super=Object/Serializable;value=13;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseAttributes() throws Exception {
    ClassFile api=ClassFile.of();ClassModel model=original(api);
    ClassSignature cls=model.findAttribute(Attributes.signature()).get().asClassSignature();
    MethodSignature method=method(model,"echo").findAttribute(Attributes.signature()).get().asMethodSignature();
    Signature type=field(model,"names").findAttribute(Attributes.signature()).get().asTypeSignature();
    check(cls.typeParameters().size()==1&&cls.typeParameters().get(0).interfaceBounds().size()==1&&method.typeParameters().size()==2&&method.throwableSignatures().size()==1);
    check(type instanceof Signature.ClassTypeSig&&((Signature.ClassTypeSig)type).typeArgs().size()==1&&api.verify(model).isEmpty());
    check(SignatureAttribute.of(Signature.of(CD_int)).asTypeSignature().signatureString().equals("I"));
    emit("cf-decl-signature-attributes","original-javac25=-g/-parameters/unchanged;SignatureAttribute=class/method/type-dispatch;trees=T/UE/List<String>;verify(model)=empty;generated-bytes=none");
  }
  private static void caseValues() throws Throwable {
    Annotation value=allValues();check(value.elements().size()==13&&value.classSymbol().equals(ClassDesc.of("classes.modern_test.D4AllValues")));
    String tags="";for(AnnotationElement element:value.elements())tags+=(char)element.value().tag();check(tags.equals("BCDFIJSZsce@["));
    check(((AnnotationValue.OfEnum)value.elements().get(10).value()).constantName().equalsString("RUNTIME"));
    check(((AnnotationValue.OfClass)value.elements().get(9).value()).classSymbol().equals(CD_String));
    check(((AnnotationValue.OfArray)value.elements().get(12).value()).values().size()==2&&AnnotationValue.of("auto").tag()==AnnotationValue.TAG_STRING);
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7dAnnotationValues"),ClassFileDeclarationsFinal::buildValues);
    check(api.parse(output).findAttribute(Attributes.runtimeVisibleAnnotations()).get().annotations().get(0).elements().size()==13&&api.verify(output).isEmpty());
    artifact("cf-decl-annotation-values","decl-annotation-values",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==5);
    emit("cf-decl-annotation-values","AnnotationValue=13-tags;enum/class/nested/array=typed;UTF/CP=actual;value=5;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseVisible() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.transformClass(original(api),ClassDesc.of("classes.modern_test.C7dDeclarationVisible"),ClassTransform.ACCEPT_ALL);
    ClassModel parsed=api.parse(output);check(parsed.findAttribute(Attributes.runtimeVisibleAnnotations()).get().annotations().size()==1);
    check(field(parsed,"number").findAttribute(Attributes.runtimeVisibleAnnotations()).get().annotations().get(0).elements().get(0).value().tag()==AnnotationValue.TAG_INT);
    check(method(parsed,"value").findAttribute(Attributes.runtimeVisibleAnnotations()).get().annotations().size()==1&&api.verify(output).isEmpty());
    artifact("cf-decl-visible-annotations","decl-visible",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class,String.class));check((int)handle.invokeExact(71,"visible")==71);
    emit("cf-decl-visible-annotations","genuine-class/field/method-visible-annotations=typed-preserved;value=71;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseInvisible() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);byte[] output=api.transformClass(original(api),ClassDesc.of("classes.modern_test.C7dDeclarationInvisible"),ClassFileDeclarationsFinal::copy);
    ClassModel parsed=api.parse(output);check(parsed.findAttribute(Attributes.runtimeInvisibleAnnotations()).get().annotations().get(0).classSymbol().equals(INVISIBLE));
    check(field(parsed,"number").findAttribute(Attributes.runtimeInvisibleAnnotations()).get().annotations().size()==1&&method(parsed,"value").findAttribute(Attributes.runtimeInvisibleAnnotations()).get().annotations().size()==1&&api.verify(output).isEmpty());
    artifact("cf-decl-invisible-newpool","decl-invisible",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class,String.class));check((int)handle.invokeExact(73,"invisible")==73);
    emit("cf-decl-invisible-newpool","NEW_POOL=actual-annotation-UTF/numeric-import;class/field/method-invisible-annotations=preserved;value=73;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseParameters() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7dParameterAnnotations"),ClassFileDeclarationsFinal::buildParameters);
    MethodModel method=method(api.parse(output),"value");var visible=method.findAttribute(Attributes.runtimeVisibleParameterAnnotations()).get().parameterAnnotations();var invisible=method.findAttribute(Attributes.runtimeInvisibleParameterAnnotations()).get().parameterAnnotations();
    check(visible.size()==2&&visible.get(0).size()==1&&visible.get(1).isEmpty()&&invisible.size()==2&&invisible.get(0).isEmpty()&&invisible.get(1).size()==1&&api.verify(output).isEmpty());
    artifact("cf-decl-parameter-annotations","decl-parameters",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class,String.class));check((int)handle.invokeExact(79,"parameters")==79);
    emit("cf-decl-parameter-annotations","visible/invisible-parameter-annotations=2-positional-lists;empty-slots=preserved;value=79;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseDefaults() throws Throwable {
    ClassFile api=ClassFile.of();byte[] defaults=api.build(ClassDesc.of("classes.modern_test.C7dDefaultAnnotation"),ClassFileDeclarationsFinal::buildDefaults);
    ClassModel annotation=api.parse(defaults);check(((AnnotationValue.OfInt)method(annotation,"amount").findAttribute(Attributes.annotationDefault()).get().defaultValue()).intValue()==17);
    check(((AnnotationValue.OfString)method(annotation,"text").findAttribute(Attributes.annotationDefault()).get().defaultValue()).stringValue().equals("fallback"));
    check(((AnnotationValue.OfArray)method(annotation,"numbers").findAttribute(Attributes.annotationDefault()).get().defaultValue()).values().size()==2&&api.verify(defaults).isEmpty());
    artifact("cf-decl-default-parameters","decl-default-interface",defaults);
    byte[] parameters=api.build(ClassDesc.of("classes.modern_test.C7dOptionalParameters"),ClassFileDeclarationsFinal::buildNames);
    var names=method(api.parse(parameters),"value").findAttribute(Attributes.methodParameters()).get().parameters();check(names.size()==2&&names.get(0).name().get().equalsString("input")&&names.get(0).flagsMask()==ClassFile.ACC_FINAL&&names.get(1).name().isEmpty()&&names.get(1).flagsMask()==0&&api.verify(parameters).isEmpty());
    artifact("cf-decl-default-parameters","decl-optional-parameters",parameters);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(parameters);
    MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class,long.class));check((int)handle.invokeExact(83,9L)==83);
    emit("cf-decl-default-parameters","AnnotationDefault=I/string/int-array;interface=metadata-only/neverdefine;MethodParameters=optional-name/final-mask;value=83;verify=empty;defined/invoked=parameter-bytes-only");
  }
  public static void main(String[] args) throws Throwable {caseMethod();caseClass();caseAttributes();caseValues();caseVisible();caseInvisible();caseParameters();caseDefaults();System.out.println("CLASSFILE_DECLARATIONS_OK");}
}

@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE,ElementType.FIELD,ElementType.METHOD,ElementType.PARAMETER})
@interface D4DeclVisible {int value();String name() default "visible";}

@Retention(RetentionPolicy.CLASS)
@Target({ElementType.TYPE,ElementType.FIELD,ElementType.METHOD,ElementType.PARAMETER})
@interface D4DeclInvisible {int value();}

@Retention(RetentionPolicy.RUNTIME)
@interface D4Nested {int value();}

@Retention(RetentionPolicy.RUNTIME)
@interface D4AllValues {
  byte b();char c();double d();float f();int i();long j();short s();boolean z();String text();
  Class<?> type();RetentionPolicy kind();D4Nested nested();int[] numbers();
}

@D4DeclVisible(value=11,name="class")
@D4DeclInvisible(12)
final class D4DeclarationTarget<T extends Number & java.io.Serializable> {
  @D4DeclVisible(value=21,name="field") @D4DeclInvisible(22)
  public static final int number=3;
  public List<String> names;
  @D4DeclVisible(value=31,name="method") @D4DeclInvisible(32)
  public static int value(@D4DeclVisible(value=41,name="first") int input,@D4DeclInvisible(42) String ignored) {return input;}
  public static <U extends CharSequence,E extends Exception> U echo(U value) throws E {return value;}
}

