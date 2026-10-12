package classes.modern_test;
import java.lang.classfile.*;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.*;

/** Original Java25 field, invoke, cast, lock and exception instruction recipes. */
public final class InstructionMembersFinal {
  private static final int PUBLIC_STATIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static final ClassDesc SEQUENCE=ClassDesc.of("java.lang.CharSequence"),API=ClassDesc.of("classes.modern_test.InstructionMemberApi"),THROWABLE=ClassDesc.of("java.lang.Throwable");
  private static ClassDesc owner;
  private static void flags(ClassBuilder b) {b.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER);}
  private static void codeConstructor(CodeBuilder b) {b.aload(0).invokespecial(CD_Object,"<init>",MethodTypeDesc.of(CD_void)).return_();}
  private static void codeMake(CodeBuilder b) {b.new_(owner).dup().invokespecial(owner,"<init>",MethodTypeDesc.of(CD_void)).areturn();}
  private static void codeFields(CodeBuilder b) {
    b.aload(0).checkcast(owner).astore(2).aload(2).iload(1).putfield(owner,"value",CD_int)
      .iload(1).putstatic(owner,"state",CD_int).aload(2).getfield(owner,"value",CD_int).getstatic(owner,"state",CD_int).iadd().ireturn();
  }
  private static void buildFields(ClassBuilder b) {flags(b);
    b.withField("value",CD_int,ClassFile.ACC_PUBLIC).withField("state",CD_int,PUBLIC_STATIC);
    b.withMethodBody("<init>",MethodTypeDesc.of(CD_void),ClassFile.ACC_PUBLIC,InstructionMembersFinal::codeConstructor);
    b.withMethodBody("make",MethodTypeDesc.of(CD_Object),PUBLIC_STATIC,InstructionMembersFinal::codeMake);
    b.withMethodBody("mutate",MethodTypeDesc.of(CD_int,CD_Object,CD_int),PUBLIC_STATIC,InstructionMembersFinal::codeFields);
  }
  private static void codeVirtual(CodeBuilder b) {b.aload(0).invokevirtual(CD_String,"length",MethodTypeDesc.of(CD_int)).ireturn();}
  private static void buildVirtual(ClassBuilder b) {flags(b);b.withMethodBody("length",MethodTypeDesc.of(CD_int,CD_String),PUBLIC_STATIC,InstructionMembersFinal::codeVirtual);}
  private static void codeInterface(CodeBuilder b) {b.aload(0).invokeinterface(SEQUENCE,"length",MethodTypeDesc.of(CD_int)).ireturn();}
  private static void buildInterface(ClassBuilder b) {flags(b);b.withMethodBody("length",MethodTypeDesc.of(CD_int,SEQUENCE),PUBLIC_STATIC,InstructionMembersFinal::codeInterface);}
  private static void codeDefault(CodeBuilder b) {b.aload(0).invokespecial(API,"defaultValue",MethodTypeDesc.of(CD_int),true).ireturn();}
  private static void codeSpecialRun(CodeBuilder b) {b.aload(0).checkcast(owner).invokevirtual(owner,"defaultCall",MethodTypeDesc.of(CD_int)).invokestatic(API,"staticValue",MethodTypeDesc.of(CD_int),true).iadd().ireturn();}
  private static void buildSpecial(ClassBuilder b) {flags(b);b.withInterfaceSymbols(API);
    b.withMethodBody("<init>",MethodTypeDesc.of(CD_void),ClassFile.ACC_PUBLIC,InstructionMembersFinal::codeConstructor);
    b.withMethodBody("make",MethodTypeDesc.of(CD_Object),PUBLIC_STATIC,InstructionMembersFinal::codeMake);
    b.withMethodBody("defaultCall",MethodTypeDesc.of(CD_int),ClassFile.ACC_PUBLIC,InstructionMembersFinal::codeDefault);
    b.withMethodBody("run",MethodTypeDesc.of(CD_int,CD_Object),PUBLIC_STATIC,InstructionMembersFinal::codeSpecialRun);
  }
  private static void codeCast(CodeBuilder b) {b.aload(0).checkcast(CD_String).invokevirtual(CD_String,"length",MethodTypeDesc.of(CD_int)).ireturn();}
  private static void codeInstanceOf(CodeBuilder b) {b.aload(0).instanceOf(CD_String).ireturn();}
  private static void buildTypeChecks(ClassBuilder b) {flags(b);
    b.withMethodBody("length",MethodTypeDesc.of(CD_int,CD_Object),PUBLIC_STATIC,InstructionMembersFinal::codeCast);
    b.withMethodBody("isString",MethodTypeDesc.of(CD_boolean,CD_Object),PUBLIC_STATIC,InstructionMembersFinal::codeInstanceOf);
  }
  private static void codeMonitor(CodeBuilder b) {b.aload(0).dup().astore(1).monitorenter().bipush(7).istore(2).aload(1).monitorexit().iload(2).ireturn();}
  private static void buildMonitor(ClassBuilder b) {flags(b);b.withMethodBody("run",MethodTypeDesc.of(CD_int,CD_Object),PUBLIC_STATIC,InstructionMembersFinal::codeMonitor);}
  private static void codeMonitorHandler(CodeBuilder b) {
    Label start=b.newLabel(),end=b.newLabel(),normal=b.newLabel(),handler=b.newLabel();
    b.aload(0).dup().astore(2).monitorenter().labelBinding(start).aload(1).ifnull(normal).aload(1).athrow()
      .labelBinding(normal).bipush(9).istore(3).labelBinding(end).aload(2).monitorexit().iload(3).ireturn()
      .labelBinding(handler).astore(4).aload(2).monitorexit().aload(4).athrow().exceptionCatchAll(start,end,handler);
  }
  private static void buildMonitorHandler(ClassBuilder b) {flags(b);b.withMethodBody("run",MethodTypeDesc.of(CD_int,CD_Object,THROWABLE),PUBLIC_STATIC,InstructionMembersFinal::codeMonitorHandler);}
  private static void codeThrow(CodeBuilder b) {b.aload(0).athrow();}
  private static void buildThrow(ClassBuilder b) {flags(b);b.withMethodBody("run",MethodTypeDesc.of(CD_void,THROWABLE),PUBLIC_STATIC,InstructionMembersFinal::codeThrow);}

  private static void caseFields() throws Throwable {
    owner=ClassDesc.of("classes.modern_test.C7dFields");ClassFile api=ClassFile.of();byte[] bytes=api.build(owner,InstructionMembersFinal::buildFields);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-member-fields","member-fields",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle make=lookup.findStatic(generated,"make",MethodType.methodType(Object.class)),mutate=lookup.findStatic(generated,"mutate",MethodType.methodType(int.class,Object.class,int.class));
    Object value=(Object)make.invokeExact();check((int)mutate.invokeExact(value,17)==34 && (int)mutate.invokeExact(value,-3)==-6);
    emit("cf-member-fields","NEW/ctor=initialized;GETFIELD/PUTFIELD/GETSTATIC/PUTSTATIC=self;values=34/-6;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseVirtual() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dVirtual"),InstructionMembersFinal::buildVirtual);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-member-virtual","member-virtual",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"length",MethodType.methodType(int.class,String.class));check((int)handle.invokeExact("virtual")==7);
    emit("cf-member-virtual","INVOKEVIRTUAL=String.length;receiver=String;value=7;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseInterface() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dInterface"),InstructionMembersFinal::buildInterface);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-member-interface","member-interface",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"length",MethodType.methodType(int.class,CharSequence.class));check((int)handle.invokeExact((CharSequence)"interface")==9);
    emit("cf-member-interface","INVOKEINTERFACE=CharSequence.length;count=1/padding=0;value=9;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseSpecial() throws Throwable {
    owner=ClassDesc.of("classes.modern_test.C7dSpecial");ClassFile api=ClassFile.of();byte[] bytes=api.build(owner,InstructionMembersFinal::buildSpecial);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-member-special-interface","member-special",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle make=lookup.findStatic(generated,"make",MethodType.methodType(Object.class)),run=lookup.findStatic(generated,"run",MethodType.methodType(int.class,Object.class));Object value=(Object)make.invokeExact();check((int)run.invokeExact(value)==24);
    emit("cf-member-special-interface","INVOKESPECIAL=direct-default-interface;INVOKESTATIC=interface;CP11=true;default13+static11=24;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseTypeChecks() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dTypeChecks"),InstructionMembersFinal::buildTypeChecks);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-member-typechecks","member-typechecks",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);
    MethodHandle length=lookup.findStatic(generated,"length",MethodType.methodType(int.class,Object.class)),test=lookup.findStatic(generated,"isString",MethodType.methodType(boolean.class,Object.class));
    check((int)length.invokeExact((Object)"type")==4 && (boolean)test.invokeExact((Object)"type") && !(boolean)test.invokeExact((Object)null) && !(boolean)test.invokeExact((Object)Integer.valueOf(7)));
    emit("cf-member-typechecks","CHECKCAST/INSTANCEOF=String;length=4;String/null/Integer=true/false/false;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseMonitor() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dMonitor"),InstructionMembersFinal::buildMonitor);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-member-monitor","member-monitor",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"run",MethodType.methodType(int.class,Object.class));check((int)handle.invokeExact((Object)new Object())==7);
    emit("cf-member-monitor","MONITORENTER/MONITOREXIT=held-local-1;same-monitor-released;value=7;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseMonitorHandler() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dMonitorHandler"),InstructionMembersFinal::buildMonitorHandler);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-member-monitor-handler","member-monitor-handler",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"run",MethodType.methodType(int.class,Object.class,Throwable.class));Object monitor=new Object();
    check((int)handle.invokeExact(monitor,(Throwable)null)==9);IllegalArgumentException expected=new IllegalArgumentException("held-monitor");boolean caught=false;
    try {int ignored=(int)handle.invokeExact(monitor,(Throwable)expected);} catch(IllegalArgumentException actual) {caught=actual==expected;}check(caught);
    check((int)handle.invokeExact(monitor,(Throwable)null)==9);
    emit("cf-member-monitor-handler","catch-all=monitor-release/rethrow;normal=9;throwable=identity;reuse-after-exception=9;verify=empty;defined/invoked=same-bytes");
  }
  private static void caseThrow() throws Throwable {
    ClassFile api=ClassFile.of();byte[] bytes=api.build(ClassDesc.of("classes.modern_test.C7dThrow"),InstructionMembersFinal::buildThrow);
    check(api.verify(bytes).isEmpty());typed(api,bytes);artifact("cf-member-throw","member-throw",bytes);
    MethodHandles.Lookup lookup=MethodHandles.lookup();Class<?> generated=lookup.defineClass(bytes);MethodHandle handle=lookup.findStatic(generated,"run",MethodType.methodType(void.class,Throwable.class));
    IllegalArgumentException expected=new IllegalArgumentException("typed-throw");boolean caught=false;try {handle.invokeExact((Throwable)expected);} catch(IllegalArgumentException actual) {caught=actual==expected;}check(caught);
    emit("cf-member-throw","ATHROW=Throwable-parameter;exception=held-identity;verify=empty;defined/invoked=same-bytes");
  }
  private static void typed(ClassFile api,byte[] bytes) {
    for(MethodModel method:api.parse(bytes).methods())for(CodeElement element:method.code().get())if(element instanceof Instruction) {
      Opcode.Kind kind=((Instruction)element).opcode().kind();
      if(kind==Opcode.Kind.TYPE_CHECK)check(((java.lang.classfile.instruction.TypeCheckInstruction)element).type().tag()==7);
      if(kind==Opcode.Kind.MONITOR)check(element instanceof java.lang.classfile.instruction.MonitorInstruction);
      if(kind==Opcode.Kind.FIELD_ACCESS)check(((java.lang.classfile.instruction.FieldInstruction)element).field().tag()==9);
      if(kind==Opcode.Kind.INVOKE)check(((java.lang.classfile.instruction.InvokeInstruction)element).method().tag()==10 || ((java.lang.classfile.instruction.InvokeInstruction)element).method().tag()==11);
    }
  }
  public static void main(String[] args) throws Throwable {caseFields();caseVirtual();caseInterface();caseSpecial();caseTypeChecks();caseMonitor();caseMonitorHandler();caseThrow();System.out.println("CLASSFILE_INSTRUCTION_MEMBERS_OK");}
}

interface InstructionMemberApi {
  default int defaultValue() {return 13;}
  static int staticValue() {return 11;}
}
