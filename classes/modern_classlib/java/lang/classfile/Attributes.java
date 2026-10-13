package java.lang.classfile;

import java.lang.classfile.attribute.*;

public final class Attributes {
  public static final String NAME_CODE = "Code";
  public static final String NAME_SOURCE_FILE = "SourceFile";
  public static final String NAME_STACK_MAP_TABLE = "StackMapTable";
  public static final String NAME_LINE_NUMBER_TABLE = "LineNumberTable";
  public static final String NAME_LOCAL_VARIABLE_TABLE = "LocalVariableTable";
  public static final String NAME_LOCAL_VARIABLE_TYPE_TABLE = "LocalVariableTypeTable";
  public static final String NAME_CHARACTER_RANGE_TABLE = "CharacterRangeTable";
  public static final String NAME_SOURCE_DEBUG_EXTENSION = "SourceDebugExtension";
  public static final String NAME_CONSTANT_VALUE = "ConstantValue";
  public static final String NAME_SIGNATURE = "Signature";
  public static final String NAME_EXCEPTIONS = "Exceptions";
  public static final String NAME_NEST_HOST = "NestHost";
  public static final String NAME_NEST_MEMBERS = "NestMembers";
  public static final String NAME_INNER_CLASSES = "InnerClasses";
  public static final String NAME_BOOTSTRAP_METHODS = "BootstrapMethods";
  public static final String NAME_DEPRECATED = "Deprecated";
  public static final String NAME_SYNTHETIC = "Synthetic";
  public static final String NAME_RECORD = "Record";
  public static final String NAME_PERMITTED_SUBCLASSES = "PermittedSubclasses";
  public static final String NAME_ENCLOSING_METHOD = "EnclosingMethod";
  public static final String NAME_METHOD_PARAMETERS = "MethodParameters";
  public static final String NAME_SOURCE_ID = "SourceID";
  public static final String NAME_COMPILATION_ID = "CompilationID";
  public static final String NAME_ANNOTATION_DEFAULT = "AnnotationDefault";
  public static final String NAME_RUNTIME_VISIBLE_ANNOTATIONS = "RuntimeVisibleAnnotations";
  public static final String NAME_RUNTIME_INVISIBLE_ANNOTATIONS = "RuntimeInvisibleAnnotations";
  public static final String NAME_RUNTIME_VISIBLE_PARAMETER_ANNOTATIONS = "RuntimeVisibleParameterAnnotations";
  public static final String NAME_RUNTIME_INVISIBLE_PARAMETER_ANNOTATIONS = "RuntimeInvisibleParameterAnnotations";
  public static final String NAME_RUNTIME_VISIBLE_TYPE_ANNOTATIONS = "RuntimeVisibleTypeAnnotations";
  public static final String NAME_RUNTIME_INVISIBLE_TYPE_ANNOTATIONS = "RuntimeInvisibleTypeAnnotations";
  private Attributes() {}
  public static AttributeMapper<SourceFileAttribute> sourceFile() { return DoppioClassReader.sourceFileMapper(); }
  public static AttributeMapper<CodeAttribute> code() { return DoppioClassReader.codeMapper(); }
  public static AttributeMapper<StackMapTableAttribute> stackMapTable() { return DoppioClassReader.stackMapTableMapper(); }
  public static AttributeMapper<LineNumberTableAttribute> lineNumberTable() { return DoppioDebugAttributes.lineNumberTableMapper(); }
  public static AttributeMapper<LocalVariableTableAttribute> localVariableTable() { return DoppioDebugAttributes.localVariableTableMapper(); }
  public static AttributeMapper<LocalVariableTypeTableAttribute> localVariableTypeTable() { return DoppioDebugAttributes.localVariableTypeTableMapper(); }
  public static AttributeMapper<CharacterRangeTableAttribute> characterRangeTable() { return DoppioDebugAttributes.characterRangeTableMapper(); }
  public static AttributeMapper<SourceDebugExtensionAttribute> sourceDebugExtension() { return DoppioDebugAttributes.sourceDebugExtensionMapper(); }
  public static AttributeMapper<ConstantValueAttribute> constantValue() { return DoppioAttributes.CONSTANT_VALUE; }
  public static AttributeMapper<SignatureAttribute> signature() { return DoppioAttributes.SIGNATURE; }
  public static AttributeMapper<ExceptionsAttribute> exceptions() { return DoppioAttributes.EXCEPTIONS; }
  public static AttributeMapper<NestHostAttribute> nestHost() { return DoppioAttributes.NEST_HOST; }
  public static AttributeMapper<NestMembersAttribute> nestMembers() { return DoppioAttributes.NEST_MEMBERS; }
  public static AttributeMapper<InnerClassesAttribute> innerClasses() { return DoppioAttributes.INNER_CLASSES; }
  public static AttributeMapper<BootstrapMethodsAttribute> bootstrapMethods() { return DoppioAttributes.BOOTSTRAPS; }
  public static AttributeMapper<DeprecatedAttribute> deprecated() { return DoppioAttributes.DEPRECATED; }
  public static AttributeMapper<SyntheticAttribute> synthetic() { return DoppioAttributes.SYNTHETIC; }
  public static AttributeMapper<RecordAttribute> record() { return DoppioMetadataAttributes.recordMapper(); }
  public static AttributeMapper<PermittedSubclassesAttribute> permittedSubclasses() { return DoppioMetadataAttributes.permittedSubclassesMapper(); }
  public static AttributeMapper<EnclosingMethodAttribute> enclosingMethod() { return DoppioMetadataAttributes.enclosingMethodMapper(); }
  public static AttributeMapper<MethodParametersAttribute> methodParameters() { return DoppioMetadataAttributes.methodParametersMapper(); }
  public static AttributeMapper<SourceIDAttribute> sourceId() { return DoppioMetadataAttributes.sourceIdMapper(); }
  public static AttributeMapper<CompilationIDAttribute> compilationId() { return DoppioMetadataAttributes.compilationIdMapper(); }
  public static AttributeMapper<AnnotationDefaultAttribute> annotationDefault() { return DoppioAnnotationAttributes.annotationDefaultMapper(); }
  public static AttributeMapper<RuntimeVisibleAnnotationsAttribute> runtimeVisibleAnnotations() { return DoppioAnnotationAttributes.runtimeVisibleAnnotationsMapper(); }
  public static AttributeMapper<RuntimeInvisibleAnnotationsAttribute> runtimeInvisibleAnnotations() { return DoppioAnnotationAttributes.runtimeInvisibleAnnotationsMapper(); }
  public static AttributeMapper<RuntimeVisibleParameterAnnotationsAttribute> runtimeVisibleParameterAnnotations() { return DoppioAnnotationAttributes.runtimeVisibleParameterAnnotationsMapper(); }
  public static AttributeMapper<RuntimeInvisibleParameterAnnotationsAttribute> runtimeInvisibleParameterAnnotations() { return DoppioAnnotationAttributes.runtimeInvisibleParameterAnnotationsMapper(); }
  public static AttributeMapper<RuntimeVisibleTypeAnnotationsAttribute> runtimeVisibleTypeAnnotations() { return DoppioTypeAnnotationAttributes.runtimeVisibleTypeAnnotationsMapper(); }
  public static AttributeMapper<RuntimeInvisibleTypeAnnotationsAttribute> runtimeInvisibleTypeAnnotations() { return DoppioTypeAnnotationAttributes.runtimeInvisibleTypeAnnotationsMapper(); }
}
