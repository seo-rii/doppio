import {entry,group,freeze} from './classfile_declarations_case_helpers.mjs';
// Independently frozen named original caller/typed-lifecycle obligations.
const callbacks=freeze({
  "original": {
    "method": "original",
    "descriptor": "(Ljava/lang/classfile/ClassFile;Ljava/lang/String;)Ljava/lang/classfile/ClassModel;",
    "requiredOpcodes": [
      "aload_0",
      "ldc",
      "aload_1",
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
  "rebuildRecord": {
    "method": "rebuildRecord",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;Ljava/lang/classfile/ClassElement;)V",
    "requiredOpcodes": [
      "aload_1",
      "instanceof",
      "ifeq",
      "new",
      "dup",
      "invokespecial",
      "astore_2",
      "checkcast",
      "invokeinterface",
      "astore_3",
      "aload_3",
      "astore",
      "aload_2",
      "aload",
      "invokestatic",
      "invokevirtual",
      "pop",
      "goto",
      "aload_0",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RecordAttribute",
        "name": "components",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RecordComponentInfo",
        "name": "name",
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
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RecordComponentInfo",
        "name": "descriptorSymbol",
        "descriptor": "()Ljava/lang/constant/ClassDesc;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RecordComponentInfo",
        "name": "attributes",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RecordComponentInfo",
        "name": "of",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/ClassDesc;Ljava/util/List;)Ljava/lang/classfile/attribute/RecordComponentInfo;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RecordAttribute",
        "name": "of",
        "descriptor": "(Ljava/util/List;)Ljava/lang/classfile/attribute/RecordAttribute;"
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
  "buildEnclosing": {
    "method": "buildEnclosing",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "bipush",
      "invokeinterface",
      "getstatic",
      "checkcast",
      "ldc",
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
  "codeThirtyOne": {
    "method": "codeThirtyOne",
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
  "buildMarkers": {
    "method": "buildMarkers",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "bipush",
      "invokeinterface",
      "invokestatic",
      "checkcast",
      "ldc",
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
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SyntheticAttribute",
        "name": "of",
        "descriptor": "()Ljava/lang/classfile/attribute/SyntheticAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.DeprecatedAttribute",
        "name": "of",
        "descriptor": "()Ljava/lang/classfile/attribute/DeprecatedAttribute;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SourceIDAttribute",
        "name": "of",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/classfile/attribute/SourceIDAttribute;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.CompilationIDAttribute",
        "name": "of",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/classfile/attribute/CompilationIDAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "withField",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
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
  "fieldMarkers": {
    "method": "fieldMarkers",
    "descriptor": "(Ljava/lang/classfile/FieldBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "bipush",
      "invokeinterface",
      "iconst_3",
      "invokestatic",
      "checkcast",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.FieldBuilder",
        "name": "withFlags",
        "descriptor": "(I)Ljava/lang/classfile/FieldBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.FieldBuilder",
        "name": "constantPool",
        "descriptor": "()Ljava/lang/classfile/constantpool/ConstantPoolBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.ConstantPoolBuilder",
        "name": "intEntry",
        "descriptor": "(I)Ljava/lang/classfile/constantpool/IntegerEntry;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ConstantValueAttribute",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/constantpool/ConstantValueEntry;)Ljava/lang/classfile/attribute/ConstantValueAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.FieldBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SyntheticAttribute",
        "name": "of",
        "descriptor": "()Ljava/lang/classfile/attribute/SyntheticAttribute;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.DeprecatedAttribute",
        "name": "of",
        "descriptor": "()Ljava/lang/classfile/attribute/DeprecatedAttribute;"
      }
    ]
  },
  "methodMarkers": {
    "method": "methodMarkers",
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
        "owner": "java.lang.classfile.attribute.SyntheticAttribute",
        "name": "of",
        "descriptor": "()Ljava/lang/classfile/attribute/SyntheticAttribute;"
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
        "owner": "java.lang.classfile.attribute.DeprecatedAttribute",
        "name": "of",
        "descriptor": "()Ljava/lang/classfile/attribute/DeprecatedAttribute;"
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
  "codeFortyOne": {
    "method": "codeFortyOne",
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
  "module": {
    "method": "module",
    "descriptor": "()Ljava/lang/classfile/attribute/ModuleAttribute;",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "ldc",
      "invokeinterface",
      "astore_1",
      "astore_2",
      "astore_3",
      "astore",
      "iconst_0",
      "aload_1",
      "aload_2",
      "bipush",
      "aconst_null",
      "checkcast",
      "aload",
      "aload_3",
      "sipush",
      "areturn"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.ConstantPoolBuilder",
        "name": "of",
        "descriptor": "()Ljava/lang/classfile/constantpool/ConstantPoolBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.ConstantPoolBuilder",
        "name": "utf8Entry",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/classfile/constantpool/Utf8Entry;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.ConstantPoolBuilder",
        "name": "moduleEntry",
        "descriptor": "(Ljava/lang/classfile/constantpool/Utf8Entry;)Ljava/lang/classfile/constantpool/ModuleEntry;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.ConstantPoolBuilder",
        "name": "packageEntry",
        "descriptor": "(Ljava/lang/classfile/constantpool/Utf8Entry;)Ljava/lang/classfile/constantpool/PackageEntry;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.ConstantPoolBuilder",
        "name": "classEntry",
        "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/constantpool/ClassEntry;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ModuleRequireInfo",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/constantpool/ModuleEntry;ILjava/lang/classfile/constantpool/Utf8Entry;)Ljava/lang/classfile/attribute/ModuleRequireInfo;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ModuleExportInfo",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/constantpool/PackageEntry;ILjava/util/List;)Ljava/lang/classfile/attribute/ModuleExportInfo;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ModuleOpenInfo",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/constantpool/PackageEntry;ILjava/util/List;)Ljava/lang/classfile/attribute/ModuleOpenInfo;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ModuleProvideInfo",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/constantpool/ClassEntry;Ljava/util/List;)Ljava/lang/classfile/attribute/ModuleProvideInfo;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ModuleAttribute",
        "name": "of",
        "descriptor": "(Ljava/lang/classfile/constantpool/ModuleEntry;ILjava/lang/classfile/constantpool/Utf8Entry;Ljava/util/Collection;Ljava/util/Collection;Ljava/util/Collection;Ljava/util/Collection;Ljava/util/Collection;)Ljava/lang/classfile/attribute/ModuleAttribute;"
      }
    ]
  },
  "moduleExtras": {
    "method": "moduleExtras",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokeinterface",
      "astore_1",
      "iconst_2",
      "anewarray",
      "dup",
      "iconst_0",
      "aload_1",
      "ldc",
      "aastore",
      "iconst_1",
      "invokestatic",
      "pop",
      "ldc_w",
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
        "name": "utf8Entry",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/classfile/constantpool/Utf8Entry;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.ConstantPoolBuilder",
        "name": "packageEntry",
        "descriptor": "(Ljava/lang/classfile/constantpool/Utf8Entry;)Ljava/lang/classfile/constantpool/PackageEntry;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ModulePackagesAttribute",
        "name": "of",
        "descriptor": "([Ljava/lang/classfile/constantpool/PackageEntry;)Ljava/lang/classfile/attribute/ModulePackagesAttribute;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ModuleMainClassAttribute",
        "name": "of",
        "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/attribute/ModuleMainClassAttribute;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SourceFileAttribute",
        "name": "of",
        "descriptor": "(Ljava/lang/String;)Ljava/lang/classfile/attribute/SourceFileAttribute;"
      }
    ]
  }
});
export default group("classfile-declarations-metadata","ClassFileMetadataFinal","CLASSFILE_METADATA_OK",["ClassFileMetadataFinal$1D4Local","D4RecordAnnotated","D4RecordExecutable","D4RecordModel","D4RecordTypeVisible","D4RecordVisible","D4SealedBase","D4SealedLeaf"],[
  entry("cf-meta-record-model","caseRecordModel","original-javac25-record=unchanged;RecordComponentInfo=number:I/names:List<String>;nested-signature/declaration/type-annotations=typed;verify(model)=empty;generated-bytes=none",[callbacks["original"]],[],[
  {
    "method": "caseRecordModel",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "ldc_w",
      "astore_1",
      "aload_1",
      "invokeinterface",
      "invokevirtual",
      "checkcast",
      "astore_2",
      "aload_2",
      "iconst_2",
      "if_icmpne",
      "iconst_0",
      "ldc",
      "ifeq",
      "getstatic",
      "iconst_1",
      "goto",
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
        "name": "record",
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
        "owner": "java.lang.classfile.attribute.RecordAttribute",
        "name": "components",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RecordComponentInfo",
        "name": "name",
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
        "owner": "java.lang.classfile.attribute.RecordComponentInfo",
        "name": "descriptorSymbol",
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
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "signature",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RecordComponentInfo",
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
        "owner": "java.lang.classfile.Signature",
        "name": "signatureString",
        "descriptor": "()Ljava/lang/String;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "runtimeVisibleAnnotations",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
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
        "owner": "java.lang.classfile.ClassFile",
        "name": "verify",
        "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
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
  entry("cf-meta-record-accessor","caseRecordAccessor","genuine-record-NEW_POOL=owned-output;self-owner=original-binary-name;constructor/accessor=37;verify=empty;defined/invoked=same-bytes",[callbacks["original"],callbacks["copy"]],[
  {
    "id": "meta-record-accessor",
    "kind": "valid-generated",
    "className": "classes.modern_test.D4RecordExecutable",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [
      {
        "name": "number",
        "descriptor": "I",
        "flags": 18
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "(I)V",
        "flags": 0,
        "opcodes": [
          "aload_0",
          "invokespecial",
          "aload_0",
          "iload_1",
          "putfield",
          "return"
        ]
      },
      {
        "name": "toString",
        "descriptor": "()Ljava/lang/String;",
        "flags": 17,
        "opcodes": [
          "aload_0",
          "invokedynamic",
          "areturn"
        ]
      },
      {
        "name": "hashCode",
        "descriptor": "()I",
        "flags": 17,
        "opcodes": [
          "aload_0",
          "invokedynamic",
          "ireturn"
        ]
      },
      {
        "name": "equals",
        "descriptor": "(Ljava/lang/Object;)Z",
        "flags": 17,
        "opcodes": [
          "aload_0",
          "aload_1",
          "invokedynamic",
          "ireturn"
        ]
      },
      {
        "name": "number",
        "descriptor": "()I",
        "flags": 1,
        "opcodes": [
          "aload_0",
          "getfield",
          "ireturn"
        ]
      }
    ],
    "sourceFile": "ClassFileMetadataFinal.java",
    "branches": false,
    "handlers": false
  }
],[
  {
    "method": "caseRecordAccessor",
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
      "invokevirtual",
      "checkcast",
      "if_icmpne",
      "ifeq",
      "goto",
      "astore_2",
      "aload_2",
      "astore_3",
      "aload_3",
      "astore",
      "ldc",
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
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/classfile/ClassTransform;)[B"
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
        "name": "record",
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
        "owner": "java.lang.classfile.attribute.RecordAttribute",
        "name": "components",
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
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "findConstructor",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
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
        "name": "findVirtual",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandle",
        "name": "invoke",
        "descriptor": "(I)Ljava/lang/Object;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandle",
        "name": "invoke",
        "descriptor": "(Ljava/lang/Object;)I"
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
  entry("cf-meta-record-components","caseRecordComponents","RecordComponentInfo.of=rebuilt-name/descriptor/nested-attributes;NEW_POOL=actual-UTF/annotation/signature-import;accessor=held-List;verify=empty;defined/invoked=same-bytes",[callbacks["original"],callbacks["rebuildRecord"]],[
  {
    "id": "meta-record-components",
    "kind": "valid-generated",
    "className": "classes.modern_test.D4RecordAnnotated",
    "major": 69,
    "minor": 0,
    "flags": 48,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [
      {
        "name": "names",
        "descriptor": "Ljava/util/List;",
        "flags": 18
      }
    ],
    "methods": [
      {
        "name": "<init>",
        "descriptor": "(Ljava/util/List;)V",
        "flags": 0,
        "opcodes": [
          "aload_0",
          "invokespecial",
          "aload_0",
          "aload_1",
          "putfield",
          "return"
        ]
      },
      {
        "name": "toString",
        "descriptor": "()Ljava/lang/String;",
        "flags": 17,
        "opcodes": [
          "aload_0",
          "invokedynamic",
          "areturn"
        ]
      },
      {
        "name": "hashCode",
        "descriptor": "()I",
        "flags": 17,
        "opcodes": [
          "aload_0",
          "invokedynamic",
          "ireturn"
        ]
      },
      {
        "name": "equals",
        "descriptor": "(Ljava/lang/Object;)Z",
        "flags": 17,
        "opcodes": [
          "aload_0",
          "aload_1",
          "invokedynamic",
          "ireturn"
        ]
      },
      {
        "name": "names",
        "descriptor": "()Ljava/util/List;",
        "flags": 1,
        "opcodes": [
          "aload_0",
          "getfield",
          "areturn"
        ]
      }
    ],
    "sourceFile": "ClassFileMetadataFinal.java",
    "branches": false,
    "handlers": false
  }
],[
  {
    "method": "caseRecordComponents",
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
      "invokevirtual",
      "checkcast",
      "astore_2",
      "aload_2",
      "ifeq",
      "goto",
      "if_icmpne",
      "astore_3",
      "aload_3",
      "astore",
      "aload",
      "ldc",
      "if_acmpne",
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
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/classfile/ClassTransform;)[B"
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
        "name": "record",
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
        "owner": "java.lang.classfile.attribute.RecordAttribute",
        "name": "components",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RecordComponentInfo",
        "name": "name",
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
        "owner": "java.lang.classfile.attribute.RecordComponentInfo",
        "name": "descriptorSymbol",
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
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "signature",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.RecordComponentInfo",
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
        "owner": "java.lang.classfile.Signature",
        "name": "signatureString",
        "descriptor": "()Ljava/lang/String;"
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
        "owner": "java.lang.classfile.attribute.RuntimeVisibleAnnotationsAttribute",
        "name": "annotations",
        "descriptor": "()Ljava/util/List;"
      },
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
        "owner": "java.lang.classfile.attribute.RuntimeVisibleTypeAnnotationsAttribute",
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
        "descriptor": "(Ljava/lang/Class;Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandles$Lookup",
        "name": "findConstructor",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
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
        "name": "findVirtual",
        "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandle",
        "name": "invoke",
        "descriptor": "(Ljava/util/List;)Ljava/lang/Object;"
      },
      {
        "opcode": "invokevirtual",
        "tag": 10,
        "owner": "java.lang.invoke.MethodHandle",
        "name": "invoke",
        "descriptor": "(Ljava/lang/Object;)Ljava/util/List;"
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
  entry("cf-meta-sealed-metadata","caseSealed","genuine-PermittedSubclasses=typed-D4SealedLeaf;NEW_POOL=actual-Class-import;verify=empty;metadata-only/neverdefine;native-sealing-reflection=separate-axis",[callbacks["original"],callbacks["copy"]],[
  {
    "id": "meta-sealed",
    "kind": "metadata-only",
    "className": "classes.modern_test.D4SealedBase",
    "major": 69,
    "minor": 0,
    "flags": 32,
    "definition": "metadata-only-neverdefine",
    "interfaces": [],
    "fields": [],
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
        "descriptor": "()I",
        "flags": 1,
        "opcodes": [
          "bipush",
          "ireturn"
        ]
      }
    ],
    "sourceFile": "ClassFileMetadataFinal.java",
    "branches": false,
    "handlers": false
  }
],[
  {
    "method": "caseSealed",
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
      "invokevirtual",
      "checkcast",
      "astore_2",
      "aload_2",
      "if_icmpne",
      "ifeq",
      "goto",
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
        "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/classfile/ClassTransform;)[B"
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
        "name": "permittedSubclasses",
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
        "owner": "java.lang.classfile.attribute.PermittedSubclassesAttribute",
        "name": "permittedSubclasses",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.ClassEntry",
        "name": "asSymbol",
        "descriptor": "()Ljava/lang/constant/ClassDesc;"
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
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "emit",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
      }
    ]
  }
]),
  entry("cf-meta-enclosing-method","caseEnclosing","genuine-local-class-EnclosingMethod=owner/name/type;public-build=actual-CP-import;value=31;verify=empty;defined/invoked=same-bytes",[callbacks["original"],callbacks["buildEnclosing"],callbacks["codeThirtyOne"]],[
  {
    "id": "meta-enclosing",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dEnclosingMetadata",
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
    "method": "caseEnclosing",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "ldc_w",
      "astore_1",
      "aload_1",
      "invokeinterface",
      "invokevirtual",
      "checkcast",
      "putstatic",
      "getstatic",
      "ifeq",
      "iconst_1",
      "goto",
      "iconst_0",
      "invokedynamic",
      "astore_2",
      "aload_2",
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
        "name": "enclosingMethod",
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
        "owner": "java.lang.classfile.attribute.EnclosingMethodAttribute",
        "name": "enclosingClass",
        "descriptor": "()Ljava/lang/classfile/constantpool/ClassEntry;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.ClassEntry",
        "name": "asSymbol",
        "descriptor": "()Ljava/lang/constant/ClassDesc;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.EnclosingMethodAttribute",
        "name": "enclosingMethodName",
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
        "owner": "java.lang.classfile.attribute.EnclosingMethodAttribute",
        "name": "enclosingMethodTypeSymbol",
        "descriptor": "()Ljava/util/Optional;"
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
  entry("cf-meta-markers","caseMarkers","Synthetic/Deprecated=class/field/method;SourceID/CompilationID=typed-UTF;value=41;verify=empty;defined/invoked=same-bytes",[callbacks["buildMarkers"],callbacks["fieldMarkers"],callbacks["methodMarkers"],callbacks["codeFortyOne"]],[
  {
    "id": "meta-markers",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dMetadataMarkers",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [
      {
        "name": "number",
        "descriptor": "I",
        "flags": 25
      }
    ],
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
    "method": "caseMarkers",
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
      "ifeq",
      "checkcast",
      "ldc",
      "iconst_1",
      "goto",
      "iconst_0",
      "astore_3",
      "aload_3",
      "astore",
      "aload",
      "getstatic",
      "bipush",
      "if_icmpne",
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
        "name": "synthetic",
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
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "deprecated",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "sourceId",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SourceIDAttribute",
        "name": "sourceId",
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
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "compilationId",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.CompilationIDAttribute",
        "name": "compilationId",
        "descriptor": "()Ljava/lang/classfile/constantpool/Utf8Entry;"
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
        "owner": "java.lang.classfile.ClassModel",
        "name": "fields",
        "descriptor": "()Ljava/util/List;"
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
        "owner": "java.lang.classfile.ClassModel",
        "name": "methods",
        "descriptor": "()Ljava/util/List;"
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
  entry("cf-meta-module-vectors","caseModuleVectors","buildModule=module-info/ACC_MODULE/no-super/no-members;Module=version/requires/exports/opens/uses/provides;typed-CP-tags=19/20;verify=empty;metadata-only/neverdefine",[callbacks["module"]],[
  {
    "id": "meta-module-vectors",
    "kind": "metadata-only",
    "className": "module-info",
    "major": 69,
    "minor": 0,
    "flags": 32768,
    "definition": "metadata-only-neverdefine",
    "interfaces": [],
    "fields": [],
    "methods": [],
    "sourceFile": null,
    "branches": false,
    "handlers": false
  }
],[
  {
    "method": "caseModuleVectors",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "invokeinterface",
      "astore_1",
      "aload_1",
      "astore_2",
      "aload_2",
      "invokevirtual",
      "checkcast",
      "astore_3",
      "ldc",
      "if_icmpne",
      "ifeq",
      "iconst_1",
      "goto",
      "iconst_0",
      "aload_3",
      "iconst_2",
      "ldc_w",
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
        "name": "buildModule",
        "descriptor": "(Ljava/lang/classfile/attribute/ModuleAttribute;)[B"
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
        "name": "module",
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
        "owner": "java.lang.classfile.ClassModel",
        "name": "flags",
        "descriptor": "()Ljava/lang/classfile/AccessFlags;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.AccessFlags",
        "name": "flagsMask",
        "descriptor": "()I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassModel",
        "name": "superclass",
        "descriptor": "()Ljava/util/Optional;"
      },
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
        "owner": "java.lang.classfile.ClassModel",
        "name": "fields",
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
        "owner": "java.lang.classfile.attribute.ModuleAttribute",
        "name": "moduleName",
        "descriptor": "()Ljava/lang/classfile/constantpool/ModuleEntry;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.ModuleEntry",
        "name": "name",
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
        "owner": "java.lang.classfile.attribute.ModuleAttribute",
        "name": "moduleVersion",
        "descriptor": "()Ljava/util/Optional;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ModuleAttribute",
        "name": "requires",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ModuleAttribute",
        "name": "exports",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ModuleAttribute",
        "name": "opens",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ModuleAttribute",
        "name": "uses",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ModuleAttribute",
        "name": "provides",
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
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "emit",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
      }
    ]
  }
]),
  entry("cf-meta-module-extras","caseModuleExtras","buildModule+builder=ModulePackages/ModuleMainClass/SourceFile;package/Class/UTF-import=real;verify=empty;metadata-only/neverdefine;named-module-runtime=not-claimed",[callbacks["module"],callbacks["moduleExtras"]],[
  {
    "id": "meta-module-extras",
    "kind": "metadata-only",
    "className": "module-info",
    "major": 69,
    "minor": 0,
    "flags": 32768,
    "definition": "metadata-only-neverdefine",
    "interfaces": [],
    "fields": [],
    "methods": [],
    "sourceFile": "module-info.java",
    "branches": false,
    "handlers": false
  }
],[
  {
    "method": "caseModuleExtras",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "invokedynamic",
      "invokeinterface",
      "astore_1",
      "aload_1",
      "astore_2",
      "aload_2",
      "invokevirtual",
      "checkcast",
      "iconst_2",
      "if_icmpne",
      "ldc_w",
      "ifeq",
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
        "name": "buildModule",
        "descriptor": "(Ljava/lang/classfile/attribute/ModuleAttribute;Ljava/util/function/Consumer;)[B"
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
        "name": "modulePackages",
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
        "owner": "java.lang.classfile.attribute.ModulePackagesAttribute",
        "name": "packages",
        "descriptor": "()Ljava/util/List;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "moduleMainClass",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.ModuleMainClassAttribute",
        "name": "mainClass",
        "descriptor": "()Ljava/lang/classfile/constantpool/ClassEntry;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.constantpool.ClassEntry",
        "name": "asSymbol",
        "descriptor": "()Ljava/lang/constant/ClassDesc;"
      },
      {
        "opcode": "invokestatic",
        "tag": 10,
        "owner": "java.lang.classfile.Attributes",
        "name": "sourceFile",
        "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.attribute.SourceFileAttribute",
        "name": "sourceFile",
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
        "owner": "classes.modern_test.ClassFileSupport",
        "name": "emit",
        "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
      }
    ]
  }
])
]);
