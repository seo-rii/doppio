import {entry,group,freeze} from './classfile_declarations_case_helpers.mjs';
// Independently frozen named original caller/typed-lifecycle obligations.
const callbacks=freeze({
  "flags": {
    "method": "flags",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
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
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "withFlags",
        "descriptor": "(I)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "buildBlock": {
    "method": "buildBlock",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "ldc",
      "getstatic",
      "iconst_1",
      "anewarray",
      "dup",
      "iconst_0",
      "aastore",
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
        "name": "withMethodBody",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;ILjava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "codeBlock": {
    "method": "codeBlock",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "getstatic",
      "invokeinterface",
      "istore_1",
      "iload_1",
      "iconst_1",
      "if_icmpne",
      "iconst_0",
      "ifne",
      "goto",
      "invokestatic",
      "pop",
      "invokedynamic",
      "putstatic",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeKind",
        "name": "INT",
        "descriptor": "Ljava/lang/classfile/TypeKind;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "allocateLocal",
        "descriptor": "(Ljava/lang/classfile/TypeKind;)I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "parameterSlot",
        "descriptor": "(I)I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "iconst_0",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "istore",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "block",
        "descriptor": "(Ljava/util/function/Consumer;)Ljava/lang/classfile/CodeBuilder;"
      },
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
  "blockFirst": {
    "method": "blockFirst",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "getstatic",
      "invokeinterface",
      "putstatic",
      "if_acmpeq",
      "iconst_1",
      "goto",
      "iconst_0",
      "invokestatic",
      "bipush",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeKind",
        "name": "INT",
        "descriptor": "Ljava/lang/classfile/TypeKind;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "allocateLocal",
        "descriptor": "(Ljava/lang/classfile/TypeKind;)I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "startLabel",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "endLabel",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "breakLabel",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "bipush",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "istore",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      },
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
        "name": "ifne",
        "descriptor": "(Ljava/lang/classfile/Label;)Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  },
  "blockSecond": {
    "method": "blockSecond",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "getstatic",
      "invokeinterface",
      "putstatic",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeKind",
        "name": "LONG",
        "descriptor": "Ljava/lang/classfile/TypeKind;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "allocateLocal",
        "descriptor": "(Ljava/lang/classfile/TypeKind;)I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "lconst_1",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "lstore",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  },
  "buildIfThen": {
    "method": "buildIfThen",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "ldc",
      "getstatic",
      "iconst_1",
      "anewarray",
      "dup",
      "iconst_0",
      "aastore",
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
        "name": "withMethodBody",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;ILjava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "codeIfThen": {
    "method": "codeIfThen",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "getstatic",
      "invokeinterface",
      "istore_1",
      "iload_1",
      "iconst_1",
      "if_icmpne",
      "goto",
      "iconst_0",
      "invokestatic",
      "invokedynamic",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.TypeKind",
        "name": "INT",
        "descriptor": "Ljava/lang/classfile/TypeKind;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "allocateLocal",
        "descriptor": "(Ljava/lang/classfile/TypeKind;)I"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "iconst_0",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "istore",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      },
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
        "name": "ifThen",
        "descriptor": "(Ljava/util/function/Consumer;)Ljava/lang/classfile/CodeBuilder;"
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
  "thenEleven": {
    "method": "thenEleven",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "bipush",
      "invokeinterface",
      "iconst_1",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "bipush",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "istore",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  },
  "buildIfElse": {
    "method": "buildIfElse",
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
        "name": "withMethodBody",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;ILjava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "codeIfElse": {
    "method": "codeIfElse",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "iconst_0",
      "invokeinterface",
      "iconst_1",
      "getstatic",
      "invokedynamic",
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
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "IF_ICMPGT",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "ifThenElse",
        "descriptor": "(Ljava/lang/classfile/Opcode;Ljava/util/function/Consumer;Ljava/util/function/Consumer;)Ljava/lang/classfile/CodeBuilder;"
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
  "thenSeventeen": {
    "method": "thenSeventeen",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
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
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "bipush",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  },
  "elseNineteen": {
    "method": "elseNineteen",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
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
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "bipush",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  },
  "buildTry": {
    "method": "buildTry",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "ldc",
      "getstatic",
      "iconst_1",
      "anewarray",
      "dup",
      "iconst_0",
      "aastore",
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
        "name": "withMethodBody",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;ILjava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "codeTry": {
    "method": "codeTry",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokedynamic",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "trying",
        "descriptor": "(Ljava/util/function/Consumer;Ljava/util/function/Consumer;)Ljava/lang/classfile/CodeBuilder;"
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
  "tryDivide": {
    "method": "tryDivide",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "bipush",
      "invokeinterface",
      "iconst_0",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "bipush",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      },
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
        "name": "idiv",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  },
  "divideCatch": {
    "method": "divideCatch",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder$CatchBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "ldc",
      "invokestatic",
      "invokedynamic",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$CatchBuilder",
        "name": "catching",
        "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)Ljava/lang/classfile/CodeBuilder$CatchBuilder;"
      }
    ]
  },
  "divideFailure": {
    "method": "divideFailure",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
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
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "pop",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "iconst_m1",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  },
  "buildMulti": {
    "method": "buildMulti",
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
        "name": "withMethodBody",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;ILjava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "codeMulti": {
    "method": "codeMulti",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokedynamic",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "trying",
        "descriptor": "(Ljava/util/function/Consumer;Ljava/util/function/Consumer;)Ljava/lang/classfile/CodeBuilder;"
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
  "tryThrow": {
    "method": "tryThrow",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokeinterface",
      "astore_1",
      "iconst_1",
      "aload_1",
      "bipush",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "newLabel",
        "descriptor": "()Ljava/lang/classfile/Label;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "aload",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "ifnull",
        "descriptor": "(Ljava/lang/classfile/Label;)Ljava/lang/classfile/CodeBuilder;"
      },
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
        "name": "athrow",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
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
        "name": "bipush",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  },
  "multiCatch": {
    "method": "multiCatch",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder$CatchBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "ldc",
      "invokestatic",
      "invokedynamic",
      "invokeinterface",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$CatchBuilder",
        "name": "catchingMulti",
        "descriptor": "(Ljava/util/List;Ljava/util/function/Consumer;)Ljava/lang/classfile/CodeBuilder$CatchBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$CatchBuilder",
        "name": "catchingAll",
        "descriptor": "(Ljava/util/function/Consumer;)V"
      }
    ]
  },
  "specificFailure": {
    "method": "specificFailure",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokeinterface",
      "bipush",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "pop",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "bipush",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  },
  "anyFailure": {
    "method": "anyFailure",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder$BlockCodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokeinterface",
      "bipush",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder$BlockCodeBuilder",
        "name": "pop",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "bipush",
        "descriptor": "(I)Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  },
  "buildTransforming": {
    "method": "buildTransforming",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "ldc",
      "getstatic",
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
        "name": "withMethodBody",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;ILjava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "codeTransforming": {
    "method": "codeTransforming",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokedynamic",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "transforming",
        "descriptor": "(Ljava/lang/classfile/CodeTransform;Ljava/util/function/Consumer;)Ljava/lang/classfile/CodeBuilder;"
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
  "emitThree": {
    "method": "emitThree",
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
        "name": "iconst_3",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      }
    ]
  },
  "threeToFour": {
    "method": "threeToFour",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;Ljava/lang/classfile/CodeElement;)V",
    "requiredOpcodes": [
      "aload_1",
      "instanceof",
      "ifeq",
      "checkcast",
      "invokeinterface",
      "getstatic",
      "if_acmpne",
      "aload_0",
      "pop",
      "goto",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Instruction",
        "name": "opcode",
        "descriptor": "()Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "ICONST_3",
        "descriptor": "Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "iconst_4",
        "descriptor": "()Ljava/lang/classfile/CodeBuilder;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      }
    ]
  },
  "buildStateSource": {
    "method": "buildStateSource",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "ldc_w",
      "getstatic",
      "bipush",
      "invokeinterface",
      "invokedynamic",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassBuilder",
        "name": "withField",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/ClassDesc;I)Ljava/lang/classfile/ClassBuilder;"
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
  "codeEight": {
    "method": "codeEight",
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
  "codeNine": {
    "method": "codeNine",
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
  "newClass": {
    "method": "newClass",
    "descriptor": "()Ljava/lang/classfile/ClassTransform;",
    "requiredOpcodes": [
      "getstatic",
      "iconst_1",
      "iadd",
      "putstatic",
      "new",
      "dup",
      "invokespecial",
      "areturn"
    ]
  },
  "newField": {
    "method": "newField",
    "descriptor": "()Ljava/lang/classfile/FieldTransform;",
    "requiredOpcodes": [
      "getstatic",
      "iconst_1",
      "iadd",
      "putstatic",
      "new",
      "dup",
      "invokespecial",
      "areturn"
    ]
  },
  "newMethod": {
    "method": "newMethod",
    "descriptor": "()Ljava/lang/classfile/MethodTransform;",
    "requiredOpcodes": [
      "getstatic",
      "iconst_1",
      "iadd",
      "putstatic",
      "new",
      "dup",
      "invokespecial",
      "areturn"
    ]
  },
  "newCode": {
    "method": "newCode",
    "descriptor": "()Ljava/lang/classfile/CodeTransform;",
    "requiredOpcodes": [
      "getstatic",
      "iconst_1",
      "iadd",
      "putstatic",
      "new",
      "dup",
      "invokespecial",
      "areturn"
    ]
  },
  "ClassLife.atStart": {
    "className": "classes.modern_test.ClassFileCombinatorsFinal$ClassLife",
    "method": "atStart",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "getfield",
      "ifne",
      "iconst_1",
      "goto",
      "iconst_0",
      "invokestatic",
      "putfield",
      "getstatic",
      "iadd",
      "putstatic",
      "return"
    ]
  },
  "ClassLife.accept": {
    "className": "classes.modern_test.ClassFileCombinatorsFinal$ClassLife",
    "method": "accept",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;Ljava/lang/classfile/ClassElement;)V",
    "requiredOpcodes": [
      "aload_0",
      "getfield",
      "ifeq",
      "ifne",
      "iconst_1",
      "goto",
      "iconst_0",
      "invokestatic",
      "dup",
      "iadd",
      "putfield",
      "aload_1",
      "aload_2",
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
  "ClassLife.atEnd": {
    "className": "classes.modern_test.ClassFileCombinatorsFinal$ClassLife",
    "method": "atEnd",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "getfield",
      "ifeq",
      "ifne",
      "ifle",
      "iconst_1",
      "goto",
      "iconst_0",
      "invokestatic",
      "putfield",
      "getstatic",
      "iadd",
      "putstatic",
      "return"
    ]
  },
  "FieldLife.atStart": {
    "className": "classes.modern_test.ClassFileCombinatorsFinal$FieldLife",
    "method": "atStart",
    "descriptor": "(Ljava/lang/classfile/FieldBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "getfield",
      "ifne",
      "iconst_1",
      "goto",
      "iconst_0",
      "invokestatic",
      "putfield",
      "getstatic",
      "iadd",
      "putstatic",
      "return"
    ]
  },
  "FieldLife.accept": {
    "className": "classes.modern_test.ClassFileCombinatorsFinal$FieldLife",
    "method": "accept",
    "descriptor": "(Ljava/lang/classfile/FieldBuilder;Ljava/lang/classfile/FieldElement;)V",
    "requiredOpcodes": [
      "aload_0",
      "getfield",
      "ifeq",
      "ifne",
      "iconst_1",
      "goto",
      "iconst_0",
      "invokestatic",
      "dup",
      "iadd",
      "putfield",
      "aload_1",
      "aload_2",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.FieldBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      }
    ]
  },
  "FieldLife.atEnd": {
    "className": "classes.modern_test.ClassFileCombinatorsFinal$FieldLife",
    "method": "atEnd",
    "descriptor": "(Ljava/lang/classfile/FieldBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "getfield",
      "ifeq",
      "ifne",
      "ifle",
      "iconst_1",
      "goto",
      "iconst_0",
      "invokestatic",
      "putfield",
      "getstatic",
      "iadd",
      "putstatic",
      "return"
    ]
  },
  "MethodLife.atStart": {
    "className": "classes.modern_test.ClassFileCombinatorsFinal$MethodLife",
    "method": "atStart",
    "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "getfield",
      "ifne",
      "iconst_1",
      "goto",
      "iconst_0",
      "invokestatic",
      "putfield",
      "getstatic",
      "iadd",
      "putstatic",
      "return"
    ]
  },
  "MethodLife.accept": {
    "className": "classes.modern_test.ClassFileCombinatorsFinal$MethodLife",
    "method": "accept",
    "descriptor": "(Ljava/lang/classfile/MethodBuilder;Ljava/lang/classfile/MethodElement;)V",
    "requiredOpcodes": [
      "aload_0",
      "getfield",
      "ifeq",
      "ifne",
      "iconst_1",
      "goto",
      "iconst_0",
      "invokestatic",
      "aload_2",
      "instanceof",
      "dup",
      "iadd",
      "putfield",
      "aload_1",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.MethodBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      }
    ]
  },
  "MethodLife.atEnd": {
    "className": "classes.modern_test.ClassFileCombinatorsFinal$MethodLife",
    "method": "atEnd",
    "descriptor": "(Ljava/lang/classfile/MethodBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "getfield",
      "ifeq",
      "ifne",
      "iconst_1",
      "if_icmpne",
      "goto",
      "iconst_0",
      "invokestatic",
      "putfield",
      "getstatic",
      "iadd",
      "putstatic",
      "return"
    ]
  },
  "CodeLife.atStart": {
    "className": "classes.modern_test.ClassFileCombinatorsFinal$CodeLife",
    "method": "atStart",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "getfield",
      "ifne",
      "iconst_1",
      "goto",
      "iconst_0",
      "invokestatic",
      "putfield",
      "getstatic",
      "iadd",
      "putstatic",
      "return"
    ]
  },
  "CodeLife.accept": {
    "className": "classes.modern_test.ClassFileCombinatorsFinal$CodeLife",
    "method": "accept",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;Ljava/lang/classfile/CodeElement;)V",
    "requiredOpcodes": [
      "aload_0",
      "getfield",
      "ifeq",
      "ifne",
      "iconst_1",
      "goto",
      "iconst_0",
      "invokestatic",
      "aload_2",
      "instanceof",
      "dup",
      "iadd",
      "putfield",
      "aload_1",
      "invokeinterface",
      "pop",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.CodeBuilder",
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      }
    ]
  },
  "CodeLife.atEnd": {
    "className": "classes.modern_test.ClassFileCombinatorsFinal$CodeLife",
    "method": "atEnd",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "getfield",
      "ifeq",
      "ifne",
      "iconst_2",
      "if_icmpne",
      "iconst_1",
      "goto",
      "iconst_0",
      "invokestatic",
      "putfield",
      "getstatic",
      "iadd",
      "putstatic",
      "return"
    ]
  },
  "buildChainSource": {
    "method": "buildChainSource",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "invokestatic",
      "ldc",
      "getstatic",
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
        "name": "withMethodBody",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;ILjava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "codeThreeReturn": {
    "method": "codeThreeReturn",
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
        "name": "iconst_3",
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
  "fourToSix": {
    "method": "fourToSix",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;Ljava/lang/classfile/CodeElement;)V",
    "requiredOpcodes": [
      "aload_1",
      "instanceof",
      "ifeq",
      "checkcast",
      "invokeinterface",
      "getstatic",
      "if_acmpne",
      "aload_0",
      "bipush",
      "pop",
      "goto",
      "return"
    ],
    "symbolicOperands": [
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.Instruction",
        "name": "opcode",
        "descriptor": "()Ljava/lang/classfile/Opcode;"
      },
      {
        "opcode": "getstatic",
        "tag": 9,
        "owner": "java.lang.classfile.Opcode",
        "name": "ICONST_4",
        "descriptor": "Ljava/lang/classfile/Opcode;"
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
        "name": "with",
        "descriptor": "(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;"
      }
    ]
  },
  "codeEnd": {
    "method": "codeEnd",
    "descriptor": "(Ljava/lang/classfile/CodeBuilder;)V",
    "requiredOpcodes": [
      "getstatic",
      "iconst_1",
      "iadd",
      "putstatic",
      "return"
    ]
  },
  "classEnd": {
    "method": "classEnd",
    "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
    "requiredOpcodes": [
      "getstatic",
      "iconst_1",
      "iadd",
      "putstatic",
      "aload_0",
      "ldc",
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
        "name": "withField",
        "descriptor": "(Ljava/lang/String;Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)Ljava/lang/classfile/ClassBuilder;"
      }
    ]
  },
  "endedField": {
    "method": "endedField",
    "descriptor": "(Ljava/lang/classfile/FieldBuilder;)V",
    "requiredOpcodes": [
      "aload_0",
      "bipush",
      "invokeinterface",
      "iconst_1",
      "invokestatic",
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
      }
    ]
  }
});
export default group("classfile-declarations-combinators","ClassFileCombinatorsFinal","CLASSFILE_COMBINATORS_OK",["ClassFileCombinatorsFinal$ClassLife","ClassFileCombinatorsFinal$CodeLife","ClassFileCombinatorsFinal$FieldLife","ClassFileCombinatorsFinal$MethodLife"],[
  entry("cf-combinator-block","caseBlock","block=distinct-start/end/break;INT/LONG-child-locals=slot2-reused;parent-allocation=slot2;values=7/0;verify=empty;defined/invoked=same-bytes",[callbacks["flags"],callbacks["buildBlock"],callbacks["codeBlock"],callbacks["blockFirst"],callbacks["blockSecond"]],[
  {
    "id": "combinator-block",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dBlockCombinator",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [],
    "methods": [
      {
        "name": "value",
        "descriptor": "(I)I",
        "flags": 9,
        "opcodes": [
          "iconst_0",
          "istore_1",
          "bipush",
          "istore_2",
          "iload_0",
          "ifne",
          "iload_2",
          "istore_1",
          "lconst_1",
          "lstore_2",
          "iload_1",
          "ireturn"
        ]
      }
    ],
    "sourceFile": null,
    "branches": true,
    "handlers": false
  }
],[
  {
    "method": "caseBlock",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "iconst_m1",
      "dup",
      "putstatic",
      "aload_0",
      "ldc_w",
      "invokedynamic",
      "invokeinterface",
      "astore_1",
      "getstatic",
      "iconst_2",
      "if_icmpne",
      "aload_1",
      "ifeq",
      "iconst_1",
      "goto",
      "iconst_0",
      "astore_2",
      "aload_2",
      "invokevirtual",
      "astore_3",
      "aload_3",
      "ldc",
      "astore",
      "aload",
      "bipush",
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
  entry("cf-combinator-if-then","caseIfThen","ifThen=default-IFNE/inverted-real-branch;shared-local-join=typed;values=0/11;verify=empty;defined/invoked=same-bytes",[callbacks["flags"],callbacks["buildIfThen"],callbacks["codeIfThen"],callbacks["thenEleven"]],[
  {
    "id": "combinator-if-then",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dIfThenCombinator",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [],
    "methods": [
      {
        "name": "value",
        "descriptor": "(I)I",
        "flags": 9,
        "opcodes": [
          "iconst_0",
          "istore_1",
          "iload_0",
          "ifeq",
          "bipush",
          "istore_1",
          "iload_1",
          "ireturn"
        ]
      }
    ],
    "sourceFile": null,
    "branches": true,
    "handlers": false
  }
],[
  {
    "method": "caseIfThen",
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
      "iconst_0",
      "ifne",
      "bipush",
      "if_icmpne",
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
  entry("cf-combinator-if-else","caseIfElse","ifThenElse=IF_ICMPGT/inverted-real-branch;stack-INT-join=typed;values=17/19;verify=empty;defined/invoked=same-bytes",[callbacks["flags"],callbacks["buildIfElse"],callbacks["codeIfElse"],callbacks["thenSeventeen"],callbacks["elseNineteen"]],[
  {
    "id": "combinator-if-else",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dIfElseCombinator",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [],
    "methods": [
      {
        "name": "value",
        "descriptor": "(II)I",
        "flags": 9,
        "opcodes": [
          "iload_0",
          "iload_1",
          "if_icmple",
          "bipush",
          "goto",
          "bipush",
          "ireturn"
        ]
      }
    ],
    "sourceFile": null,
    "branches": true,
    "handlers": false
  }
],[
  {
    "method": "caseIfElse",
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
      "iconst_1",
      "anewarray",
      "dup",
      "iconst_0",
      "aastore",
      "astore",
      "aload",
      "bipush",
      "iconst_3",
      "if_icmpne",
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
        "descriptor": "(II)I"
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
  entry("cf-combinator-try-catch","caseTry","trying=protected-IDIV/ArithmeticException-catch;handler-and-join-frames=typed;values=4/-1;verify=empty;defined/invoked=same-bytes",[callbacks["flags"],callbacks["buildTry"],callbacks["codeTry"],callbacks["tryDivide"],callbacks["divideCatch"],callbacks["divideFailure"]],[
  {
    "id": "combinator-try",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dTryCombinator",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [],
    "methods": [
      {
        "name": "value",
        "descriptor": "(I)I",
        "flags": 9,
        "opcodes": [
          "bipush",
          "iload_0",
          "idiv",
          "goto",
          "pop",
          "iconst_m1",
          "ireturn"
        ]
      }
    ],
    "sourceFile": null,
    "branches": true,
    "handlers": true
  }
],[
  {
    "method": "caseTry",
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
      "iconst_0",
      "checkcast",
      "invokevirtual",
      "iconst_1",
      "if_icmpne",
      "ifeq",
      "goto",
      "astore_2",
      "aload_2",
      "astore_3",
      "aload_3",
      "ldc",
      "getstatic",
      "astore",
      "aload",
      "iconst_3",
      "iconst_4",
      "iconst_m1",
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
  entry("cf-combinator-try-multi-all","caseMulti","catchingMulti=2-typed-entries/shared-handler;catchingAll=third-entry;real-handler-index/order=preserved;values=9/21/21/22;verify=empty;defined/invoked=same-bytes",[callbacks["flags"],callbacks["buildMulti"],callbacks["codeMulti"],callbacks["tryThrow"],callbacks["multiCatch"],callbacks["specificFailure"],callbacks["anyFailure"]],[
  {
    "id": "combinator-multi",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dMultiCatchCombinator",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [],
    "methods": [
      {
        "name": "value",
        "descriptor": "(ILjava/lang/Throwable;)I",
        "flags": 9,
        "opcodes": [
          "aload_1",
          "ifnull",
          "aload_1",
          "athrow",
          "bipush",
          "goto",
          "pop",
          "bipush",
          "goto",
          "pop",
          "bipush",
          "ireturn"
        ]
      }
    ],
    "sourceFile": null,
    "branches": true,
    "handlers": true
  }
],[
  {
    "method": "caseMulti",
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
      "iconst_0",
      "checkcast",
      "invokevirtual",
      "iconst_3",
      "if_icmpne",
      "ifeq",
      "iconst_1",
      "goto",
      "astore_2",
      "aload_2",
      "astore_3",
      "aload_3",
      "ldc",
      "getstatic",
      "anewarray",
      "dup",
      "aastore",
      "astore",
      "aload",
      "aconst_null",
      "bipush",
      "new",
      "invokespecial",
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
        "descriptor": "(ILjava/lang/Throwable;)I"
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
  entry("cf-combinator-transforming","caseTransforming","CodeBuilder.transforming=real-consumer-stage;ICONST3-to4;value=4;verify=empty;defined/invoked=same-bytes",[callbacks["buildTransforming"],callbacks["codeTransforming"],callbacks["emitThree"],callbacks["threeToFour"]],[
  {
    "id": "combinator-transforming",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dDirectTransforming",
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
          "iconst_4",
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
    "method": "caseTransforming",
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
      "iconst_4",
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
  entry("cf-combinator-stateful","caseStateful","ofStateful=Class/Field/Method/Code;factories/start/end=2/2/4/4;per-instance-state=isolated;two-owned-arrays=8/9;verify=empty;defined/invoked=each-same-bytes",[callbacks["buildStateSource"],callbacks["codeEight"],callbacks["codeNine"],callbacks["newClass"],callbacks["newField"],callbacks["newMethod"],callbacks["newCode"],callbacks["ClassLife.atStart"],callbacks["ClassLife.accept"],callbacks["ClassLife.atEnd"],callbacks["FieldLife.atStart"],callbacks["FieldLife.accept"],callbacks["FieldLife.atEnd"],callbacks["MethodLife.atStart"],callbacks["MethodLife.accept"],callbacks["MethodLife.atEnd"],callbacks["CodeLife.atStart"],callbacks["CodeLife.accept"],callbacks["CodeLife.atEnd"]],[
  {
    "id": "combinator-state-first",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dStateFirst",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [
      {
        "name": "marker",
        "descriptor": "I",
        "flags": 9
      }
    ],
    "methods": [
      {
        "name": "first",
        "descriptor": "()I",
        "flags": 9,
        "opcodes": [
          "bipush",
          "ireturn"
        ]
      },
      {
        "name": "second",
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
  },
  {
    "id": "combinator-state-second",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dStateSecond",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [
      {
        "name": "marker",
        "descriptor": "I",
        "flags": 9
      }
    ],
    "methods": [
      {
        "name": "first",
        "descriptor": "()I",
        "flags": 9,
        "opcodes": [
          "bipush",
          "ireturn"
        ]
      },
      {
        "name": "second",
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
    "method": "caseStateful",
    "descriptor": "()V",
    "requiredOpcodes": [
      "iconst_0",
      "dup",
      "putstatic",
      "invokestatic",
      "astore_0",
      "aload_0",
      "ldc_w",
      "invokedynamic",
      "invokeinterface",
      "astore_1",
      "astore_2",
      "aload_1",
      "aload_2",
      "astore_3",
      "astore",
      "getstatic",
      "iconst_2",
      "if_icmpne",
      "iconst_4",
      "aload_3",
      "ifeq",
      "aload",
      "iconst_1",
      "goto",
      "invokevirtual",
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
        "tag": 11,
        "owner": "java.lang.classfile.ClassTransform",
        "name": "ofStateful",
        "descriptor": "(Ljava/util/function/Supplier;)Ljava/lang/classfile/ClassTransform;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.FieldTransform",
        "name": "ofStateful",
        "descriptor": "(Ljava/util/function/Supplier;)Ljava/lang/classfile/FieldTransform;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassTransform",
        "name": "transformingFields",
        "descriptor": "(Ljava/lang/classfile/FieldTransform;)Ljava/lang/classfile/ClassTransform;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassTransform",
        "name": "andThen",
        "descriptor": "(Ljava/lang/classfile/ClassTransform;)Ljava/lang/classfile/ClassTransform;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.MethodTransform",
        "name": "ofStateful",
        "descriptor": "(Ljava/util/function/Supplier;)Ljava/lang/classfile/MethodTransform;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassTransform",
        "name": "transformingMethods",
        "descriptor": "(Ljava/lang/classfile/MethodTransform;)Ljava/lang/classfile/ClassTransform;"
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
        "owner": "java.lang.classfile.ClassTransform",
        "name": "transformingMethodBodies",
        "descriptor": "(Ljava/lang/classfile/CodeTransform;)Ljava/lang/classfile/ClassTransform;"
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
  entry("cf-combinator-chain","caseChain","andThen=3-to4-to6;Code/Class-endHandler=once/in-order;late-ended-field=ConstantValue1;value=6;verify=empty;defined/invoked=same-bytes",[callbacks["buildChainSource"],callbacks["codeThreeReturn"],callbacks["threeToFour"],callbacks["fourToSix"],callbacks["codeEnd"],callbacks["classEnd"],callbacks["endedField"]],[
  {
    "id": "combinator-chain",
    "kind": "valid-generated",
    "className": "classes.modern_test.C7dChainedTransforms",
    "major": 69,
    "minor": 0,
    "flags": 33,
    "definition": "define-and-invoke",
    "interfaces": [],
    "fields": [
      {
        "name": "ended",
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
    "method": "caseChain",
    "descriptor": "()V",
    "requiredOpcodes": [
      "invokestatic",
      "astore_0",
      "aload_0",
      "ldc_w",
      "invokedynamic",
      "invokeinterface",
      "astore_1",
      "iconst_0",
      "dup",
      "putstatic",
      "astore_2",
      "aload_2",
      "astore_3",
      "aload_1",
      "aload_3",
      "astore",
      "getstatic",
      "iconst_1",
      "if_icmpne",
      "aload",
      "ifeq",
      "goto",
      "invokevirtual",
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
        "owner": "java.lang.classfile.CodeTransform",
        "name": "andThen",
        "descriptor": "(Ljava/lang/classfile/CodeTransform;)Ljava/lang/classfile/CodeTransform;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.CodeTransform",
        "name": "endHandler",
        "descriptor": "(Ljava/util/function/Consumer;)Ljava/lang/classfile/CodeTransform;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassTransform",
        "name": "transformingMethodBodies",
        "descriptor": "(Ljava/lang/classfile/CodeTransform;)Ljava/lang/classfile/ClassTransform;"
      },
      {
        "opcode": "invokestatic",
        "tag": 11,
        "owner": "java.lang.classfile.ClassTransform",
        "name": "endHandler",
        "descriptor": "(Ljava/util/function/Consumer;)Ljava/lang/classfile/ClassTransform;"
      },
      {
        "opcode": "invokeinterface",
        "tag": 11,
        "owner": "java.lang.classfile.ClassTransform",
        "name": "andThen",
        "descriptor": "(Ljava/lang/classfile/ClassTransform;)Ljava/lang/classfile/ClassTransform;"
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
        "owner": "java.lang.classfile.ClassModel",
        "name": "fields",
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
])
]);
