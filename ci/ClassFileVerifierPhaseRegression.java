package classes.modern_test;

import java.lang.classfile.ClassBuilder;
import java.lang.classfile.AttributedElement;
import java.lang.classfile.AttributeMapper;
import java.lang.classfile.BufWriter;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassHierarchyResolver;
import java.lang.classfile.ClassModel;
import java.lang.classfile.ClassReader;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.CustomAttribute;
import java.lang.classfile.Label;
import java.lang.classfile.attribute.ConstantValueAttribute;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.classfile.instruction.DiscontinuedInstruction.JsrInstruction;
import java.lang.classfile.instruction.DiscontinuedInstruction.RetInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import static java.lang.constant.ConstantDescs.*;

/** Same stock-Java25 source on every host; every target array is metadata-only. */
public final class ClassFileVerifierPhaseRegression {
  private static final int PUBLIC_STATIC=ClassFile.ACC_PUBLIC|ClassFile.ACC_STATIC;
  private static final String INFERENCE="Inference verification is not supported";
  private static final ClassDesc NUMBER=ClassDesc.of("java.lang.Number");
  private static int major,recipe,methodFlags,completed,artifacts;
  private static boolean parserDefect;

  private static void require(boolean valid,String detail) {if(!valid)throw new AssertionError(detail);}
  private static ClassFile api() {return ClassFile.of(ClassFile.StackMapsOption.DROP_STACK_MAPS);}
  private static ClassDesc owner(String id) {return ClassDesc.of("classes.modern_test.Phase_"+id.replace('-','_'));}
  private static void badConstantField(ClassBuilder builder) {
    builder.withField("wrongConstant",CD_String,field->field.withFlags(PUBLIC_STATIC|ClassFile.ACC_FINAL)
      .with(ConstantValueAttribute.of(field.constantPool().intEntry(7))));
  }
  private static void codeValid(CodeBuilder builder) {builder.bipush(7).ireturn();}
  private static void codeUnderflow(CodeBuilder builder) {builder.ireturn();}
  private static void codeWrongReturn(CodeBuilder builder) {builder.return_();}
  private static void codeDebug(CodeBuilder builder) {
    Label start=builder.newLabel(),end=builder.newLabel();
    builder.labelBinding(start).bipush(7).labelBinding(end).ireturn().localVariable(0,"x",CD_int,start,end);
  }
  private static void codeJsr(CodeBuilder builder) {
    Label sub=builder.newLabel();builder.with(JsrInstruction.of(sub)).iconst_1().ireturn()
      .labelBinding(sub).astore(0).with(RetInstruction.of(0));
  }
  private static void codeReference(CodeBuilder builder) {builder.aload(0).areturn();}
  private static void buildSingle(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER).withVersion(major,0);
    if(parserDefect)badConstantField(builder);
    MethodTypeDesc type=recipe==3?MethodTypeDesc.of(CD_int,CD_int):MethodTypeDesc.of(CD_int);
    if(recipe==2)builder.withMethod("value",type,methodFlags,method->{});
    else if(recipe==3)builder.withMethodBody("value",type,methodFlags,ClassFileVerifierPhaseRegression::codeDebug);
    else if(recipe==4)builder.withMethodBody("value",type,methodFlags,ClassFileVerifierPhaseRegression::codeJsr);
    else if(recipe==0)builder.withMethodBody("value",type,methodFlags,ClassFileVerifierPhaseRegression::codeValid);
    else builder.withMethodBody("value",type,methodFlags,ClassFileVerifierPhaseRegression::codeUnderflow);
  }
  private static byte[] single(String id,int version,int flags,int body,boolean badParser) {
    major=version;methodFlags=flags;recipe=body;parserDefect=badParser;
    return api().build(owner(id),ClassFileVerifierPhaseRegression::buildSingle);
  }
  private static void buildMultiple(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER).withVersion(major,0);
    if(parserDefect)badConstantField(builder);
    if(recipe==4)builder.withMethodBody("first",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileVerifierPhaseRegression::codeJsr);
    else builder.withMethodBody("first",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileVerifierPhaseRegression::codeUnderflow);
    if(methodFlags!=0)builder.withMethodBody("bridgeBetween",MethodTypeDesc.of(CD_int),PUBLIC_STATIC|ClassFile.ACC_BRIDGE,ClassFileVerifierPhaseRegression::codeUnderflow);
    builder.withMethodBody("second",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileVerifierPhaseRegression::codeWrongReturn);
  }
  private static byte[] multiple(String id,int version,boolean bridge,boolean badParser,boolean jsr) {
    major=version;methodFlags=bridge?ClassFile.ACC_BRIDGE:0;recipe=jsr?4:1;parserDefect=badParser;
    return api().build(owner(id),ClassFileVerifierPhaseRegression::buildMultiple);
  }

  private static String category(VerifyError error) {
    String message=error.getMessage();require(message!=null&&!message.isEmpty(),"Nonempty verification diagnostic");
    if(INFERENCE.equals(message))return "inference";
    if(message.startsWith("Bad constant value type"))return "parser-constant";
    if(message.startsWith("Arguments can't fit into locals"))return "parser-arguments";
    if(message.startsWith("Code attribute in native or abstract"))return "parser-code";
    if(message.startsWith("Illegal local variable table start_pc"))return "byte-lvt";
    if(message.startsWith("Operand stack underflow"))return "byte-underflow";
    // These are the two named implementations' precise diagnostics for the same recipe.
    // This is not an arbitrary nonempty-error acceptance rule or a host-source adapter.
    if(message.startsWith("Method expects a return value")||message.equals("Void return in value method"))return "byte-return";
    if(message.startsWith("Bad instruction:")||message.startsWith("Bad wide instruction"))return "byte-discontinued";
    for(String name:new String[]{"IllegalArgumentException","IllegalStateException","AssertionError"})
      if(message.startsWith("java.lang."+name+": phase-resolver-"))return "resolver-"+name;
    throw new AssertionError("Unclassified actual verifier diagnostic: "+message);
  }
  private static List<String> categories(List<VerifyError> errors,boolean initialization) {
    List<String> result=new ArrayList<>();
    for(VerifyError error:errors) {
      require(error.getClass()==VerifyError.class,"Exact VerifyError element class");
      if(initialization) {
        require(error.getMessage()!=null&&!error.getMessage().isEmpty()&&!INFERENCE.equals(error.getMessage()),"Initialization failure is not inference fallback");
        result.add("initialization-debug");
      } else result.add(category(error));
    }
    return result;
  }
  private static String joined(List<String> categories) {
    if(categories.isEmpty())return "empty";StringBuilder value=new StringBuilder();
    for(String category:categories){if(value.length()!=0)value.append(',');value.append(category);}return value.toString();
  }
  private static void immutable(List<VerifyError> errors) {
    try {errors.add(new VerifyError("must-not-be-added"));throw new AssertionError("Mutable result list");}
    catch(UnsupportedOperationException expected) {}
  }
  private static void outcome(String id,ClassFile selected,byte[] bytes,String... expected) {
    boolean initialization=expected.length==1&&"initialization-debug".equals(expected[0]);
    List<VerifyError> byteErrors=selected.verify(bytes);
    ClassModel model=selected.parse(bytes);List<VerifyError> modelErrors=selected.verify(model);
    List<String> first=categories(byteErrors,initialization),second=categories(modelErrors,initialization);
    require(first.equals(Arrays.asList(expected)),id+" bytes expected "+Arrays.toString(expected)+" but got "+first);
    require(second.equals(first),id+" model and bytes phase outcomes differ");immutable(byteErrors);immutable(modelErrors);
    require(bytes.length>8&&((bytes[0]&255)==0xca),"Own complete target bytes");
    System.out.println("CF_ARTIFACT|"+id+"|"+id+"|"+Base64.getEncoder().encodeToString(bytes));artifacts++;
    System.out.println("PROFILE|"+id+"|major="+model.majorVersion()+"|bytes="+byteErrors.size()+"|model="+modelErrors.size()+"|categories="+joined(first));
    for(VerifyError error:byteErrors)System.out.println("VERIFY_MESSAGE|"+id+"|"+error.getMessage().replace('\n',' ').replace('\r',' '));
    System.out.println("CASE|"+id+"|"+joined(first)+";byte/model=equal;list=immutable;definition=never");completed++;
  }

  private static int u2(byte[] bytes,int at) {
    require(at>=0&&at<=bytes.length-2,"Bounded u2");return (bytes[at]&255)<<8|(bytes[at+1]&255);
  }
  private static int u4(byte[] bytes,int at) {
    int result=u2(bytes,at)<<16|u2(bytes,at+2);require(result>=0,"Bounded nonnegative length");return result;
  }
  private static int nextAttribute(byte[] bytes,int at) {
    long result=(long)at+6+u4(bytes,at+2);require(result<=bytes.length,"Complete selected attribute");return (int)result;
  }
  /** Only locate raw Code headers/nested LVT in this source's own output, never write headers. */
  private static int locate(byte[] bytes,String selected) {
    require(bytes.length>=10&&u2(bytes,0)==0xcafe&&u2(bytes,2)==0xbabe,"Own complete class header");
    int count=u2(bytes,8),at=10;String[] utf=new String[count];
    for(int index=1;index<count;index++) {
      require(at<bytes.length,"Bounded CP entry");int tag=bytes[at++]&255;
      if(tag==1){int length=u2(bytes,at);at+=2;require(length<=bytes.length-at,"Bounded UTF");utf[index]=new String(bytes,at,length,StandardCharsets.UTF_8);at+=length;}
      else if(tag==3||tag==4||tag==9||tag==10||tag==11||tag==12||tag==17||tag==18)at+=4;
      else if(tag==5||tag==6){at+=8;index++;}
      else if(tag==7||tag==8||tag==16||tag==19||tag==20)at+=2;
      else if(tag==15)at+=3;else throw new AssertionError("Unexpected own CP tag "+tag);
      require(at<=bytes.length,"Complete CP operand");
    }
    at+=6;at+=2+2*u2(bytes,at);int fields=u2(bytes,at);at+=2;
    for(int field=0;field<fields;field++){int attributes=u2(bytes,at+6);at+=8;for(int n=0;n<attributes;n++)at=nextAttribute(bytes,at);}
    int methods=u2(bytes,at);at+=2;int found=-1,matches=0;
    for(int method=0;method<methods;method++) {
      int attributes=u2(bytes,at+6);at+=8;
      for(int n=0;n<attributes;n++) {
        int key=u2(bytes,at),next=nextAttribute(bytes,at);require(key>0&&key<utf.length,"Actual attribute name");
        if("Code".equals(utf[key])) {
          int payload=at+6;
          if("Code".equals(selected)){found=payload;matches++;}
          else {
            int nested=payload+8+u4(bytes,payload+4);int handlers=u2(bytes,nested);nested+=2+handlers*8;
            int nestedCount=u2(bytes,nested);nested+=2;
            for(int item=0;item<nestedCount;item++) {
              int nestedKey=u2(bytes,nested),nestedNext=nextAttribute(bytes,nested);require(nestedNext<=next,"Nested boundary");
              if(selected.equals(utf[nestedKey])){found=nested+6;matches++;}nested=nestedNext;
            }
            require(nested==next,"Exact Code nesting");
          }
        }
        at=next;
      }
    }
    require(matches==1&&found>=0,"Exactly one selected own Code/table");return found;
  }
  private static byte[] change(byte[] original,String selected,int relative,int expected,int replacement) {
    int at=locate(original,selected)+relative;require(u2(original,at)==expected&&replacement>=0&&replacement<=65535&&replacement!=expected,"Exact selected u2 mutation");
    byte[] saved=original.clone(),changed=original.clone();changed[at]=(byte)(replacement>>>8);changed[at+1]=(byte)replacement;
    int differences=0;for(int n=0;n<original.length;n++)if(original[n]!=changed[n]){require(n==at||n==at+1,"No other mutation");differences++;}
    require(differences>=1&&differences<=2&&u2(changed,at)==replacement&&Arrays.equals(original,saved),"Own source stays unchanged");return changed;
  }
  private static void versions() {
    for(int version:new int[]{49,50,51,69}) {
      String prefix="phase-v"+version;
      String[] inference=version<50?new String[]{"inference"}:new String[0];
      outcome(prefix+"-valid",api(),single(prefix+"-valid",version,PUBLIC_STATIC,0,false),inference);
      outcome(prefix+"-ordinary-bad",api(),single(prefix+"-ordinary-bad",version,PUBLIC_STATIC,1,false),version<=50?new String[]{"inference"}:new String[]{"byte-underflow"});
      outcome(prefix+"-bridge-bad",api(),single(prefix+"-bridge-bad",version,PUBLIC_STATIC|ClassFile.ACC_BRIDGE,1,false),inference);
      outcome(prefix+"-parser-bridge",api(),single(prefix+"-parser-bridge",version,PUBLIC_STATIC|ClassFile.ACC_BRIDGE,1,true),
        version<50?new String[]{"parser-constant","inference"}:new String[]{"parser-constant"});
    }
  }
  private static void bridgesAndFlags() {
    outcome("phase-bridge-no-code",api(),single("phase-bridge-no-code",69,PUBLIC_STATIC|ClassFile.ACC_BRIDGE,2,false));
    outcome("phase-synthetic-bad",api(),single("phase-synthetic-bad",69,PUBLIC_STATIC|ClassFile.ACC_SYNTHETIC,1,false),"byte-underflow");
    byte[] bridge=single("phase-bridge-lvt-operand",69,PUBLIC_STATIC|ClassFile.ACC_BRIDGE,3,false);
    outcome("phase-bridge-lvt-operand",api(),change(bridge,"LocalVariableTable",2,0,1));
    byte[] ordinary=single("phase-ordinary-lvt-operand",69,PUBLIC_STATIC,3,false);
    outcome("phase-ordinary-lvt-operand",api(),change(ordinary,"LocalVariableTable",2,0,1),"byte-lvt");
    byte[] invalidDebug=single("phase-bridge-debug-initialization",69,PUBLIC_STATIC|ClassFile.ACC_BRIDGE,3,false);
    outcome("phase-bridge-debug-initialization",api(),change(invalidDebug,"LocalVariableTable",2,0,4),"initialization-debug");
    byte[] arguments=single("phase-bridge-locals-short",69,PUBLIC_STATIC|ClassFile.ACC_BRIDGE,3,false);
    outcome("phase-bridge-locals-short",api(),change(arguments,"Code",2,1,0),"parser-arguments");
    outcome("phase-native-with-code",api(),single("phase-native-with-code",69,PUBLIC_STATIC|ClassFile.ACC_NATIVE,0,false),"parser-code");
    outcome("phase-abstract-with-code",api(),single("phase-abstract-with-code",69,ClassFile.ACC_PUBLIC|ClassFile.ACC_ABSTRACT,0,false),"parser-code");
    outcome("phase-native-no-code",api(),single("phase-native-no-code",69,PUBLIC_STATIC|ClassFile.ACC_NATIVE,2,false));
    outcome("phase-abstract-no-code",api(),single("phase-abstract-no-code",69,ClassFile.ACC_PUBLIC|ClassFile.ACC_ABSTRACT,2,false));
  }
  private static void multipleErrors() {
    for(int version:new int[]{50,69}) {
      String prefix="phase-multi"+version;
      String[] byteFailures=version==50?new String[]{"inference"}:new String[]{"byte-underflow","byte-return"};
      outcome(prefix,api(),multiple(prefix,version,false,false,false),byteFailures);
      outcome(prefix+"-bridge",api(),multiple(prefix+"-bridge",version,true,false,false),byteFailures);
      outcome(prefix+"-parser",api(),multiple(prefix+"-parser",version,true,true,false),
        version==50?new String[]{"parser-constant","inference"}:new String[]{"parser-constant","byte-underflow","byte-return"});
    }
    outcome("phase-parser-valid50",api(),single("phase-parser-valid50",50,PUBLIC_STATIC,0,true),"parser-constant");
  }
  private static void discontinued() {
    for(int version:new int[]{50,69}) {
      String id="phase-bridge-jsr"+version;
      outcome(id,api(),single(id,version,PUBLIC_STATIC|ClassFile.ACC_BRIDGE,4,false));
      String mixed="phase-mixed-jsr"+version;
      outcome(mixed,api(),multiple(mixed,version,true,false,true),version==50?new String[]{"inference"}:new String[]{"byte-discontinued","byte-return"});
    }
  }
  private static void excludedOwners() {
    for(String name:new String[]{"java.lang.Object","java.lang.Class","java.lang.String","java.lang.Throwable"}) {
      String suffix=name.substring(name.lastIndexOf('.')+1);major=69;methodFlags=PUBLIC_STATIC;recipe=1;parserDefect=false;
      byte[] bytes=api().build(ClassDesc.of(name),ClassFileVerifierPhaseRegression::buildSingle);
      outcome("phase-excluded-"+suffix,api(),bytes);
      parserDefect=true;byte[] parser=api().build(ClassDesc.of(name),ClassFileVerifierPhaseRegression::buildSingle);
      outcome("phase-excluded-parser-"+suffix,api(),parser,"parser-constant");
    }
  }
  private static void buildResolver(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER).withVersion(major,0)
      .withMethodBody("reference",MethodTypeDesc.of(NUMBER,CD_String),methodFlags,ClassFileVerifierPhaseRegression::codeReference);
    if((methodFlags&ClassFile.ACC_BRIDGE)==0)builder.withMethodBody("later",MethodTypeDesc.of(CD_int),PUBLIC_STATIC,ClassFileVerifierPhaseRegression::codeUnderflow);
  }
  private static void resolvers() {
    for(int version:new int[]{50,69})for(int kind:new int[]{0,1,2}) {
      String type=kind==0?"IllegalArgumentException":kind==1?"IllegalStateException":"AssertionError";
      String id="phase-resolver"+version+"-"+type;major=version;methodFlags=PUBLIC_STATIC;
      byte[] bytes=api().build(owner(id),ClassFileVerifierPhaseRegression::buildResolver);int[] calls={0};
      ClassHierarchyResolver resolver=descriptor->{calls[0]++;
        if(kind==0)throw new IllegalArgumentException("phase-resolver-held");
        if(kind==1)throw new IllegalStateException("phase-resolver-held");
        throw new AssertionError("phase-resolver-held");
      };
      ClassFile selected=api().withOptions(ClassFile.ClassHierarchyResolverOption.of(resolver));
      outcome(id,selected,bytes,version==50?new String[]{"inference"}:new String[]{"resolver-"+type,"byte-underflow"});
      require(calls[0]>0,"Actual resolver callback was executed");
    }
    for(int version:new int[]{50,69}) {
      String id="phase-bridge-resolver"+version;major=version;methodFlags=PUBLIC_STATIC|ClassFile.ACC_BRIDGE;
      byte[] bytes=api().build(owner(id),ClassFileVerifierPhaseRegression::buildResolver);int[] calls={0};
      ClassHierarchyResolver resolver=descriptor->{calls[0]++;throw new AssertionError("Skipped bridge resolved hierarchy");};
      outcome(id,api().withOptions(ClassFile.ClassHierarchyResolverOption.of(resolver)),bytes);
      require(calls[0]==0,"Bridge bytecode skip never queries resolver");
    }
  }

  private static final class ParserAttribute extends CustomAttribute<ParserAttribute> {
    ParserAttribute(ParserMapper mapper) {super(mapper);}
  }
  private static final class ParserMapper implements AttributeMapper<ParserAttribute> {
    final VerifyError heldVerify=new VerifyError("phase-parser-held-VerifyError");
    final IllegalArgumentException heldArgument=new IllegalArgumentException("phase-parser-held-IAE");
    int armed,calls;
    public String name() {return "PhaseParserCallback";}
    public AttributeStability stability() {return AttributeStability.STATELESS;}
    public boolean allowMultiple() {
      if(armed!=0)calls++;
      if(armed==1)throw heldVerify;
      if(armed==2)throw heldArgument;
      return false;
    }
    public ParserAttribute readAttribute(AttributedElement owner,ClassReader reader,int start) {
      require(owner instanceof ClassModel&&reader.readInt(start-4)==0,"Actual class-owned zero-payload callback");
      return new ParserAttribute(this);
    }
    public void writeAttribute(BufWriter writer,ParserAttribute attribute) {
      writer.writeIndex(attribute.attributeName());writer.writeInt(0);
    }
  }
  private static void callbackArtifact(String id,byte[] bytes,String count,String result) {
    System.out.println("CF_ARTIFACT|"+id+"|"+id+"|"+Base64.getEncoder().encodeToString(bytes));artifacts++;
    System.out.println("PROFILE|"+id+"|major=69|bytes="+count+"|model="+count+"|categories="+result);
    System.out.println("CASE|"+id+"|"+result+";byte/model=equal;list=immutable;definition=never");completed++;
  }
  private static void parserCallbacks() {
    for(int variant:new int[]{0,1,2}) {
      String id=variant==0?"phase-parser-callback-VerifyError":variant==1?"phase-parser-callback-IAE":"phase-parser-callback-IAE-after-duplicate";
      ParserMapper mapper=new ParserMapper();
      ClassFile selected=api().withOptions(ClassFile.AttributeMapperOption.of(name->name.equalsString(mapper.name())?mapper:null));
      byte[] bytes=api().build(owner(id),builder->{
        builder.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER).withVersion(69,0).with(new ParserAttribute(mapper));
        if(variant==2)builder.withInterfaceSymbols(ClassDesc.of("java.io.Serializable"),ClassDesc.of("java.io.Serializable"));
      });
      ClassModel model=selected.parse(bytes);require(model.attributes().size()==1,"Preinflated real custom attribute model");
      mapper.armed=variant==0?1:2;
      if(variant==0) {
        try {selected.verify(bytes);throw new AssertionError("Parser VerifyError became a byte result list");}
        catch(VerifyError failure){require(failure==mapper.heldVerify,"Byte parser preserves held VerifyError identity");}
        try {selected.verify(model);throw new AssertionError("Parser VerifyError became a model result list");}
        catch(VerifyError failure){require(failure==mapper.heldVerify,"Model parser preserves held VerifyError identity");}
        require(mapper.calls==2,"Exactly one failed allowMultiple callback per verification");
        callbackArtifact(id,bytes,"throws-VerifyError","parser-VerifyError-identity");
      } else {
        List<VerifyError> first=selected.verify(bytes),second=selected.verify(model);
        require(first.size()==1&&second.size()==1,"Outer initialization IAE is a singleton, never parser-prefix plus IAE");
        for(List<VerifyError> errors:Arrays.asList(first,second)) {
          require(errors.get(0).getClass()==VerifyError.class&&mapper.heldArgument.getMessage().equals(errors.get(0).getMessage()),"Outer IAE retains exact message, not method-local toString");
          immutable(errors);
        }
        require(mapper.calls==2,"Exactly one failed allowMultiple callback per verification");
        System.out.println("VERIFY_MESSAGE|"+id+"|"+first.get(0).getMessage());
        callbackArtifact(id,bytes,"1","parser-IAE-singleton");
      }
    }
  }
  private static void codeJsrLvt(CodeBuilder builder) {
    Label start=builder.newLabel(),scopeEnd=builder.newLabel(),sub=builder.newLabel();
    builder.labelBinding(start).with(JsrInstruction.of(sub)).labelBinding(scopeEnd).iconst_1().ireturn()
      .labelBinding(sub).astore(0).with(RetInstruction.of(0)).localVariable(0,"x",CD_int,start,scopeEnd);
  }
  private static void buildJsrLvt(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER).withVersion(major,0)
      .withMethodBody("value",MethodTypeDesc.of(CD_int),methodFlags,ClassFileVerifierPhaseRegression::codeJsrLvt);
  }
  private static void jsrLvtOrdering() {
    for(int variant:new int[]{0,1,2}) {
      String id=variant==0?"phase-jsr-lvt-first69":variant==1?"phase-jsr-lvt-fallback50":"phase-bridge-jsr-lvt69";
      major=variant==1?50:69;methodFlags=PUBLIC_STATIC|(variant==2?ClassFile.ACC_BRIDGE:0);
      byte[] original=api().build(owner(id),ClassFileVerifierPhaseRegression::buildJsrLvt);
      byte[] operand=change(original,"LocalVariableTable",2,0,1);
      outcome(id,api(),operand,variant==0?new String[]{"byte-lvt"}:variant==1?new String[]{"inference"}:new String[0]);
    }
  }
  private static void buildObjectConstructor(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER).withVersion(69,0)
      .withMethodBody("<init>",MethodTypeDesc.of(CD_void),ClassFile.ACC_PUBLIC,CodeBuilder::return_);
  }
  private static void objectConstructors() {
    ClassFile[] contexts={ClassFile.of(),ClassFile.of(ClassFile.StackMapsOption.GENERATE_STACK_MAPS),api()};
    String[] ids={"phase-object-ctor-auto","phase-object-ctor-generate","phase-object-ctor-drop"};
    for(int index=0;index<contexts.length;index++) {
      byte[] bytes=contexts[index].build(CD_Object,ClassFileVerifierPhaseRegression::buildObjectConstructor);
      require(!contexts[index].parse(bytes).superclass().isPresent(),"Implicit actual Object superclass is zero");
      outcome(ids[index],contexts[index],bytes);
    }
  }
  private static final class NamedParserAttribute extends CustomAttribute<NamedParserAttribute> {
    private final NamedParserMapper mapper;
    private final Utf8Entry boundName;
    NamedParserAttribute(NamedParserMapper mapper,Utf8Entry boundName) {
      super(mapper);this.mapper=mapper;this.boundName=boundName;
    }
    public Utf8Entry attributeName() {
      if(mapper.armed!=0){mapper.nameCalls++;throw mapper.heldName;}
      return boundName==null?super.attributeName():boundName;
    }
  }
  private static final class NamedParserMapper implements AttributeMapper<NamedParserAttribute> {
    private final boolean multiple;
    final VerifyError heldVerify=new VerifyError("phase-parser-held-order-VerifyError");
    final IllegalArgumentException heldName=new IllegalArgumentException("phase-parser-held-name-IAE");
    int armed,calls,nameCalls;
    NamedParserMapper(boolean multiple) {this.multiple=multiple;}
    public String name() {return "PhaseParserNameCallback";}
    public AttributeStability stability() {return AttributeStability.STATELESS;}
    public boolean allowMultiple() {
      if(armed!=0)calls++;
      if(armed==2)throw heldVerify;
      return multiple;
    }
    public NamedParserAttribute readAttribute(AttributedElement owner,ClassReader reader,int start) {
      require(owner instanceof ClassModel&&reader.readInt(start-4)==0,"Actual class-owned zero-payload name-order callback");
      return new NamedParserAttribute(this,reader.readEntry(start-6,Utf8Entry.class));
    }
    public void writeAttribute(BufWriter writer,NamedParserAttribute attribute) {
      writer.writeIndex(writer.constantPool().utf8Entry(name()));writer.writeInt(0);
    }
  }
  private static void parserNameOrder() {
    for(int variant:new int[]{0,1,2}) {
      String id=variant==0?"phase-parser-name-multiple":variant==1?"phase-parser-name-short-circuit":"phase-parser-name-IAE";
      NamedParserMapper mapper=new NamedParserMapper(variant==0);
      ClassFile selected=api().withOptions(ClassFile.AttributeMapperOption.of(name->name.equalsString(mapper.name())?mapper:null));
      byte[] bytes=api().build(owner(id),builder->builder.withFlags(ClassFile.ACC_PUBLIC|ClassFile.ACC_SUPER)
        .withVersion(69,0).with(new NamedParserAttribute(mapper,null)));
      ClassModel model=selected.parse(bytes);require(model.attributes().size()==1,"Preinflated real name-order custom attribute model");
      mapper.armed=variant==1?2:1;
      if(variant==1) {
        try {selected.verify(bytes);throw new AssertionError("Name-order parser VerifyError became a byte result list");}
        catch(VerifyError failure){require(failure==mapper.heldVerify,"Byte allowMultiple held VerifyError short-circuits name getter");}
        try {selected.verify(model);throw new AssertionError("Name-order parser VerifyError became a model result list");}
        catch(VerifyError failure){require(failure==mapper.heldVerify,"Model allowMultiple held VerifyError short-circuits name getter");}
        require(mapper.calls==2&&mapper.nameCalls==0,"One failed mapper callback per verification, no premature name access");
        callbackArtifact(id,bytes,"throws-VerifyError","parser-VerifyError-identity");
      } else {
        List<VerifyError> first=selected.verify(bytes),second=selected.verify(model);
        int count=variant==0?0:1;
        require(first.size()==count&&second.size()==count,"Name-order bytes/model exact list counts");
        immutable(first);immutable(second);
        if(variant==0)require(mapper.nameCalls==0,"allowMultiple true must never evaluate throwing name getter");
        else {
          for(List<VerifyError> errors:Arrays.asList(first,second))
            require(errors.get(0).getClass()==VerifyError.class&&mapper.heldName.getMessage().equals(errors.get(0).getMessage()),"Name getter IAE becomes exact outer singleton");
          require(mapper.nameCalls==2,"allowMultiple false evaluates the held name getter once per verification");
          System.out.println("VERIFY_MESSAGE|"+id+"|"+first.get(0).getMessage());
        }
        require(mapper.calls==2,"Exactly one allowMultiple callback per verification before name selection");
        callbackArtifact(id,bytes,Integer.toString(count),variant==0?"empty":"parser-IAE-singleton");
      }
    }
  }
  public static void main(String[] args) {
    require(args.length==0,"One unchanged source and execution path on every host");
    versions();bridgesAndFlags();multipleErrors();discontinued();excludedOwners();resolvers();
    parserCallbacks();jsrLvtOrdering();objectConstructors();
    parserNameOrder();
    require(completed==artifacts,"Every completed case has exactly one own array");
    System.out.println("CLASSFILE_VERIFIER_PHASE_REGRESSION_OK|cases="+completed+"|artifacts="+artifacts);
  }
}
