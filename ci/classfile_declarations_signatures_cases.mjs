import {entry,group,freeze} from './classfile_declarations_case_helpers.mjs';
// Independently frozen named original caller/typed-lifecycle obligations.
const callbacks=freeze({
  "ref": {
    "method": "ref",
    "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/Signature$RefTypeSig;",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "checkcast",
      "areturn"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.Signature",
        "name": "of",
        "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/Signature;"
      }
    ]
  },
  "methodSignature": {
    "method": "methodSignature",
    "descriptor": "()Ljava/lang/classfile/MethodSignature;",
    "requiredOpcodes": [
      "ldc",
      "invokestatic",
      "astore_0",
      "astore_1",
      "getstatic",
      "iconst_1",
      "anewarray",
      "dup",
      "iconst_0",
      "aastore",
      "aload_1",
      "aload_0",
      "iconst_2",
      "areturn"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.Signature$TypeVarSig",
        "name": "of",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/classfile/Signature$TypeVarSig;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.Signature$TypeParam",
        "name": "of",
        "descriptor": "(Ljava/lang/String;Ljava/lang/classfile/Signature$RefTypeSig;[Ljava/lang/classfile/Signature$RefTypeSig;)Ljava/lang/classfile/Signature$TypeParam;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.Signature",
        "name": "of",
        "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/Signature;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.MethodSignature",
        "name": "of",
        "descriptor": "(Ljava/util/List;Ljava/util/List;Ljava/lang/classfile/Signature;[Ljava/lang/classfile/Signature;)Ljava/lang/classfile/MethodSignature;"
      }
    ]
  },
  "buildMethod": {
    "method": "buildMethod",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "ldc",
      "getstatic",
      "iconst_2",
      "anewarray",
      "dup",
      "iconst_0",
      "aastore",
      "iconst_1",
      "bipush",
      "invokedynamic",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "withMethod",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;ILjava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "methodGeneric": {
    "method": "methodGeneric",
    "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "invokeinterface",
      "checkcast",
      "invokedynamic",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SignatureAttribute",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/MethodSignature;)Ljava/lang/classfile/attribute/SignatureAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodBuilder",
        "name": "withCode",
        "descriptor": "(Ljava/util/function/Consumer;)Ljava/lang/classfile/MethodBuilder;"
      }
    ]
  },
  "codeReference": {
    "method": "codeReference",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "iconst_0",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "aload",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "areturn",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  },
  "classSignature": {
    "method": "classSignature",
    "descriptor": "()Ljava/lang/classfile/ClassSignature;",
    "requiredOpcodes": [
      "ldc",
      "invokestatic",
      "iconst_1",
      "anewarray",
      "dup",
      "iconst_0",
      "aastore",
      "getstatic",
      "checkcast",
      "areturn"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.Signature$TypeParam",
        "name": "of",
        "descriptor": "(Ljava/lang/String;Ljava/util/Optional;[Ljava/lang/classfile/Signature$RefTypeSig;)Ljava/lang/classfile/Signature$TypeParam;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.Signature",
        "name": "of",
        "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/Signature;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassSignature",
        "name": "of",
        "descriptor": "(Ljava/util/List;Ljava/lang/classfile/Signature$ClassTypeSig;[Ljava/lang/classfile/Signature$ClassTypeSig;)Ljava/lang/classfile/ClassSignature;"
      }
    ]
  },
  "buildClass": {
    "method": "buildClass",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "iconst_1",
      "anewarray",
      "dup",
      "iconst_0",
      "getstatic",
      "aastore",
      "invokeinterface",
      "checkcast",
      "ldc",
      "bipush",
      "invokedynamic",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "withInterfaceSymbols",
        "descriptor": "([Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/ClassBuilder;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SignatureAttribute",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/ClassSignature;)Ljava/lang/classfile/attribute/SignatureAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
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
  "codeThirteen": {
    "method": "codeThirteen",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "bipush",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
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
  "allValues": {
    "method": "allValues",
    "descriptor": "()Ljava/lang/classfile/Annotation;",
    "requiredOpcodes": [
      "ldc",
      "invokestatic",
      "bipush",
      "anewarray",
      "dup",
      "iconst_0",
      "aastore",
      "iconst_1",
      "iconst_2",
      "ldc2_w",
      "iconst_3",
      "ldc_w",
      "iconst_4",
      "iconst_5",
      "sipush",
      "getstatic",
      "areturn"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "ofByte",
        "descriptor": "(Ljava/lang/String;B)Ljava/lang/classfile/AnnotationElement;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "ofChar",
        "descriptor": "(Ljava/lang/String;C)Ljava/lang/classfile/AnnotationElement;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "ofDouble",
        "descriptor": "(Ljava/lang/String;D)Ljava/lang/classfile/AnnotationElement;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "ofFloat",
        "descriptor": "(Ljava/lang/String;F)Ljava/lang/classfile/AnnotationElement;"
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
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "ofLong",
        "descriptor": "(Ljava/lang/String;J)Ljava/lang/classfile/AnnotationElement;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "ofShort",
        "descriptor": "(Ljava/lang/String;S)Ljava/lang/classfile/AnnotationElement;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "ofBoolean",
        "descriptor": "(Ljava/lang/String;Z)Ljava/lang/classfile/AnnotationElement;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "ofString",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/classfile/AnnotationElement;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "ofClass",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/AnnotationElement;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue",
        "name": "ofEnum",
        "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/lang/String;)Ljava/lang/classfile/AnnotationValue$OfEnum;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "of",
        "descriptor": "(Ljava/lang/String;Ljava/lang/classfile/AnnotationValue;)Ljava/lang/classfile/AnnotationElement;"
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
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "ofAnnotation",
        "descriptor": "(Ljava/lang/String;Ljava/lang/classfile/Annotation;)Ljava/lang/classfile/AnnotationElement;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue",
        "name": "ofInt",
        "descriptor": "(I)Ljava/lang/classfile/AnnotationValue$OfInt;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "ofArray",
        "descriptor": "(Ljava/lang/String;[Ljava/lang/classfile/AnnotationValue;)Ljava/lang/classfile/AnnotationElement;"
      }
    ]
  },
  "buildValues": {
    "method": "buildValues",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "iconst_1",
      "anewarray",
      "dup",
      "iconst_0",
      "aastore",
      "invokeinterface",
      "checkcast",
      "ldc",
      "getstatic",
      "bipush",
      "invokedynamic",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RuntimeVisibleAnnotationsAttribute",
        "name": "of",
        "descriptor": "([Ljava/lang/classfile/Annotation;)Ljava/lang/classfile/attribute/RuntimeVisibleAnnotationsAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
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
  "codeFive": {
    "method": "codeFive",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "iconst_5",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
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
  "copy": {
    "method": "copy",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;Ljava/lang/classfile/ClassElement;)V",
    "requiredOpcodes": [
      "aload_0",
      "aload_1",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      }
    ]
  },
  "visible": {
    "method": "visible",
    "descriptor": "(I)Ljava/lang/classfile/Annotation;",
    "requiredOpcodes": [
      "getstatic",
      "iconst_2",
      "anewarray",
      "dup",
      "iconst_0",
      "ldc",
      "iload_0",
      "invokestatic",
      "aastore",
      "iconst_1",
      "ldc_w",
      "areturn"
    ],
    "symbolicOperands": [
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
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "ofString",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/classfile/AnnotationElement;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.Annotation",
        "name": "of",
        "descriptor": "(Ljava/lang/constant/ClassDesc;[Ljava/lang/classfile/AnnotationElement;)Ljava/lang/classfile/Annotation;"
      }
    ]
  },
  "invisible": {
    "method": "invisible",
    "descriptor": "(I)Ljava/lang/classfile/Annotation;",
    "requiredOpcodes": [
      "getstatic",
      "iconst_1",
      "anewarray",
      "dup",
      "iconst_0",
      "ldc",
      "iload_0",
      "invokestatic",
      "aastore",
      "areturn"
    ],
    "symbolicOperands": [
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
      }
    ]
  },
  "buildParameters": {
    "method": "buildParameters",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "ldc",
      "getstatic",
      "iconst_2",
      "anewarray",
      "dup",
      "iconst_0",
      "aastore",
      "iconst_1",
      "bipush",
      "invokedynamic",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "withMethod",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;ILjava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "methodParameters": {
    "method": "methodParameters",
    "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "bipush",
      "invokestatic",
      "invokeinterface",
      "checkcast",
      "invokedynamic",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RuntimeVisibleParameterAnnotationsAttribute",
        "name": "of",
        "descriptor": "(Ljava/util/List;)Ljava/lang/classfile/attribute/RuntimeVisibleParameterAnnotationsAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RuntimeInvisibleParameterAnnotationsAttribute",
        "name": "of",
        "descriptor": "(Ljava/util/List;)Ljava/lang/classfile/attribute/RuntimeInvisibleParameterAnnotationsAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodBuilder",
        "name": "withCode",
        "descriptor": "(Ljava/util/function/Consumer;)Ljava/lang/classfile/MethodBuilder;"
      }
    ]
  },
  "codeInput": {
    "method": "codeInput",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "iconst_0",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "iload",
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
  "buildDefaults": {
    "method": "buildDefaults",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "sipush",
      "invokeinterface",
      "iconst_1",
      "anewarray",
      "dup",
      "iconst_0",
      "ldc_w",
      "invokestatic",
      "aastore",
      "pop",
      "getstatic",
      "invokedynamic",
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
        "name": "withInterfaceSymbols",
        "descriptor": "([Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/ClassBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "withMethod",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;ILjava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "defaultInt": {
    "method": "defaultInt",
    "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "bipush",
      "invokestatic",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue",
        "name": "ofInt",
        "descriptor": "(I)Ljava/lang/classfile/AnnotationValue$OfInt;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.AnnotationDefaultAttribute",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/AnnotationValue;)Ljava/lang/classfile/attribute/AnnotationDefaultAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      }
    ]
  },
  "defaultString": {
    "method": "defaultString",
    "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "ldc_w",
      "invokestatic",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue",
        "name": "ofString",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/classfile/AnnotationValue$OfString;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.AnnotationDefaultAttribute",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/AnnotationValue;)Ljava/lang/classfile/attribute/AnnotationDefaultAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      }
    ]
  },
  "defaultArray": {
    "method": "defaultArray",
    "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "iconst_2",
      "anewarray",
      "dup",
      "iconst_0",
      "invokestatic",
      "aastore",
      "iconst_1",
      "iconst_3",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue",
        "name": "ofInt",
        "descriptor": "(I)Ljava/lang/classfile/AnnotationValue$OfInt;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue",
        "name": "ofArray",
        "descriptor": "([Ljava/lang/classfile/AnnotationValue;)Ljava/lang/classfile/AnnotationValue$OfArray;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.AnnotationDefaultAttribute",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/AnnotationValue;)Ljava/lang/classfile/attribute/AnnotationDefaultAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      }
    ]
  },
  "buildNames": {
    "method": "buildNames",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "ldc",
      "getstatic",
      "iconst_2",
      "anewarray",
      "dup",
      "iconst_0",
      "aastore",
      "iconst_1",
      "bipush",
      "invokedynamic",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "withMethod",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;ILjava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "optionalNames": {
    "method": "optionalNames",
    "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "iconst_2",
      "anewarray",
      "dup",
      "iconst_0",
      "ldc_w",
      "invokestatic",
      "bipush",
      "aastore",
      "iconst_1",
      "invokeinterface",
      "checkcast",
      "invokedynamic",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.MethodParameterInfo",
        "name": "ofParameter",
        "descriptor": "(Ljava/util/Optional;I)Ljava/lang/classfile/attribute/MethodParameterInfo;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.MethodParametersAttribute",
        "name": "of",
        "descriptor": "([Ljava/lang/classfile/attribute/MethodParameterInfo;)Ljava/lang/classfile/attribute/MethodParametersAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodBuilder",
        "name": "withCode",
        "descriptor": "(Ljava/util/function/Consumer;)Ljava/lang/classfile/MethodBuilder;"
      }
    ]
  }
});
export default group("classfile-declarations-signatures","ClassFileDeclarationsFinal","CLASSFILE_DECLARATIONS_OK",["D4AllValues","D4DeclInvisible","D4DeclVisible","D4DeclarationTarget","D4Nested"],[
  entry("cf-decl-method-signature","caseMethod","MethodSignature=factory/parse/full-tree;typeParameters=T/E;arguments=T/I;throws=E;SignatureAttribute=typed;value=held-Number;verify=empty;defined/invoked=same-bytes",[callbacks["ref"],callbacks["methodSignature"],callbacks["buildMethod"],callbacks["methodGeneric"],callbacks["codeReference"]],[
  {
    "id": "decl-method-signature",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dMethodSignature",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [],
    "methods": [
      {
        "name": "value",
        "descriptor": "(Ljava/lang/Number;I)Ljava/lang/Number;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "areturn"
        ]
      }
    ],
    "sourceFile": null,
    "branches": false,
    "handlers": false
  }
],[
  {
    "method": "caseMethod",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "ldc_w",
      "astore_1",
      "aload_0",
      "invokeinterface",
      "invokevirtual",
      "ifeq",
      "aload_1",
      "iconst_2",
      "if_icmpne",
      "iconst_1",
      "goto",
      "iconst_0",
      "checkcast",
      "ldc",
      "getstatic",
      "anewarray",
      "dup",
      "aastore",
      "astore_2",
      "aload_2",
      "invokedynamic",
      "astore_3",
      "aload_3",
      "astore",
      "aload",
      "bipush",
      "if_acmpne",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.MethodSignature",
        "name": "parseFrom",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/classfile/MethodSignature;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodSignature",
        "name": "signatureString",
        "descriptor": "()Ljava/lang/String;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodSignature",
        "name": "typeParameters",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodSignature",
        "name": "arguments",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodSignature",
        "name": "throwableSignatures",
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
        "owner": "java.lang.classfile.Signature$TypeParam",
        "name": "interfaceBounds",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodSignature",
        "name": "result",
        "descriptor": "()Ljava/lang/classfile/Signature;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Signature$TypeVarSig",
        "name": "identifier",
        "descriptor": "()Ljava/lang/String;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.MethodSignature",
        "name": "of",
        "descriptor": "(Ljava/lang/constant/MethodTypeDesc;)Ljava/lang/classfile/MethodSignature;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.Signature",
        "name": "of",
        "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/Signature;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.MethodSignature",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/Signature;[Ljava/lang/classfile/Signature;)Ljava/lang/classfile/MethodSignature;"
      },
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
        "name": "parse",
        "descriptor": "([B)Ljava/lang/classfile/ClassModel;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "signature",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SignatureAttribute",
        "name": "asMethodSignature",
        "descriptor": "()Ljava/lang/classfile/MethodSignature;"
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
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;[Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
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
        "descriptor": "(Ljava/lang/Number;I)Ljava/lang/Number;"
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
  entry("cf-decl-class-signature","caseClass","ClassSignature=factory/parse/full-tree;interface-only-bound=CharSequence;super=Object/Serializable;value=13;verify=empty;defined/invoked=same-bytes",[callbacks["ref"],callbacks["classSignature"],callbacks["buildClass"],callbacks["codeThirteen"]],[
  {
    "id": "decl-class-signature",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dClassSignature",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [
      "java.io.Serializable"
    ],
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
    "method": "caseClass",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "ldc_w",
      "astore_1",
      "aload_0",
      "invokeinterface",
      "invokevirtual",
      "ifeq",
      "aload_1",
      "iconst_0",
      "checkcast",
      "iconst_1",
      "if_icmpne",
      "goto",
      "getstatic",
      "anewarray",
      "astore_2",
      "aload_2",
      "invokedynamic",
      "astore_3",
      "aload_3",
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
        "owner": "java.lang.classfile.ClassSignature",
        "name": "parseFrom",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/classfile/ClassSignature;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassSignature",
        "name": "signatureString",
        "descriptor": "()Ljava/lang/String;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassSignature",
        "name": "typeParameters",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Signature$TypeParam",
        "name": "classBound",
        "descriptor": "()Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Signature$TypeParam",
        "name": "interfaceBounds",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassSignature",
        "name": "superinterfaceSignatures",
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
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.Signature",
        "name": "of",
        "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/Signature;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassSignature",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/Signature$ClassTypeSig;[Ljava/lang/classfile/Signature$ClassTypeSig;)Ljava/lang/classfile/ClassSignature;"
      },
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
        "name": "parse",
        "descriptor": "([B)Ljava/lang/classfile/ClassModel;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "signature",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SignatureAttribute",
        "name": "asClassSignature",
        "descriptor": "()Ljava/lang/classfile/ClassSignature;"
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
  entry("cf-decl-signature-attributes","caseAttributes","original-javac25=-g/-parameters/unchanged;SignatureAttribute=class/method/type-dispatch;trees=T/UE/List<String>;verify(model)=empty;generated-bytes=none",[callbacks["original"],callbacks["method"],callbacks["field"]],[],[
  {
    "method": "caseAttributes",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "astore_1",
      "aload_1",
      "invokeinterface",
      "invokevirtual",
      "checkcast",
      "astore_2",
      "ldc_w",
      "astore_3",
      "astore",
      "aload_2",
      "iconst_1",
      "if_icmpne",
      "iconst_0",
      "aload_3",
      "iconst_2",
      "goto",
      "aload",
      "instanceof",
      "ifeq",
      "getstatic",
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
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "signature",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SignatureAttribute",
        "name": "asClassSignature",
        "descriptor": "()Ljava/lang/classfile/ClassSignature;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SignatureAttribute",
        "name": "asMethodSignature",
        "descriptor": "()Ljava/lang/classfile/MethodSignature;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.FieldModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SignatureAttribute",
        "name": "asTypeSignature",
        "descriptor": "()Ljava/lang/classfile/Signature;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassSignature",
        "name": "typeParameters",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Signature$TypeParam",
        "name": "interfaceBounds",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodSignature",
        "name": "typeParameters",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodSignature",
        "name": "throwableSignatures",
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
        "owner": "java.lang.classfile.Signature$ClassTypeSig",
        "name": "typeArgs",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassFile",
        "name": "verify",
        "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.Signature",
        "name": "of",
        "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/Signature;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SignatureAttribute",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/Signature;)Ljava/lang/classfile/attribute/SignatureAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Signature",
        "name": "signatureString",
        "descriptor": "()Ljava/lang/String;"
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
  entry("cf-decl-annotation-values","caseValues","AnnotationValue=13-tags;enum/class/nested/array=typed;UTF/CP=actual;value=5;verify=empty;defined/invoked=same-bytes",[callbacks["allValues"],callbacks["buildValues"],callbacks["codeFive"]],[
  {
    "id": "decl-annotation-values",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dAnnotationValues",
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
          "iconst_5",
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
    "method": "caseValues",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "invokeinterface",
      "bipush",
      "if_icmpne",
      "ldc",
      "ifeq",
      "iconst_1",
      "goto",
      "iconst_0",
      "ldc_w",
      "astore_1",
      "astore_2",
      "aload_2",
      "checkcast",
      "astore_3",
      "aload_1",
      "aload_3",
      "i2c",
      "invokedynamic",
      "invokevirtual",
      "getstatic",
      "iconst_2",
      "astore",
      "aload",
      "iconst_5",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Annotation",
        "name": "elements",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Annotation",
        "name": "classSymbol",
        "descriptor": "()Ljava/lang/constant/ClassDesc;"
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
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "value",
        "descriptor": "()Ljava/lang/classfile/AnnotationValue;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue",
        "name": "tag",
        "descriptor": "()I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue$OfEnum",
        "name": "constantName",
        "descriptor": "()Ljava/lang/classfile/constantpool/Utf8Entry;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.Utf8Entry",
        "name": "equalsString",
        "descriptor": "(Ljava/lang/String;)Z"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue$OfClass",
        "name": "classSymbol",
        "descriptor": "()Ljava/lang/constant/ClassDesc;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue$OfArray",
        "name": "values",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue",
        "name": "of",
        "descriptor": "(Ljava/lang/Object;)Ljava/lang/classfile/AnnotationValue;"
      },
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
        "name": "parse",
        "descriptor": "([B)Ljava/lang/classfile/ClassModel;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "runtimeVisibleAnnotations",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RuntimeVisibleAnnotationsAttribute",
        "name": "annotations",
        "descriptor": "()Ljava/util/List;"
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
  entry("cf-decl-visible-annotations","caseVisible","genuine-class/field/method-visible-annotations=typed-preserved;value=71;verify=empty;defined/invoked=same-bytes",[callbacks["original"],callbacks["method"],callbacks["field"]],[
  {
    "id": "decl-visible",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dDeclarationVisible",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [
      {
        "name": "number",
        "descriptor": "I",
        "flags": 25
      },
      {
        "name": "names",
        "descriptor": "Ljava/util/List;",
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
        "name": "value",
        "descriptor": "(ILjava/lang/String;)I",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ireturn"
        ]
      },
      {
        "name": "echo",
        "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "areturn"
        ]
      }
    ],
    "sourceFile": "ClassFileDeclarationsFinal.java",
    "branches": false,
    "handlers": false
  }
],[
  {
    "method": "caseVisible",
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
      "bipush",
      "ldc",
      "ifeq",
      "astore_3",
      "aload_3",
      "astore",
      "aload",
      "anewarray",
      "dup",
      "aastore",
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
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "runtimeVisibleAnnotations",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RuntimeVisibleAnnotationsAttribute",
        "name": "annotations",
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
        "owner": "java.lang.classfile.FieldModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Annotation",
        "name": "elements",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationElement",
        "name": "value",
        "descriptor": "()Ljava/lang/classfile/AnnotationValue;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue",
        "name": "tag",
        "descriptor": "()I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
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
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;[Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
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
        "descriptor": "(ILjava/lang/String;)I"
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
  entry("cf-decl-invisible-newpool","caseInvisible","NEW_POOL=actual-annotation-UTF/numeric-import;class/field/method-invisible-annotations=preserved;value=73;verify=empty;defined/invoked=same-bytes",[callbacks["original"],callbacks["copy"],callbacks["method"],callbacks["field"]],[
  {
    "id": "decl-invisible",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dDeclarationInvisible",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [
      {
        "name": "number",
        "descriptor": "I",
        "flags": 25
      },
      {
        "name": "names",
        "descriptor": "Ljava/util/List;",
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
        "name": "value",
        "descriptor": "(ILjava/lang/String;)I",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "ireturn"
        ]
      },
      {
        "name": "echo",
        "descriptor": "(Ljava/lang/CharSequence;)Ljava/lang/CharSequence;",
        "flags": 9,
        "opcodes": [
          "aload_0",
          "areturn"
        ]
      }
    ],
    "sourceFile": "ClassFileDeclarationsFinal.java",
    "branches": false,
    "handlers": false
  }
],[
  {
    "method": "caseInvisible",
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
      "invokedynamic",
      "invokeinterface",
      "astore_1",
      "aload_1",
      "astore_2",
      "aload_2",
      "invokevirtual",
      "checkcast",
      "if_icmpne",
      "ldc",
      "ifeq",
      "goto",
      "astore_3",
      "aload_3",
      "astore",
      "aload",
      "bipush",
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
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "runtimeInvisibleAnnotations",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RuntimeInvisibleAnnotationsAttribute",
        "name": "annotations",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Annotation",
        "name": "classSymbol",
        "descriptor": "()Ljava/lang/constant/ClassDesc;"
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
        "owner": "java.lang.classfile.FieldModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
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
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;[Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
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
        "descriptor": "(ILjava/lang/String;)I"
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
  entry("cf-decl-parameter-annotations","caseParameters","visible/invisible-parameter-annotations=2-positional-lists;empty-slots=preserved;value=79;verify=empty;defined/invoked=same-bytes",[callbacks["visible"],callbacks["invisible"],callbacks["buildParameters"],callbacks["methodParameters"],callbacks["codeInput"]],[
  {
    "id": "decl-parameters",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dParameterAnnotations",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [],
    "methods": [
      {
        "name": "value",
        "descriptor": "(ILjava/lang/String;)I",
        "flags": 9,
        "opcodes": [
          "iload_0",
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
    "method": "caseParameters",
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
      "ldc",
      "astore_2",
      "aload_2",
      "invokevirtual",
      "checkcast",
      "astore_3",
      "astore",
      "aload_3",
      "iconst_2",
      "if_icmpne",
      "iconst_0",
      "iconst_1",
      "ifeq",
      "aload",
      "goto",
      "getstatic",
      "anewarray",
      "dup",
      "aastore",
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
        "name": "parse",
        "descriptor": "([B)Ljava/lang/classfile/ClassModel;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "runtimeVisibleParameterAnnotations",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RuntimeVisibleParameterAnnotationsAttribute",
        "name": "parameterAnnotations",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "runtimeInvisibleParameterAnnotations",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RuntimeInvisibleParameterAnnotationsAttribute",
        "name": "parameterAnnotations",
        "descriptor": "()Ljava/util/List;"
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
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;[Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
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
        "descriptor": "(ILjava/lang/String;)I"
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
  entry("cf-decl-default-parameters","caseDefaults","AnnotationDefault=I/string/int-array;interface=metadata-only/neverdefine;MethodParameters=optional-name/final-mask;value=83;verify=empty;defined/invoked=parameter-bytes-only",[callbacks["buildDefaults"],callbacks["defaultInt"],callbacks["defaultString"],callbacks["defaultArray"],callbacks["buildNames"],callbacks["optionalNames"],callbacks["codeInput"]],[
  {
    "id": "decl-default-interface",
    "kind": "metadata-only",
    "className": "classes.modern_test.C7dDefaultAnnotation",
    "major": 69,
    "minor": 0,
    "flags": 9729,
    "definition": "metadata-only-neverdefine",
    "interfaces": [
      "java.lang.annotation.Annotation"
    ],
    "fields": [],
    "methods": [
      {
        "name": "amount",
        "descriptor": "()I",
        "flags": 1025,
        "opcodes": []
      },
      {
        "name": "text",
        "descriptor": "()Ljava/lang/String;",
        "flags": 1025,
        "opcodes": []
      },
      {
        "name": "numbers",
        "descriptor": "()[I",
        "flags": 1025,
        "opcodes": []
      }
    ],
    "sourceFile": null,
    "branches": false,
    "handlers": false
  },
  {
    "id": "decl-optional-parameters",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dOptionalParameters",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [],
    "methods": [
      {
        "name": "value",
        "descriptor": "(IJ)I",
        "flags": 9,
        "opcodes": [
          "iload_0",
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
    "method": "caseDefaults",
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
      "checkcast",
      "bipush",
      "if_icmpne",
      "iconst_1",
      "goto",
      "iconst_0",
      "iconst_2",
      "ifeq",
      "astore_3",
      "aload_3",
      "ldc",
      "astore",
      "aload",
      "ifne",
      "getstatic",
      "anewarray",
      "dup",
      "aastore",
      "ldc2_w",
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
        "name": "parse",
        "descriptor": "([B)Ljava/lang/classfile/ClassModel;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "annotationDefault",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodModel",
        "name": "findAttribute",
        "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.AnnotationDefaultAttribute",
        "name": "defaultValue",
        "descriptor": "()Ljava/lang/classfile/AnnotationValue;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue$OfInt",
        "name": "intValue",
        "descriptor": "()I"
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
        "owner": "java.lang.classfile.AnnotationValue$OfString",
        "name": "stringValue",
        "descriptor": "()Ljava/lang/String;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.AnnotationValue$OfArray",
        "name": "values",
        "descriptor": "()Ljava/util/List;"
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
        "owner": "java.lang.classfile.Attributes",
        "name": "methodParameters",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.MethodParametersAttribute",
        "name": "parameters",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.MethodParameterInfo",
        "name": "name",
        "descriptor": "()Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.Utf8Entry",
        "name": "equalsString",
        "descriptor": "(Ljava/lang/String;)Z"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.MethodParameterInfo",
        "name": "flagsMask",
        "descriptor": "()I"
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
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;[Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
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
        "descriptor": "(IJ)I"
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
