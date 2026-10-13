import {entry,group,freeze} from './classfile_declarations_case_helpers.mjs';
// Independently frozen named original caller/typed-lifecycle obligations.
const callbacks=freeze({
  "buildModels": {
    "method": "buildModels",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "bipush",
      "invokeinterface",
      "ldc",
      "getstatic",
      "invokestatic",
      "invokedynamic",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "withFlags",
        "descriptor": "(I)Ljava/lang/classfile/ClassBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "withMethodBody",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;ILjava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "codeModels": {
    "method": "codeModels",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokeinterface",
      "astore_1",
      "astore_2",
      "aload_1",
      "aload_2",
      "iconst_0",
      "invokestatic",
      "astore_3",
      "bipush",
      "anewarray",
      "dup",
      "aastore",
      "iconst_1",
      "iconst_2",
      "ldc",
      "iconst_3",
      "iconst_4",
      "iconst_5",
      "aload_3",
      "astore",
      "aload",
      "if_icmpne",
      "arraylength",
      "goto",
      "istore",
      "iload",
      "if_icmpge",
      "checkcast",
      "aaload",
      "if_acmpne",
      "iinc",
      "ifne",
      "getstatic",
      "ifeq",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "startLabel",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "endLabel",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$LocalVarTargetInfo",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/Label;Ljava/lang/classfile/Label;I)Ljava/lang/classfile/TypeAnnotation$LocalVarTargetInfo;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofClassTypeParameter",
        "descriptor": "(I)Ljava/lang/classfile/TypeAnnotation$TypeParameterTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofMethodTypeParameter",
        "descriptor": "(I)Ljava/lang/classfile/TypeAnnotation$TypeParameterTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofClassExtends",
        "descriptor": "(I)Ljava/lang/classfile/TypeAnnotation$SupertypeTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofClassTypeParameterBound",
        "descriptor": "(II)Ljava/lang/classfile/TypeAnnotation$TypeParameterBoundTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofMethodTypeParameterBound",
        "descriptor": "(II)Ljava/lang/classfile/TypeAnnotation$TypeParameterBoundTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofField",
        "descriptor": "()Ljava/lang/classfile/TypeAnnotation$EmptyTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofMethodReturn",
        "descriptor": "()Ljava/lang/classfile/TypeAnnotation$EmptyTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofMethodReceiver",
        "descriptor": "()Ljava/lang/classfile/TypeAnnotation$EmptyTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofMethodFormalParameter",
        "descriptor": "(I)Ljava/lang/classfile/TypeAnnotation$FormalParameterTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofThrows",
        "descriptor": "(I)Ljava/lang/classfile/TypeAnnotation$ThrowsTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofLocalVariable",
        "descriptor": "(Ljava/util/List;)Ljava/lang/classfile/TypeAnnotation$LocalVarTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofResourceVariable",
        "descriptor": "(Ljava/util/List;)Ljava/lang/classfile/TypeAnnotation$LocalVarTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofExceptionParameter",
        "descriptor": "(I)Ljava/lang/classfile/TypeAnnotation$CatchTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofInstanceofExpr",
        "descriptor": "(Ljava/lang/classfile/Label;)Ljava/lang/classfile/TypeAnnotation$OffsetTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofNewExpr",
        "descriptor": "(Ljava/lang/classfile/Label;)Ljava/lang/classfile/TypeAnnotation$OffsetTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofConstructorReference",
        "descriptor": "(Ljava/lang/classfile/Label;)Ljava/lang/classfile/TypeAnnotation$OffsetTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofMethodReference",
        "descriptor": "(Ljava/lang/classfile/Label;)Ljava/lang/classfile/TypeAnnotation$OffsetTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofCastExpr",
        "descriptor": "(Ljava/lang/classfile/Label;I)Ljava/lang/classfile/TypeAnnotation$TypeArgumentTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofConstructorInvocationTypeArgument",
        "descriptor": "(Ljava/lang/classfile/Label;I)Ljava/lang/classfile/TypeAnnotation$TypeArgumentTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofMethodInvocationTypeArgument",
        "descriptor": "(Ljava/lang/classfile/Label;I)Ljava/lang/classfile/TypeAnnotation$TypeArgumentTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofConstructorReferenceTypeArgument",
        "descriptor": "(Ljava/lang/classfile/Label;I)Ljava/lang/classfile/TypeAnnotation$TypeArgumentTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofMethodReferenceTypeArgument",
        "descriptor": "(Ljava/lang/classfile/Label;I)Ljava/lang/classfile/TypeAnnotation$TypeArgumentTarget;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "values",
        "descriptor": "()[Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "targetType",
        "descriptor": "()Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$SupertypeTarget",
        "name": "supertypeIndex",
        "descriptor": "()I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$OffsetTarget",
        "name": "target",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TypeArgumentTarget",
        "name": "typeArgumentIndex",
        "descriptor": "()I"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TypePathComponent$Kind",
        "name": "TYPE_ARGUMENT",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TypePathComponent$Kind;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TypePathComponent",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/TypeAnnotation$TypePathComponent$Kind;I)Ljava/lang/classfile/TypeAnnotation$TypePathComponent;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TypePathComponent",
        "name": "ARRAY",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TypePathComponent;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TypePathComponent",
        "name": "INNER_TYPE",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TypePathComponent;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TypePathComponent",
        "name": "WILDCARD",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TypePathComponent;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "ofInt",
        "descriptor": "(Ljava/lang/String;I)Ljava/lang/classfile/AnnotationElement;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.Annotation",
        "name": "of",
        "descriptor": "(Ljava/lang/constant/ClassDesc;[Ljava/lang/classfile/AnnotationElement;)Ljava/lang/classfile/Annotation;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/TypeAnnotation$TargetInfo;Ljava/util/List;Ljava/lang/classfile/Annotation;)Ljava/lang/classfile/TypeAnnotation;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation",
        "name": "targetPath",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TypePathComponent",
        "name": "typeArgumentIndex",
        "descriptor": "()I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation",
        "name": "annotation",
        "descriptor": "()Ljava/lang/classfile/Annotation;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Annotation",
        "name": "classSymbol",
        "descriptor": "()Ljava/lang/constant/ClassDesc;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "bipush",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "ireturn",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  },
  "original": {
    "method": "original",
    "descriptor": "(Ljava/lang/classfile/ClassFile;)Ljava/lang/classfile/ClassModel;",
    "requiredOpcodes": [
      "aload_0",
      "ldc",
      "invokestatic",
      "invokeinterface",
      "areturn"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "parse",
        "descriptor": "([B)Ljava/lang/classfile/ClassModel;"
      }
    ]
  },
  "field": {
    "method": "field",
    "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/String;)Ljava/lang/classfile/FieldModel;",
    "requiredOpcodes": [
      "aload_0",
      "invokeinterface",
      "astore_2",
      "aload_2",
      "ifeq",
      "checkcast",
      "astore_3",
      "aload_3",
      "aload_1",
      "areturn",
      "goto",
      "new",
      "dup",
      "invokespecial",
      "athrow"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassModel",
        "name": "fields",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.FieldModel",
        "name": "fieldName",
        "descriptor": "()Ljava/lang/classfile/constantpool/Utf8Entry;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.Utf8Entry",
        "name": "equalsString",
        "descriptor": "(Ljava/lang/String;)Z"
      }
    ]
  },
  "visible": {
    "method": "visible",
    "descriptor": "(Ljava/lang/classfile/AttributedElement;)Ljava/util/List;",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "invokeinterface",
      "invokevirtual",
      "checkcast",
      "areturn"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "runtimeVisibleTypeAnnotations",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.AttributedElement",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RuntimeVisibleTypeAnnotationsAttribute",
        "name": "annotations",
        "descriptor": "()Ljava/util/List;"
      }
    ]
  },
  "invisible": {
    "method": "invisible",
    "descriptor": "(Ljava/lang/classfile/AttributedElement;)Ljava/util/List;",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "invokeinterface",
      "invokevirtual",
      "checkcast",
      "areturn"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "runtimeInvisibleTypeAnnotations",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.AttributedElement",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RuntimeInvisibleTypeAnnotationsAttribute",
        "name": "annotations",
        "descriptor": "()Ljava/util/List;"
      }
    ]
  },
  "count": {
    "method": "count",
    "descriptor": "(Ljava/util/List;Ljava/lang/classfile/TypeAnnotation$TargetType;)I",
    "requiredOpcodes": [
      "iconst_0",
      "istore_2",
      "aload_0",
      "invokeinterface",
      "astore_3",
      "aload_3",
      "ifeq",
      "checkcast",
      "astore",
      "aload",
      "aload_1",
      "if_acmpne",
      "iinc",
      "goto",
      "iload_2",
      "ireturn"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation",
        "name": "targetInfo",
        "descriptor": "()Ljava/lang/classfile/TypeAnnotation$TargetInfo;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "targetType",
        "descriptor": "()Ljava/lang/classfile/TypeAnnotation$TargetType;"
      }
    ]
  },
  "path": {
    "method": "path",
    "descriptor": "(Ljava/util/List;Ljava/lang/classfile/TypeAnnotation$TypePathComponent$Kind;)Z",
    "requiredOpcodes": [
      "aload_0",
      "invokeinterface",
      "astore_2",
      "aload_2",
      "ifeq",
      "checkcast",
      "astore_3",
      "aload_3",
      "astore",
      "aload",
      "aload_1",
      "if_acmpne",
      "iconst_1",
      "ireturn",
      "goto",
      "iconst_0"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation",
        "name": "targetPath",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TypePathComponent",
        "name": "typePathKind",
        "descriptor": "()Ljava/lang/classfile/TypeAnnotation$TypePathComponent$Kind;"
      }
    ]
  },
  "method": {
    "method": "method",
    "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/String;)Ljava/lang/classfile/MethodModel;",
    "requiredOpcodes": [
      "aload_0",
      "invokeinterface",
      "astore_2",
      "aload_2",
      "ifeq",
      "checkcast",
      "astore_3",
      "aload_3",
      "aload_1",
      "areturn",
      "goto",
      "new",
      "dup",
      "invokespecial",
      "athrow"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassModel",
        "name": "methods",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodModel",
        "name": "methodName",
        "descriptor": "()Ljava/lang/classfile/constantpool/Utf8Entry;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.Utf8Entry",
        "name": "equalsString",
        "descriptor": "(Ljava/lang/String;)Z"
      }
    ]
  },
  "position": {
    "method": "position",
    "descriptor": "(Ljava/lang/classfile/CodeModel;Ljava/lang/classfile/Label;)I",
    "requiredOpcodes": [
      "iconst_0",
      "istore_2",
      "aload_0",
      "invokeinterface",
      "astore_3",
      "aload_3",
      "ifeq",
      "checkcast",
      "astore",
      "aload",
      "instanceof",
      "aload_1",
      "if_acmpne",
      "iload_2",
      "ireturn",
      "iadd",
      "goto",
      "new",
      "dup",
      "ldc",
      "invokespecial",
      "athrow"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeModel",
        "name": "iterator",
        "descriptor": "()Ljava/util/Iterator;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.instruction.LabelTarget",
        "name": "label",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Instruction",
        "name": "sizeInBytes",
        "descriptor": "()I"
      }
    ]
  },
  "relocateClass": {
    "method": "relocateClass",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;Ljava/lang/classfile/ClassElement;)V",
    "requiredOpcodes": [
      "iconst_0",
      "istore_2",
      "iload_2",
      "sipush",
      "if_icmpge",
      "aload_0",
      "invokeinterface",
      "invokedynamic",
      "pop",
      "iinc",
      "goto",
      "aload_1",
      "instanceof",
      "ifeq",
      "ldc_w",
      "invokestatic",
      "checkcast",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "constantPool",
        "descriptor": "()Ljava/lang/classfile/constantpool/ConstantPoolBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.ConstantPoolBuilder",
        "name": "stringEntry",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/classfile/constantpool/StringEntry;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodModel",
        "name": "methodName",
        "descriptor": "()Ljava/lang/classfile/constantpool/Utf8Entry;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.Utf8Entry",
        "name": "stringValue",
        "descriptor": "()Ljava/lang/String;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.CodeTransform",
        "name": "ofStateful",
        "descriptor": "(Ljava/util/function/Supplier;)Ljava/lang/classfile/CodeTransform;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.MethodTransform",
        "name": "transformingCode",
        "descriptor": "(Ljava/lang/classfile/CodeTransform;)Ljava/lang/classfile/MethodTransform;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "transformMethod",
        "descriptor": "(Ljava/lang/classfile/MethodModel;Ljava/lang/classfile/MethodTransform;)Ljava/lang/classfile/ClassBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      }
    ]
  },
  "relocator": {
    "method": "relocator",
    "descriptor": "()Ljava/lang/classfile/CodeTransform;",
    "requiredOpcodes": [
      "new",
      "dup",
      "invokespecial",
      "areturn"
    ]
  },
  "Relocator.atStart": {
    "className": "classes.modern_test.ClassFileTypeAnnotationsFinal$Relocator",
    "method": "atStart",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "return"
    ]
  },
  "Relocator.accept": {
    "className": "classes.modern_test.ClassFileTypeAnnotationsFinal$Relocator",
    "method": "accept",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;Ljava/lang/classfile/CodeElement;)V",
    "requiredOpcodes": [
      "aload_0",
      "getfield",
      "aload_2",
      "invokeinterface",
      "pop",
      "return"
    ]
  },
  "Relocator.atEnd": {
    "className": "classes.modern_test.ClassFileTypeAnnotationsFinal$Relocator",
    "method": "atEnd",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "iconst_0",
      "istore_2",
      "aload_0",
      "getfield",
      "invokeinterface",
      "astore_3",
      "aload_3",
      "ifeq",
      "checkcast",
      "astore",
      "aload",
      "instanceof",
      "iconst_1",
      "goto",
      "aconst_null",
      "iload_2",
      "aload_1",
      "getstatic",
      "pop",
      "new",
      "dup",
      "invokespecial",
      "istore",
      "invokevirtual",
      "iload",
      "iadd",
      "putstatic",
      "invokestatic",
      "ifne",
      "ldc",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RuntimeVisibleTypeAnnotationsAttribute",
        "name": "annotations",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation",
        "name": "targetInfo",
        "descriptor": "()Ljava/lang/classfile/TypeAnnotation$TargetInfo;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "newLabel",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "labelBinding",
        "descriptor": "(Ljava/lang/classfile/Label;)Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "nop",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "exceptionCatch",
        "descriptor": "(Ljava/lang/classfile/Label;Ljava/lang/classfile/Label;Ljava/lang/classfile/Label;Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.instruction.LabelTarget",
        "name": "label",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "IRETURN",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "LRETURN",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "FRETURN",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "DRETURN",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "ARETURN",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "RETURN",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "ATHROW",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "GOTO",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "GOTO_W",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Instruction",
        "name": "opcode",
        "descriptor": "()Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$CatchTarget",
        "name": "exceptionTableIndex",
        "descriptor": "()I"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TargetInfo",
        "name": "ofExceptionParameter",
        "descriptor": "(I)Ljava/lang/classfile/TypeAnnotation$CatchTarget;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation",
        "name": "targetPath",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation",
        "name": "annotation",
        "descriptor": "()Ljava/lang/classfile/Annotation;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/TypeAnnotation$TargetInfo;Ljava/util/List;Ljava/lang/classfile/Annotation;)Ljava/lang/classfile/TypeAnnotation;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RuntimeVisibleTypeAnnotationsAttribute",
        "name": "of",
        "descriptor": "(Ljava/util/List;)Ljava/lang/classfile/attribute/RuntimeVisibleTypeAnnotationsAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "pop",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "ldc",
        "descriptor": "(Ljava/lang/constant/ConstantDesc;)Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "areturn",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  }
});
export default group("classfile-declarations-type-annotations","ClassFileTypeAnnotationsFinal","CLASSFILE_TYPE_ANNOTATIONS_OK",["ClassFileTypeAnnotationsFinal$Relocator","D4Resource","D4TypeInvisible","D4TypeOuter$Inner","D4TypeOuter","D4TypeTarget","D4TypeVisible"],[
  entry("cf-type-target-models","caseModels","TargetInfo=all22-target-kinds;TypePath=ARRAY/INNER/WILDCARD/argument2;typed-getters=real;value=22;verify=empty;defined/invoked=same-bytes",[callbacks["buildModels"],callbacks["codeModels"]],[
  {
    "id": "type-models",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dTypeModels",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [],
    "methods": [
      {
        "name": "value",
        "descriptor": "()I",
        "flags": 9,
        "opcodes": [
          "bipush",
          "ireturn"
        ]
      }
    ],
    "sourceFile": null,
    "branches": false,
    "handlers": false
  }
],[
  {
    "method": "caseModels",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "ldc_w",
      "invokedynamic",
      "invokeinterface",
      "astore_1",
      "aload_1",
      "astore_2",
      "aload_2",
      "invokevirtual",
      "astore_3",
      "aload_3",
      "ldc",
      "getstatic",
      "astore",
      "aload",
      "bipush",
      "if_icmpne",
      "iconst_1",
      "goto",
      "iconst_0",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "of",
        "descriptor": "()Ljava/lang/classfile/ClassFile;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "build",
        "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "verify",
        "descriptor": "([B)Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "check",
        "descriptor": "(Z)V"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "artifact",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles",
        "name": "lookup",
        "descriptor": "()Ljava/lang/invoke/MethodHandles$Lookup;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "defineClass",
        "descriptor": "([B)Ljava/lang/Class;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodType",
        "name": "methodType",
        "descriptor": "(Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "findStatic",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandle",
        "name": "invokeExact",
        "descriptor": "()I"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "emit",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
      }
    ]
  }
]),
  entry("cf-type-field-paths","caseFields","genuine-field-targets=array/wildcard/inner/type-argument;visible/invisible-type-paths=typed;value=101;verify=empty;defined/invoked=same-bytes",[callbacks["original"],callbacks["field"],callbacks["visible"],callbacks["invisible"],callbacks["count"],callbacks["path"]],[
  {
    "id": "type-fields",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dTypeFields",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "definition": "define-and-invoke",
    "interfaces": [
      "java.io.Serializable"
    ],
    "fields": [
      {
        "name": "array",
        "descriptor": "[Ljava/lang/String;",
        "flags": 1
      },
      {
        "name": "wild",
        "descriptor": "Ljava/util/List;",
        "flags": 1
      },
      {
        "name": "inner",
        "descriptor": "Lclasses/modern_test/D4TypeOuter$Inner;",
        "flags": 1
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "()V",
        "flags": 0,
        "opcodes": [
          "aload_0",
          "invokespecial",
          "return"
        ]
      },
      {
        "name": "returner",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/String;",
        "flags": 1,
        "opcodes": [
          "aload_1",
          "areturn"
        ]
      },
      {
        "name": "receiver",
        "descriptor": "()V",
        "flags": 1,
        "opcodes": [
          "return"
        ]
      },
      {
        "name": "generic",
        "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "areturn"
        ]
      },
      {
        "name": "value",
        "descriptor": "(I)I",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ireturn"
        ]
      },
      {
        "name": "cast",
        "descriptor": "(Ljava/lang/Object;)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "checkcast",
          "astore_1",
          "aload_1",
          "areturn"
        ]
      },
      {
        "name": "checkType",
        "descriptor": "(Ljava/lang/Object;)Z",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "instanceof",
          "ireturn"
        ]
      },
      {
        "name": "make",
        "descriptor": "()Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "new",
          "dup",
          "ldc",
          "invokespecial",
          "areturn"
        ]
      },
      {
        "name": "caught",
        "descriptor": "(I)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ifne",
          "new",
          "dup",
          "invokespecial",
          "athrow",
          "ldc",
          "areturn",
          "astore_1",
          "ldc",
          "areturn"
        ]
      },
      {
        "name": "resource",
        "descriptor": "()I",
        "flags": 9,
        "opcodes": [
          "new",
          "dup",
          "invokespecial",
          "astore_0",
          "bipush",
          "istore_1",
          "aload_0",
          "invokevirtual",
          "iload_1",
          "ireturn",
          "astore_1",
          "aload_0",
          "invokevirtual",
          "goto",
          "astore_2",
          "aload_1",
          "aload_2",
          "invokevirtual",
          "aload_1",
          "athrow"
        ]
      }
    ],
    "sourceFile": "ClassFileTypeAnnotationsFinal.java",
    "branches": true,
    "handlers": true
  }
],[
  {
    "method": "caseFields",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "ldc_w",
      "getstatic",
      "invokeinterface",
      "astore_1",
      "aload_1",
      "astore_2",
      "aload_2",
      "iconst_1",
      "if_icmpne",
      "ifeq",
      "goto",
      "iconst_0",
      "astore_3",
      "aload_3",
      "invokevirtual",
      "astore",
      "aload",
      "ldc",
      "bipush",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "of",
        "descriptor": "()Ljava/lang/classfile/ClassFile;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.ClassTransform",
        "name": "ACCEPT_ALL",
        "descriptor": "Ljava/lang/classfile/ClassTransform;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "transformClass",
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/constant/ClassDesc;Ljava/lang/classfile/ClassTransform;)[B"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "parse",
        "descriptor": "([B)Ljava/lang/classfile/ClassModel;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "FIELD",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TypePathComponent$Kind",
        "name": "ARRAY",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TypePathComponent$Kind;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "check",
        "descriptor": "(Z)V"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TypePathComponent$Kind",
        "name": "WILDCARD",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TypePathComponent$Kind;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TypePathComponent$Kind",
        "name": "INNER_TYPE",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TypePathComponent$Kind;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "verify",
        "descriptor": "([B)Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "artifact",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles",
        "name": "lookup",
        "descriptor": "()Ljava/lang/invoke/MethodHandles$Lookup;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "defineClass",
        "descriptor": "([B)Ljava/lang/Class;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodType",
        "name": "methodType",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "findStatic",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandle",
        "name": "invokeExact",
        "descriptor": "(I)I"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "emit",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
      }
    ]
  }
]),
  entry("cf-type-method-targets","caseMethods","genuine-method-targets=return/formal/throws/receiver/type-parameter/bound;value=103;verify=empty;defined/invoked=same-bytes",[callbacks["original"],callbacks["method"],callbacks["visible"],callbacks["invisible"],callbacks["count"]],[
  {
    "id": "type-methods",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dTypeMethods",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "definition": "define-and-invoke",
    "interfaces": [
      "java.io.Serializable"
    ],
    "fields": [
      {
        "name": "array",
        "descriptor": "[Ljava/lang/String;",
        "flags": 1
      },
      {
        "name": "wild",
        "descriptor": "Ljava/util/List;",
        "flags": 1
      },
      {
        "name": "inner",
        "descriptor": "Lclasses/modern_test/D4TypeOuter$Inner;",
        "flags": 1
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "()V",
        "flags": 0,
        "opcodes": [
          "aload_0",
          "invokespecial",
          "return"
        ]
      },
      {
        "name": "returner",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/String;",
        "flags": 1,
        "opcodes": [
          "aload_1",
          "areturn"
        ]
      },
      {
        "name": "receiver",
        "descriptor": "()V",
        "flags": 1,
        "opcodes": [
          "return"
        ]
      },
      {
        "name": "generic",
        "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "areturn"
        ]
      },
      {
        "name": "value",
        "descriptor": "(I)I",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ireturn"
        ]
      },
      {
        "name": "cast",
        "descriptor": "(Ljava/lang/Object;)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "checkcast",
          "astore_1",
          "aload_1",
          "areturn"
        ]
      },
      {
        "name": "checkType",
        "descriptor": "(Ljava/lang/Object;)Z",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "instanceof",
          "ireturn"
        ]
      },
      {
        "name": "make",
        "descriptor": "()Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "new",
          "dup",
          "ldc",
          "invokespecial",
          "areturn"
        ]
      },
      {
        "name": "caught",
        "descriptor": "(I)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ifne",
          "new",
          "dup",
          "invokespecial",
          "athrow",
          "ldc",
          "areturn",
          "astore_1",
          "ldc",
          "areturn"
        ]
      },
      {
        "name": "resource",
        "descriptor": "()I",
        "flags": 9,
        "opcodes": [
          "new",
          "dup",
          "invokespecial",
          "astore_0",
          "bipush",
          "istore_1",
          "aload_0",
          "invokevirtual",
          "iload_1",
          "ireturn",
          "astore_1",
          "aload_0",
          "invokevirtual",
          "goto",
          "astore_2",
          "aload_1",
          "aload_2",
          "invokevirtual",
          "aload_1",
          "athrow"
        ]
      }
    ],
    "sourceFile": "ClassFileTypeAnnotationsFinal.java",
    "branches": true,
    "handlers": true
  }
],[
  {
    "method": "caseMethods",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "ldc_w",
      "getstatic",
      "invokeinterface",
      "astore_1",
      "aload_1",
      "astore_2",
      "aload_2",
      "iconst_1",
      "if_icmpne",
      "goto",
      "iconst_0",
      "ifeq",
      "astore_3",
      "aload_3",
      "invokevirtual",
      "astore",
      "aload",
      "ldc",
      "bipush",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "of",
        "descriptor": "()Ljava/lang/classfile/ClassFile;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.ClassTransform",
        "name": "ACCEPT_ALL",
        "descriptor": "Ljava/lang/classfile/ClassTransform;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "transformClass",
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/constant/ClassDesc;Ljava/lang/classfile/ClassTransform;)[B"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "parse",
        "descriptor": "([B)Ljava/lang/classfile/ClassModel;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "METHOD_RETURN",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "METHOD_FORMAL_PARAMETER",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "THROWS",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "check",
        "descriptor": "(Z)V"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "METHOD_RECEIVER",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "METHOD_TYPE_PARAMETER",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "METHOD_TYPE_PARAMETER_BOUND",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "verify",
        "descriptor": "([B)Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "artifact",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles",
        "name": "lookup",
        "descriptor": "()Ljava/lang/invoke/MethodHandles$Lookup;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "defineClass",
        "descriptor": "([B)Ljava/lang/Class;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodType",
        "name": "methodType",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "findStatic",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandle",
        "name": "invokeExact",
        "descriptor": "(I)I"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "emit",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
      }
    ]
  }
]),
  entry("cf-type-class-targets","caseClass","genuine-class-targets=parameter/class-interface-bounds/super/interface;super-index=65535;value=107;verify=empty;defined/invoked=same-bytes",[callbacks["original"],callbacks["visible"],callbacks["invisible"],callbacks["count"]],[
  {
    "id": "type-class",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dTypeClass",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "definition": "define-and-invoke",
    "interfaces": [
      "java.io.Serializable"
    ],
    "fields": [
      {
        "name": "array",
        "descriptor": "[Ljava/lang/String;",
        "flags": 1
      },
      {
        "name": "wild",
        "descriptor": "Ljava/util/List;",
        "flags": 1
      },
      {
        "name": "inner",
        "descriptor": "Lclasses/modern_test/D4TypeOuter$Inner;",
        "flags": 1
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "()V",
        "flags": 0,
        "opcodes": [
          "aload_0",
          "invokespecial",
          "return"
        ]
      },
      {
        "name": "returner",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/String;",
        "flags": 1,
        "opcodes": [
          "aload_1",
          "areturn"
        ]
      },
      {
        "name": "receiver",
        "descriptor": "()V",
        "flags": 1,
        "opcodes": [
          "return"
        ]
      },
      {
        "name": "generic",
        "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "areturn"
        ]
      },
      {
        "name": "value",
        "descriptor": "(I)I",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ireturn"
        ]
      },
      {
        "name": "cast",
        "descriptor": "(Ljava/lang/Object;)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "checkcast",
          "astore_1",
          "aload_1",
          "areturn"
        ]
      },
      {
        "name": "checkType",
        "descriptor": "(Ljava/lang/Object;)Z",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "instanceof",
          "ireturn"
        ]
      },
      {
        "name": "make",
        "descriptor": "()Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "new",
          "dup",
          "ldc",
          "invokespecial",
          "areturn"
        ]
      },
      {
        "name": "caught",
        "descriptor": "(I)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ifne",
          "new",
          "dup",
          "invokespecial",
          "athrow",
          "ldc",
          "areturn",
          "astore_1",
          "ldc",
          "areturn"
        ]
      },
      {
        "name": "resource",
        "descriptor": "()I",
        "flags": 9,
        "opcodes": [
          "new",
          "dup",
          "invokespecial",
          "astore_0",
          "bipush",
          "istore_1",
          "aload_0",
          "invokevirtual",
          "iload_1",
          "ireturn",
          "astore_1",
          "aload_0",
          "invokevirtual",
          "goto",
          "astore_2",
          "aload_1",
          "aload_2",
          "invokevirtual",
          "aload_1",
          "athrow"
        ]
      }
    ],
    "sourceFile": "ClassFileTypeAnnotationsFinal.java",
    "branches": true,
    "handlers": true
  }
],[
  {
    "method": "caseClass",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "ldc_w",
      "getstatic",
      "invokeinterface",
      "astore_1",
      "aload_1",
      "astore_2",
      "aload_2",
      "iconst_1",
      "if_icmpne",
      "ifeq",
      "goto",
      "iconst_0",
      "astore_3",
      "aload_3",
      "invokevirtual",
      "astore",
      "aload",
      "ldc",
      "bipush",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "of",
        "descriptor": "()Ljava/lang/classfile/ClassFile;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.ClassTransform",
        "name": "ACCEPT_ALL",
        "descriptor": "Ljava/lang/classfile/ClassTransform;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "transformClass",
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/constant/ClassDesc;Ljava/lang/classfile/ClassTransform;)[B"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "parse",
        "descriptor": "([B)Ljava/lang/classfile/ClassModel;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "CLASS_TYPE_PARAMETER",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "CLASS_TYPE_PARAMETER_BOUND",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "CLASS_EXTENDS",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "verify",
        "descriptor": "([B)Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "check",
        "descriptor": "(Z)V"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "artifact",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles",
        "name": "lookup",
        "descriptor": "()Ljava/lang/invoke/MethodHandles$Lookup;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "defineClass",
        "descriptor": "([B)Ljava/lang/Class;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodType",
        "name": "methodType",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "findStatic",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandle",
        "name": "invokeExact",
        "descriptor": "(I)I"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "emit",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
      }
    ]
  }
]),
  entry("cf-type-code-locals","caseLocals","genuine-Code-local/resource-targets=registered-label-ranges;slot1=real;visible/invisible=preserved;value=local;verify=empty;defined/invoked=same-bytes",[callbacks["original"],callbacks["method"],callbacks["visible"],callbacks["invisible"],callbacks["count"],callbacks["position"]],[
  {
    "id": "type-locals",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dTypeLocals",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "definition": "define-and-invoke",
    "interfaces": [
      "java.io.Serializable"
    ],
    "fields": [
      {
        "name": "array",
        "descriptor": "[Ljava/lang/String;",
        "flags": 1
      },
      {
        "name": "wild",
        "descriptor": "Ljava/util/List;",
        "flags": 1
      },
      {
        "name": "inner",
        "descriptor": "Lclasses/modern_test/D4TypeOuter$Inner;",
        "flags": 1
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "()V",
        "flags": 0,
        "opcodes": [
          "aload_0",
          "invokespecial",
          "return"
        ]
      },
      {
        "name": "returner",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/String;",
        "flags": 1,
        "opcodes": [
          "aload_1",
          "areturn"
        ]
      },
      {
        "name": "receiver",
        "descriptor": "()V",
        "flags": 1,
        "opcodes": [
          "return"
        ]
      },
      {
        "name": "generic",
        "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "areturn"
        ]
      },
      {
        "name": "value",
        "descriptor": "(I)I",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ireturn"
        ]
      },
      {
        "name": "cast",
        "descriptor": "(Ljava/lang/Object;)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "checkcast",
          "astore_1",
          "aload_1",
          "areturn"
        ]
      },
      {
        "name": "checkType",
        "descriptor": "(Ljava/lang/Object;)Z",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "instanceof",
          "ireturn"
        ]
      },
      {
        "name": "make",
        "descriptor": "()Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "new",
          "dup",
          "ldc",
          "invokespecial",
          "areturn"
        ]
      },
      {
        "name": "caught",
        "descriptor": "(I)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ifne",
          "new",
          "dup",
          "invokespecial",
          "athrow",
          "ldc",
          "areturn",
          "astore_1",
          "ldc",
          "areturn"
        ]
      },
      {
        "name": "resource",
        "descriptor": "()I",
        "flags": 9,
        "opcodes": [
          "new",
          "dup",
          "invokespecial",
          "astore_0",
          "bipush",
          "istore_1",
          "aload_0",
          "invokevirtual",
          "iload_1",
          "ireturn",
          "astore_1",
          "aload_0",
          "invokevirtual",
          "goto",
          "astore_2",
          "aload_1",
          "aload_2",
          "invokevirtual",
          "aload_1",
          "athrow"
        ]
      }
    ],
    "sourceFile": "ClassFileTypeAnnotationsFinal.java",
    "branches": true,
    "handlers": true
  }
],[
  {
    "method": "caseLocals",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "ldc_w",
      "getstatic",
      "invokeinterface",
      "astore_1",
      "aload_1",
      "astore_2",
      "aload_2",
      "invokevirtual",
      "checkcast",
      "astore_3",
      "astore",
      "aload_3",
      "iconst_1",
      "if_icmpne",
      "aload",
      "goto",
      "iconst_0",
      "ifeq",
      "instanceof",
      "if_icmpge",
      "ldc",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "of",
        "descriptor": "()Ljava/lang/classfile/ClassFile;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.ClassTransform",
        "name": "ACCEPT_ALL",
        "descriptor": "Ljava/lang/classfile/ClassTransform;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "transformClass",
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/constant/ClassDesc;Ljava/lang/classfile/ClassTransform;)[B"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "parse",
        "descriptor": "([B)Ljava/lang/classfile/ClassModel;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodModel",
        "name": "code",
        "descriptor": "()Ljava/util/Optional;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "LOCAL_VARIABLE",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "RESOURCE_VARIABLE",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "check",
        "descriptor": "(Z)V"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation",
        "name": "targetInfo",
        "descriptor": "()Ljava/lang/classfile/TypeAnnotation$TargetInfo;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$LocalVarTarget",
        "name": "table",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$LocalVarTargetInfo",
        "name": "index",
        "descriptor": "()I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$LocalVarTargetInfo",
        "name": "startLabel",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$LocalVarTargetInfo",
        "name": "endLabel",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "verify",
        "descriptor": "([B)Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "artifact",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles",
        "name": "lookup",
        "descriptor": "()Ljava/lang/invoke/MethodHandles$Lookup;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "defineClass",
        "descriptor": "([B)Ljava/lang/Class;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodType",
        "name": "methodType",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "findStatic",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandle",
        "name": "invokeExact",
        "descriptor": "(Ljava/lang/Object;)Ljava/lang/String;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "emit",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
      }
    ]
  }
]),
  entry("cf-type-code-offsets-catch","caseOffsets","genuine-Code-targets=instanceof/new/cast/catch;exception-table-index=0;values=caught/ok;verify=empty;defined/invoked=same-bytes",[callbacks["original"],callbacks["method"],callbacks["visible"],callbacks["count"]],[
  {
    "id": "type-offsets",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dTypeOffsets",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "definition": "define-and-invoke",
    "interfaces": [
      "java.io.Serializable"
    ],
    "fields": [
      {
        "name": "array",
        "descriptor": "[Ljava/lang/String;",
        "flags": 1
      },
      {
        "name": "wild",
        "descriptor": "Ljava/util/List;",
        "flags": 1
      },
      {
        "name": "inner",
        "descriptor": "Lclasses/modern_test/D4TypeOuter$Inner;",
        "flags": 1
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "()V",
        "flags": 0,
        "opcodes": [
          "aload_0",
          "invokespecial",
          "return"
        ]
      },
      {
        "name": "returner",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/String;",
        "flags": 1,
        "opcodes": [
          "aload_1",
          "areturn"
        ]
      },
      {
        "name": "receiver",
        "descriptor": "()V",
        "flags": 1,
        "opcodes": [
          "return"
        ]
      },
      {
        "name": "generic",
        "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "areturn"
        ]
      },
      {
        "name": "value",
        "descriptor": "(I)I",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ireturn"
        ]
      },
      {
        "name": "cast",
        "descriptor": "(Ljava/lang/Object;)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "checkcast",
          "astore_1",
          "aload_1",
          "areturn"
        ]
      },
      {
        "name": "checkType",
        "descriptor": "(Ljava/lang/Object;)Z",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "instanceof",
          "ireturn"
        ]
      },
      {
        "name": "make",
        "descriptor": "()Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "new",
          "dup",
          "ldc",
          "invokespecial",
          "areturn"
        ]
      },
      {
        "name": "caught",
        "descriptor": "(I)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ifne",
          "new",
          "dup",
          "invokespecial",
          "athrow",
          "ldc",
          "areturn",
          "astore_1",
          "ldc",
          "areturn"
        ]
      },
      {
        "name": "resource",
        "descriptor": "()I",
        "flags": 9,
        "opcodes": [
          "new",
          "dup",
          "invokespecial",
          "astore_0",
          "bipush",
          "istore_1",
          "aload_0",
          "invokevirtual",
          "iload_1",
          "ireturn",
          "astore_1",
          "aload_0",
          "invokevirtual",
          "goto",
          "astore_2",
          "aload_1",
          "aload_2",
          "invokevirtual",
          "aload_1",
          "athrow"
        ]
      }
    ],
    "sourceFile": "ClassFileTypeAnnotationsFinal.java",
    "branches": true,
    "handlers": true
  }
],[
  {
    "method": "caseOffsets",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "ldc_w",
      "getstatic",
      "invokeinterface",
      "astore_1",
      "aload_1",
      "astore_2",
      "aload_2",
      "invokevirtual",
      "checkcast",
      "iconst_1",
      "if_icmpne",
      "goto",
      "iconst_0",
      "astore_3",
      "aload_3",
      "astore",
      "aload",
      "ifeq",
      "instanceof",
      "ifne",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "of",
        "descriptor": "()Ljava/lang/classfile/ClassFile;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.ClassTransform",
        "name": "ACCEPT_ALL",
        "descriptor": "Ljava/lang/classfile/ClassTransform;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "transformClass",
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/constant/ClassDesc;Ljava/lang/classfile/ClassTransform;)[B"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "parse",
        "descriptor": "([B)Ljava/lang/classfile/ClassModel;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodModel",
        "name": "code",
        "descriptor": "()Ljava/util/Optional;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "INSTANCEOF",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "NEW",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "CAST",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "check",
        "descriptor": "(Z)V"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeAnnotation$TargetType",
        "name": "EXCEPTION_PARAMETER",
        "descriptor": "Ljava/lang/classfile/TypeAnnotation$TargetType;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeModel",
        "name": "exceptionHandlers",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation",
        "name": "targetInfo",
        "descriptor": "()Ljava/lang/classfile/TypeAnnotation$TargetInfo;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$CatchTarget",
        "name": "exceptionTableIndex",
        "descriptor": "()I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "verify",
        "descriptor": "([B)Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "artifact",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles",
        "name": "lookup",
        "descriptor": "()Ljava/lang/invoke/MethodHandles$Lookup;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "defineClass",
        "descriptor": "([B)Ljava/lang/Class;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodType",
        "name": "methodType",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "findStatic",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandle",
        "name": "invokeExact",
        "descriptor": "(I)Ljava/lang/String;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "emit",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
      }
    ]
  }
]),
  entry("cf-type-code-relocation","caseRelocation","NEW_POOL=300-string-prefill;CAST/NEW/INSTANCEOF-labels=shifted-to-real-opcodes;local/resource-ranges=shifted;UTF/type-paths=actual-remapping;catch-index=0-to1;LDC_W=real;values=caught/ok;verify=empty;defined/invoked=same-bytes",[callbacks["original"],callbacks["method"],callbacks["visible"],callbacks["position"],callbacks["relocateClass"],callbacks["relocator"],callbacks["Relocator.atStart"],callbacks["Relocator.accept"],callbacks["Relocator.atEnd"]],[
  {
    "id": "type-relocated",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dTypeRelocated",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "definition": "define-and-invoke",
    "interfaces": [
      "java.io.Serializable"
    ],
    "fields": [
      {
        "name": "array",
        "descriptor": "[Ljava/lang/String;",
        "flags": 1
      },
      {
        "name": "wild",
        "descriptor": "Ljava/util/List;",
        "flags": 1
      },
      {
        "name": "inner",
        "descriptor": "Lclasses/modern_test/D4TypeOuter$Inner;",
        "flags": 1
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "()V",
        "flags": 0,
        "opcodes": [
          "aload_0",
          "invokespecial",
          "return"
        ]
      },
      {
        "name": "returner",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/String;",
        "flags": 1,
        "opcodes": [
          "aload_1",
          "areturn"
        ]
      },
      {
        "name": "receiver",
        "descriptor": "()V",
        "flags": 1,
        "opcodes": [
          "return"
        ]
      },
      {
        "name": "generic",
        "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "areturn"
        ]
      },
      {
        "name": "value",
        "descriptor": "(I)I",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ireturn"
        ]
      },
      {
        "name": "cast",
        "descriptor": "(Ljava/lang/Object;)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "nop",
          "aload_0",
          "nop",
          "checkcast",
          "nop",
          "astore_1",
          "nop",
          "aload_1",
          "nop",
          "areturn"
        ]
      },
      {
        "name": "checkType",
        "descriptor": "(Ljava/lang/Object;)Z",
        "flags": 9,
        "opcodes": [
          "nop",
          "aload_0",
          "nop",
          "instanceof",
          "nop",
          "ireturn"
        ]
      },
      {
        "name": "make",
        "descriptor": "()Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "nop",
          "new",
          "nop",
          "dup",
          "nop",
          "ldc_w",
          "nop",
          "invokespecial",
          "nop",
          "areturn"
        ]
      },
      {
        "name": "caught",
        "descriptor": "(I)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "nop",
          "nop",
          "iload_0",
          "nop",
          "ifne",
          "nop",
          "new",
          "nop",
          "dup",
          "nop",
          "invokespecial",
          "nop",
          "athrow",
          "ldc_w",
          "nop",
          "areturn",
          "astore_1",
          "nop",
          "ldc_w",
          "nop",
          "areturn",
          "pop",
          "ldc_w",
          "areturn"
        ]
      },
      {
        "name": "resource",
        "descriptor": "()I",
        "flags": 9,
        "opcodes": [
          "nop",
          "new",
          "nop",
          "dup",
          "nop",
          "invokespecial",
          "nop",
          "astore_0",
          "nop",
          "bipush",
          "nop",
          "istore_1",
          "nop",
          "aload_0",
          "nop",
          "invokevirtual",
          "nop",
          "iload_1",
          "nop",
          "ireturn",
          "astore_1",
          "nop",
          "aload_0",
          "nop",
          "invokevirtual",
          "nop",
          "goto",
          "astore_2",
          "nop",
          "aload_1",
          "nop",
          "aload_2",
          "nop",
          "invokevirtual",
          "nop",
          "aload_1",
          "nop",
          "athrow"
        ]
      }
    ],
    "sourceFile": "ClassFileTypeAnnotationsFinal.java",
    "branches": true,
    "handlers": true
  }
],[
  {
    "method": "caseRelocation",
    "descriptor": "()V",
    "requiredOpcodes": [
      "iconst_1",
      "anewarray",
      "dup",
      "iconst_0",
      "getstatic",
      "aastore",
      "invokestatic",
      "astore_0",
      "aload_0",
      "astore_1",
      "putstatic",
      "aload_1",
      "ldc_w",
      "invokedynamic",
      "invokeinterface",
      "astore_2",
      "aload_2",
      "astore_3",
      "aload_3",
      "invokevirtual",
      "checkcast",
      "astore",
      "ifle",
      "aload",
      "iconst_2",
      "if_icmpne",
      "goto",
      "ifeq",
      "instanceof",
      "iconst_3",
      "istore",
      "iload",
      "arraylength",
      "if_icmpge",
      "aaload",
      "aconst_null",
      "if_icmple",
      "if_acmpne",
      "iadd",
      "iinc",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.ClassFile$ConstantPoolSharingOption",
        "name": "NEW_POOL",
        "descriptor": "Ljava/lang/classfile/ClassFile$ConstantPoolSharingOption;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "of",
        "descriptor": "([Ljava/lang/classfile/ClassFile$Option;)Ljava/lang/classfile/ClassFile;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "transformClass",
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/constant/ClassDesc;Ljava/lang/classfile/ClassTransform;)[B"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "parse",
        "descriptor": "([B)Ljava/lang/classfile/ClassModel;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodModel",
        "name": "code",
        "descriptor": "()Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeModel",
        "name": "exceptionHandlers",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "check",
        "descriptor": "(Z)V"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation",
        "name": "targetInfo",
        "descriptor": "()Ljava/lang/classfile/TypeAnnotation$TargetInfo;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$CatchTarget",
        "name": "exceptionTableIndex",
        "descriptor": "()I"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "CHECKCAST",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "INSTANCEOF",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "NEW",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$OffsetTarget",
        "name": "target",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$TypeArgumentTarget",
        "name": "target",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeModel",
        "name": "iterator",
        "descriptor": "()Ljava/util/Iterator;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Instruction",
        "name": "opcode",
        "descriptor": "()Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Instruction",
        "name": "sizeInBytes",
        "descriptor": "()I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$LocalVarTarget",
        "name": "table",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$LocalVarTargetInfo",
        "name": "startLabel",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$LocalVarTargetInfo",
        "name": "endLabel",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.TypeAnnotation$LocalVarTargetInfo",
        "name": "index",
        "descriptor": "()I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "verify",
        "descriptor": "([B)Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "artifact",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles",
        "name": "lookup",
        "descriptor": "()Ljava/lang/invoke/MethodHandles$Lookup;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "defineClass",
        "descriptor": "([B)Ljava/lang/Class;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodType",
        "name": "methodType",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "findStatic",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandle",
        "name": "invokeExact",
        "descriptor": "(I)Ljava/lang/String;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "emit",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
      }
    ]
  }
]),
  entry("cf-type-visible-invisible","caseVisibility","NEW_POOL=visible/invisible-type-tables-class/field/method/Code-preserved;complete-typed-payloads=real;value=109;verify=empty;defined/invoked=same-bytes",[callbacks["original"],callbacks["method"],callbacks["field"],callbacks["visible"],callbacks["invisible"]],[
  {
    "id": "type-visibility",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dTypeVisibility",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "definition": "define-and-invoke",
    "interfaces": [
      "java.io.Serializable"
    ],
    "fields": [
      {
        "name": "array",
        "descriptor": "[Ljava/lang/String;",
        "flags": 1
      },
      {
        "name": "wild",
        "descriptor": "Ljava/util/List;",
        "flags": 1
      },
      {
        "name": "inner",
        "descriptor": "Lclasses/modern_test/D4TypeOuter$Inner;",
        "flags": 1
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "()V",
        "flags": 0,
        "opcodes": [
          "aload_0",
          "invokespecial",
          "return"
        ]
      },
      {
        "name": "returner",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/String;",
        "flags": 1,
        "opcodes": [
          "aload_1",
          "areturn"
        ]
      },
      {
        "name": "receiver",
        "descriptor": "()V",
        "flags": 1,
        "opcodes": [
          "return"
        ]
      },
      {
        "name": "generic",
        "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "areturn"
        ]
      },
      {
        "name": "value",
        "descriptor": "(I)I",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ireturn"
        ]
      },
      {
        "name": "cast",
        "descriptor": "(Ljava/lang/Object;)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "checkcast",
          "astore_1",
          "aload_1",
          "areturn"
        ]
      },
      {
        "name": "checkType",
        "descriptor": "(Ljava/lang/Object;)Z",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "instanceof",
          "ireturn"
        ]
      },
      {
        "name": "make",
        "descriptor": "()Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "new",
          "dup",
          "ldc",
          "invokespecial",
          "areturn"
        ]
      },
      {
        "name": "caught",
        "descriptor": "(I)Ljava/lang/String;",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ifne",
          "new",
          "dup",
          "invokespecial",
          "athrow",
          "ldc",
          "areturn",
          "astore_1",
          "ldc",
          "areturn"
        ]
      },
      {
        "name": "resource",
        "descriptor": "()I",
        "flags": 9,
        "opcodes": [
          "new",
          "dup",
          "invokespecial",
          "astore_0",
          "bipush",
          "istore_1",
          "aload_0",
          "invokevirtual",
          "iload_1",
          "ireturn",
          "astore_1",
          "aload_0",
          "invokevirtual",
          "goto",
          "astore_2",
          "aload_1",
          "aload_2",
          "invokevirtual",
          "aload_1",
          "athrow"
        ]
      }
    ],
    "sourceFile": "ClassFileTypeAnnotationsFinal.java",
    "branches": true,
    "handlers": true
  }
],[
  {
    "method": "caseVisibility",
    "descriptor": "()V",
    "requiredOpcodes": [
      "iconst_1",
      "anewarray",
      "dup",
      "iconst_0",
      "getstatic",
      "aastore",
      "invokestatic",
      "astore_0",
      "aload_0",
      "ldc_w",
      "invokeinterface",
      "astore_1",
      "aload_1",
      "astore_2",
      "aload_2",
      "ifne",
      "invokevirtual",
      "checkcast",
      "ifeq",
      "goto",
      "astore_3",
      "aload_3",
      "astore",
      "aload",
      "ldc",
      "bipush",
      "if_icmpne",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.ClassFile$ConstantPoolSharingOption",
        "name": "NEW_POOL",
        "descriptor": "Ljava/lang/classfile/ClassFile$ConstantPoolSharingOption;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "of",
        "descriptor": "([Ljava/lang/classfile/ClassFile$Option;)Ljava/lang/classfile/ClassFile;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.ClassTransform",
        "name": "ACCEPT_ALL",
        "descriptor": "Ljava/lang/classfile/ClassTransform;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "transformClass",
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/constant/ClassDesc;Ljava/lang/classfile/ClassTransform;)[B"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "parse",
        "descriptor": "([B)Ljava/lang/classfile/ClassModel;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodModel",
        "name": "code",
        "descriptor": "()Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "verify",
        "descriptor": "([B)Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "check",
        "descriptor": "(Z)V"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "artifact",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles",
        "name": "lookup",
        "descriptor": "()Ljava/lang/invoke/MethodHandles$Lookup;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "defineClass",
        "descriptor": "([B)Ljava/lang/Class;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.invoke.MethodType",
        "name": "methodType",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "findStatic",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandle",
        "name": "invokeExact",
        "descriptor": "(I)I"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "emit",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
      }
    ]
  }
])
]);
