package java.lang.classfile;

import java.lang.classfile.attribute.CodeAttribute;
import java.lang.classfile.attribute.SourceFileAttribute;
import java.lang.classfile.attribute.StackMapTableAttribute;

public final class Attributes {
  public static final String NAME_CODE = "Code";
  public static final String NAME_SOURCE_FILE = "SourceFile";
  public static final String NAME_STACK_MAP_TABLE = "StackMapTable";
  private Attributes() {}
  public static AttributeMapper<SourceFileAttribute> sourceFile() { return DoppioClassReader.sourceFileMapper(); }
  public static AttributeMapper<CodeAttribute> code() { return DoppioClassReader.codeMapper(); }
  public static AttributeMapper<StackMapTableAttribute> stackMapTable() { return DoppioClassReader.stackMapTableMapper(); }
}
