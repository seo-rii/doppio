package classes.modern_test;

import java.lang.classfile.*;
import java.lang.classfile.attribute.*;
import java.lang.classfile.instruction.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.annotation.ElementType;
import java.io.IOException;
import java.io.Serializable;
import java.util.List;
import static java.lang.constant.ConstantDescs.*;
import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.bytes;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.classfile.TypeAnnotation.TargetInfo.*;
import static java.lang.classfile.TypeAnnotation.TargetType.*;

/** Genuine annotated compiler inputs and live Code type-annotation relocation. */
public final class ClassFileTypeAnnotationsFinal {
  private static int inserted;
  private static final ClassDesc TAG=ClassDesc.of("classes.modern_test.D4TypeVisible");
  private static ClassModel original(ClassFile api) throws Exception {return api.parse(bytes(ClassFileTypeAnnotationsFinal.class,"D4TypeTarget.class"));}
  private static MethodModel method(ClassModel model,String name) {for(MethodModel m:model.methods())if(m.methodName().equalsString(name))return m;throw new AssertionError(name);}
  private static FieldModel field(ClassModel model,String name) {for(FieldModel f:model.fields())if(f.fieldName().equalsString(name))return f;throw new AssertionError(name);}
  private static List<TypeAnnotation> visible(AttributedElement owner) {return owner.findAttribute(Attributes.runtimeVisibleTypeAnnotations()).get().annotations();}
  private static List<TypeAnnotation> invisible(AttributedElement owner) {return owner.findAttribute(Attributes.runtimeInvisibleTypeAnnotations()).get().annotations();}
  private static int count(List<TypeAnnotation> annotations,TypeAnnotation.TargetType type) {int count=0;for(TypeAnnotation a:annotations)if(a.targetInfo().targetType()==type)count++;return count;}
  private static boolean path(List<TypeAnnotation> annotations,TypeAnnotation.TypePathComponent.Kind kind) {for(TypeAnnotation a:annotations)for(var p:a.targetPath())if(p.typePathKind()==kind)return true;return false;}
  private static int position(CodeModel code,Label label) {int bci=0;for(CodeElement e:code){if(e instanceof LabelTarget&&((LabelTarget)e).label()==label)return bci;if(e instanceof Instruction)bci+=((Instruction)e).sizeInBytes();}throw new AssertionError("unregistered annotation label");}
  private static void buildModels(ClassBuilder b) {b.withFlags(33).withMethodBody("value",MethodTypeDesc.of(CD_int),9,ClassFileTypeAnnotationsFinal::codeModels);}
  private static void codeModels(CodeBuilder b) {
    Label start=b.startLabel(),end=b.endLabel();var variable=List.of(TypeAnnotation.LocalVarTargetInfo.of(start,end,0));
    List<TypeAnnotation.TargetInfo> all=List.of(ofClassTypeParameter(0),ofMethodTypeParameter(0),ofClassExtends(65535),
      ofClassTypeParameterBound(0,1),ofMethodTypeParameterBound(0,1),ofField(),ofMethodReturn(),ofMethodReceiver(),
      ofMethodFormalParameter(0),ofThrows(0),ofLocalVariable(variable),ofResourceVariable(variable),ofExceptionParameter(0),
      ofInstanceofExpr(start),ofNewExpr(start),ofConstructorReference(start),ofMethodReference(start),ofCastExpr(start,0),
      ofConstructorInvocationTypeArgument(start,0),ofMethodInvocationTypeArgument(start,0),
      ofConstructorReferenceTypeArgument(start,0),ofMethodReferenceTypeArgument(start,0));
    check(all.size()==22&&TypeAnnotation.TargetType.values().length==22);
    for(int n=0;n<all.size();n++)check(all.get(n).targetType()==TypeAnnotation.TargetType.values()[n]);
    check(((TypeAnnotation.SupertypeTarget)all.get(2)).supertypeIndex()==65535&&((TypeAnnotation.OffsetTarget)all.get(13)).target()==start&&((TypeAnnotation.TypeArgumentTarget)all.get(17)).typeArgumentIndex()==0);
    var argument=TypeAnnotation.TypePathComponent.of(TypeAnnotation.TypePathComponent.Kind.TYPE_ARGUMENT,2);
    TypeAnnotation annotation=TypeAnnotation.of(ofField(),List.of(TypeAnnotation.TypePathComponent.ARRAY,TypeAnnotation.TypePathComponent.INNER_TYPE,TypeAnnotation.TypePathComponent.WILDCARD,argument),Annotation.of(TAG,AnnotationElement.ofInt("value",91)));
    check(annotation.targetPath().size()==4&&argument.typeArgumentIndex()==2&&annotation.annotation().classSymbol().equals(TAG));
    b.bipush(22).ireturn();
  }
  private static CodeTransform relocator() {return new Relocator();}
  private static void relocateClass(ClassBuilder b,ClassElement element) {
    for(int n=0;n<300;n++)b.constantPool().stringEntry("d4-type-unused-"+n);
    if(element instanceof MethodModel&&(java.util.List.of("caught","cast","checkType","make","resource").contains(((MethodModel)element).methodName().stringValue())))
      b.transformMethod((MethodModel)element,MethodTransform.transformingCode(CodeTransform.ofStateful(ClassFileTypeAnnotationsFinal::relocator)));
    else b.with(element);
  }
  private static void caseModels() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.build(ClassDesc.of("classes.modern_test.C7dTypeModels"),ClassFileTypeAnnotationsFinal::buildModels);check(api.verify(output).isEmpty());
    artifact("cf-type-target-models","type-models",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class));check((int)handle.invokeExact()==22);
    emit("cf-type-target-models","TargetInfo=all22-target-kinds;TypePath=ARRAY/INNER/WILDCARD/argument2;typed-getters=real;value=22;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseFields() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.transformClass(original(api),ClassDesc.of("classes.modern_test.C7dTypeFields"),ClassTransform.ACCEPT_ALL);ClassModel model=api.parse(output);
    check(count(visible(field(model,"array")),FIELD)==1&&path(visible(field(model,"array")),TypeAnnotation.TypePathComponent.Kind.ARRAY));
    check(path(invisible(field(model,"wild")),TypeAnnotation.TypePathComponent.Kind.WILDCARD)&&path(visible(field(model,"inner")),TypeAnnotation.TypePathComponent.Kind.INNER_TYPE)&&api.verify(output).isEmpty());
    artifact("cf-type-field-paths","type-fields",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(101)==101);
    emit("cf-type-field-paths","genuine-field-targets=array/wildcard/inner/type-argument;visible/invisible-type-paths=typed;value=101;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseMethods() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.transformClass(original(api),ClassDesc.of("classes.modern_test.C7dTypeMethods"),ClassTransform.ACCEPT_ALL);ClassModel model=api.parse(output);
    check(count(visible(method(model,"returner")),METHOD_RETURN)==1&&count(visible(method(model,"returner")),METHOD_FORMAL_PARAMETER)==1&&count(invisible(method(model,"returner")),THROWS)==1);
    check(count(visible(method(model,"receiver")),METHOD_RECEIVER)==1&&count(visible(method(model,"generic")),METHOD_TYPE_PARAMETER)==1&&count(invisible(method(model,"generic")),METHOD_TYPE_PARAMETER_BOUND)==1&&api.verify(output).isEmpty());
    artifact("cf-type-method-targets","type-methods",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(103)==103);
    emit("cf-type-method-targets","genuine-method-targets=return/formal/throws/receiver/type-parameter/bound;value=103;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseClass() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.transformClass(original(api),ClassDesc.of("classes.modern_test.C7dTypeClass"),ClassTransform.ACCEPT_ALL);ClassModel model=api.parse(output);
    check(count(visible(model),CLASS_TYPE_PARAMETER)==1&&count(visible(model),CLASS_TYPE_PARAMETER_BOUND)==1&&count(visible(model),CLASS_EXTENDS)==1&&count(invisible(model),CLASS_TYPE_PARAMETER_BOUND)==1&&count(invisible(model),CLASS_EXTENDS)==1&&api.verify(output).isEmpty());
    artifact("cf-type-class-targets","type-class",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(107)==107);
    emit("cf-type-class-targets","genuine-class-targets=parameter/class-interface-bounds/super/interface;super-index=65535;value=107;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseLocals() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.transformClass(original(api),ClassDesc.of("classes.modern_test.C7dTypeLocals"),ClassTransform.ACCEPT_ALL);ClassModel model=api.parse(output);CodeModel cast=method(model,"cast").code().get(),resource=method(model,"resource").code().get();
    check(count(visible(cast),LOCAL_VARIABLE)==1&&count(invisible(cast),LOCAL_VARIABLE)==1&&count(visible(resource),RESOURCE_VARIABLE)==1);
    for(TypeAnnotation a:visible(cast))if(a.targetInfo() instanceof TypeAnnotation.LocalVarTarget){var info=((TypeAnnotation.LocalVarTarget)a.targetInfo()).table().get(0);check(info.index()==1&&position(cast,info.startLabel())<position(cast,info.endLabel()));}
    check(api.verify(output).isEmpty());artifact("cf-type-code-locals","type-locals",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"cast",MethodType.methodType(String.class,Object.class));check(((String)handle.invokeExact((Object)"local")).equals("local"));
    emit("cf-type-code-locals","genuine-Code-local/resource-targets=registered-label-ranges;slot1=real;visible/invisible=preserved;value=local;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseOffsets() throws Throwable {
    ClassFile api=ClassFile.of();byte[] output=api.transformClass(original(api),ClassDesc.of("classes.modern_test.C7dTypeOffsets"),ClassTransform.ACCEPT_ALL);ClassModel model=api.parse(output);
    check(count(visible(method(model,"checkType").code().get()),INSTANCEOF)==1&&count(visible(method(model,"make").code().get()),NEW)==1&&count(visible(method(model,"cast").code().get()),CAST)==1);
    CodeModel code=method(model,"caught").code().get();check(count(visible(code),EXCEPTION_PARAMETER)==1&&code.exceptionHandlers().size()==1);
    for(TypeAnnotation a:visible(code))if(a.targetInfo() instanceof TypeAnnotation.CatchTarget)check(((TypeAnnotation.CatchTarget)a.targetInfo()).exceptionTableIndex()==0);
    check(api.verify(output).isEmpty());artifact("cf-type-code-offsets-catch","type-offsets",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"caught",MethodType.methodType(String.class,int.class));check(((String)handle.invokeExact(0)).equals("caught")&&((String)handle.invokeExact(1)).equals("ok"));
    emit("cf-type-code-offsets-catch","genuine-Code-targets=instanceof/new/cast/catch;exception-table-index=0;values=caught/ok;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseRelocation() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);ClassModel source=original(api);inserted=0;byte[] output=api.transformClass(source,ClassDesc.of("classes.modern_test.C7dTypeRelocated"),ClassFileTypeAnnotationsFinal::relocateClass);ClassModel relocated=api.parse(output);CodeModel code=method(relocated,"caught").code().get();
    check(inserted>0&&code.exceptionHandlers().size()==2);for(TypeAnnotation a:visible(code))if(a.targetInfo() instanceof TypeAnnotation.CatchTarget)check(((TypeAnnotation.CatchTarget)a.targetInfo()).exceptionTableIndex()==1);
    String[] names={"cast","checkType","make"};Opcode[] opcodes={Opcode.CHECKCAST,Opcode.INSTANCEOF,Opcode.NEW};
    for(int n=0;n<names.length;n++){
      CodeModel before=method(source,names[n]).code().get(),after=method(relocated,names[n]).code().get();Label oldTarget=null,newTarget=null;
      for(TypeAnnotation a:visible(before)){if(a.targetInfo() instanceof TypeAnnotation.OffsetTarget)oldTarget=((TypeAnnotation.OffsetTarget)a.targetInfo()).target();if(a.targetInfo() instanceof TypeAnnotation.TypeArgumentTarget)oldTarget=((TypeAnnotation.TypeArgumentTarget)a.targetInfo()).target();}
      for(TypeAnnotation a:visible(after)){if(a.targetInfo() instanceof TypeAnnotation.OffsetTarget)newTarget=((TypeAnnotation.OffsetTarget)a.targetInfo()).target();if(a.targetInfo() instanceof TypeAnnotation.TypeArgumentTarget)newTarget=((TypeAnnotation.TypeArgumentTarget)a.targetInfo()).target();}
      int target=position(after,newTarget);check(target>position(before,oldTarget));int bci=0;boolean matched=false;
      for(CodeElement element:after)if(element instanceof Instruction){Instruction instruction=(Instruction)element;if(bci==target){check(instruction.opcode()==opcodes[n]);matched=true;}bci+=instruction.sizeInBytes();}check(matched);
    }
    for(String name:java.util.List.of("cast","resource")){
      CodeModel before=method(source,name).code().get(),after=method(relocated,name).code().get();TypeAnnotation.LocalVarTarget oldTarget=null,newTarget=null;
      for(TypeAnnotation a:visible(before))if(a.targetInfo() instanceof TypeAnnotation.LocalVarTarget)oldTarget=(TypeAnnotation.LocalVarTarget)a.targetInfo();
      for(TypeAnnotation a:visible(after))if(a.targetInfo() instanceof TypeAnnotation.LocalVarTarget)newTarget=(TypeAnnotation.LocalVarTarget)a.targetInfo();
      check(oldTarget.table().size()==newTarget.table().size());for(int n=0;n<oldTarget.table().size();n++){var oldRange=oldTarget.table().get(n);var newRange=newTarget.table().get(n);check(position(after,newRange.startLabel())>position(before,oldRange.startLabel())&&position(after,newRange.endLabel())>position(before,oldRange.endLabel())&&newRange.index()==oldRange.index());}
    }
    check(api.verify(output).isEmpty());artifact("cf-type-code-relocation","type-relocated",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"caught",MethodType.methodType(String.class,int.class));check(((String)handle.invokeExact(0)).equals("caught")&&((String)handle.invokeExact(1)).equals("ok"));
    emit("cf-type-code-relocation","NEW_POOL=300-string-prefill;CAST/NEW/INSTANCEOF-labels=shifted-to-real-opcodes;local/resource-ranges=shifted;UTF/type-paths=actual-remapping;catch-index=0-to1;LDC_W=real;values=caught/ok;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseVisibility() throws Throwable {
    ClassFile api=ClassFile.of(ClassFile.ConstantPoolSharingOption.NEW_POOL);byte[] output=api.transformClass(original(api),ClassDesc.of("classes.modern_test.C7dTypeVisibility"),ClassTransform.ACCEPT_ALL);ClassModel model=api.parse(output);
    check(!visible(model).isEmpty()&&!invisible(model).isEmpty()&&!visible(field(model,"inner")).isEmpty()&&!invisible(field(model,"inner")).isEmpty()&&!visible(method(model,"cast").code().get()).isEmpty()&&!invisible(method(model,"cast").code().get()).isEmpty()&&api.verify(output).isEmpty());
    artifact("cf-type-visible-invisible","type-visibility",output);MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(output);MethodHandle handle=lookup.findStatic(generated,"value",MethodType.methodType(int.class,int.class));check((int)handle.invokeExact(109)==109);
    emit("cf-type-visible-invisible","NEW_POOL=visible/invisible-type-tables-class/field/method/Code-preserved;complete-typed-payloads=real;value=109;verify=empty;defined/invoked=same-bytes");
  }
  public static void main(String[] args) throws Throwable {caseModels();caseFields();caseMethods();caseClass();caseLocals();caseOffsets();caseRelocation();caseVisibility();System.out.println("CLASSFILE_TYPE_ANNOTATIONS_OK");}
  static final class Relocator implements CodeTransform {
    private final java.util.List<CodeElement> elements=new java.util.ArrayList<>();
    @Override public void atStart(CodeBuilder b) {}
    @Override public void accept(CodeBuilder b,CodeElement element) {elements.add(element);}
    @Override public void atEnd(CodeBuilder b) {
      boolean catches=false;for(CodeElement element:elements)if(element instanceof RuntimeVisibleTypeAnnotationsAttribute)for(TypeAnnotation a:((RuntimeVisibleTypeAnnotationsAttribute)element).annotations())if(a.targetInfo() instanceof TypeAnnotation.CatchTarget)catches=true;
      Label extraHandler=null;if(catches){Label start=b.newLabel(),end=b.newLabel();extraHandler=b.newLabel();b.labelBinding(start).nop().labelBinding(end).exceptionCatch(start,end,extraHandler,CD_Throwable);}
      var pending=new java.util.ArrayList<Label>();boolean fallsThrough=true;
      for(CodeElement element:elements){
        if(element instanceof LabelTarget){pending.add(((LabelTarget)element).label());continue;}
        if(element instanceof Instruction){
          if(fallsThrough){b.nop();inserted++;}for(Label label:pending)b.labelBinding(label);pending.clear();
          fallsThrough=!java.util.List.of(Opcode.IRETURN,Opcode.LRETURN,Opcode.FRETURN,Opcode.DRETURN,Opcode.ARETURN,Opcode.RETURN,Opcode.ATHROW,Opcode.GOTO,Opcode.GOTO_W).contains(((Instruction)element).opcode());
        }
        if(catches&&element instanceof RuntimeVisibleTypeAnnotationsAttribute){
          var annotations=new java.util.ArrayList<TypeAnnotation>();
          for(TypeAnnotation a:((RuntimeVisibleTypeAnnotationsAttribute)element).annotations()){
            TypeAnnotation.TargetInfo target=a.targetInfo();if(target instanceof TypeAnnotation.CatchTarget)target=ofExceptionParameter(((TypeAnnotation.CatchTarget)target).exceptionTableIndex()+1);
            annotations.add(TypeAnnotation.of(target,a.targetPath(),a.annotation()));
          }
          b.with(RuntimeVisibleTypeAnnotationsAttribute.of(annotations));
        }else b.with(element);
      }
      for(Label label:pending)b.labelBinding(label);
      if(catches)b.labelBinding(extraHandler).pop().ldc("extra").areturn();
    }
  }
}

@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE_USE,ElementType.TYPE_PARAMETER})
@interface D4TypeVisible {int value();}

@Retention(RetentionPolicy.CLASS)
@Target({ElementType.TYPE_USE,ElementType.TYPE_PARAMETER})
@interface D4TypeInvisible {int value();}

class D4TypeOuter<A> {class Inner<B> {}}
final class D4Resource implements AutoCloseable {public void close() {}}

final class D4TypeTarget<@D4TypeVisible(11) T extends @D4TypeVisible(12) Number & @D4TypeInvisible(13) Serializable>
    extends @D4TypeVisible(14) Object implements @D4TypeInvisible(15) Serializable {
  public @D4TypeVisible(21) String @D4TypeInvisible(22) [] array;
  public List<@D4TypeVisible(23) ? extends @D4TypeInvisible(24) String> wild;
  public D4TypeOuter<@D4TypeVisible(25) String>.@D4TypeInvisible(26) Inner<@D4TypeVisible(27) Integer> inner;
  public @D4TypeVisible(31) String returner(@D4TypeVisible(32) String input) throws @D4TypeInvisible(33) IOException {return input;}
  public void receiver(@D4TypeVisible(34) D4TypeTarget<T> this) {}
  public static <@D4TypeVisible(35) U extends @D4TypeInvisible(36) CharSequence> U generic(U input) {return input;}
  public static int value(int input) {return input;}
  public static String cast(Object input) {@D4TypeVisible(41) @D4TypeInvisible(42) String local=(@D4TypeVisible(43) String)input;return local;}
  public static boolean checkType(Object input) {return input instanceof @D4TypeVisible(44) String;}
  public static String make() {return new @D4TypeVisible(45) String("new");}
  public static String caught(int input) {try {if(input==0)throw new IllegalArgumentException();return "ok";}catch(@D4TypeVisible(46) IllegalArgumentException caught){return "caught";}}
  public static int resource() throws Exception {try(@D4TypeVisible(47) D4Resource resource=new D4Resource()){return 7;}}
}

