package java.lang.classfile;

import java.lang.classfile.attribute.*;

public final class Attributes {
  public static final String NAME_CODE = "Code";
  public static final String NAME_SOURCE_FILE = "SourceFile";
  public static final String NAME_STACK_MAP_TABLE = "StackMapTable";
  public static final String NAME_CONSTANT_VALUE = "ConstantValue";
  public static final String NAME_SIGNATURE = "Signature";
  public static final String NAME_EXCEPTIONS = "Exceptions";
  public static final String NAME_NEST_HOST = "NestHost";
  public static final String NAME_NEST_MEMBERS = "NestMembers";
  public static final String NAME_INNER_CLASSES = "InnerClasses";
  public static final String NAME_BOOTSTRAP_METHODS = "BootstrapMethods";
  public static final String NAME_DEPRECATED = "Deprecated";
  public static final String NAME_SYNTHETIC = "Synthetic";
  private Attributes() {}
  public static AttributeMapper<SourceFileAttribute> sourceFile() { return DoppioClassReader.sourceFileMapper(); }
  public static AttributeMapper<CodeAttribute> code() { return DoppioClassReader.codeMapper(); }
  public static AttributeMapper<StackMapTableAttribute> stackMapTable() { return DoppioClassReader.stackMapTableMapper(); }
  public static AttributeMapper<ConstantValueAttribute> constantValue() { return DoppioAttributes.CONSTANT_VALUE; }
  public static AttributeMapper<SignatureAttribute> signature() { return DoppioAttributes.SIGNATURE; }
  public static AttributeMapper<ExceptionsAttribute> exceptions() { return DoppioAttributes.EXCEPTIONS; }
  public static AttributeMapper<NestHostAttribute> nestHost() { return DoppioAttributes.NEST_HOST; }
  public static AttributeMapper<NestMembersAttribute> nestMembers() { return DoppioAttributes.NEST_MEMBERS; }
  public static AttributeMapper<InnerClassesAttribute> innerClasses() { return DoppioAttributes.INNER_CLASSES; }
  public static AttributeMapper<BootstrapMethodsAttribute> bootstrapMethods() { return DoppioAttributes.BOOTSTRAPS; }
  public static AttributeMapper<DeprecatedAttribute> deprecated() { return DoppioAttributes.DEPRECATED; }
  public static AttributeMapper<SyntheticAttribute> synthetic() { return DoppioAttributes.SYNTHETIC; }
}
