// Fixed eight-case original stock Java25 callers per C7d5 group.
// Compilation and each host's own arrays are independently replayed; no runtime oracle population.
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export default freeze([
  {
    "id": "classfile-structural-legacy",
    "source": "classes/modern_fixture/ClassFileLegacyFinal.java",
    "mainClass": "classes.modern_test.ClassFileLegacyFinal",
    "completionMarker": "CLASSFILE_LEGACY_OK",
    "additionalSources": [
      "classes/modern_fixture/classfile/ClassFileSupport.java"
    ],
    "driverClassNames": [
      "classes.modern_test.ClassFileLegacyFinal",
      "classes.modern_test.ClassFileLegacyFinal$Action",
      "classes.modern_test.ClassFileLegacyFinal$Loader",
      "classes.modern_test.ClassFileLegacyFinal$Relocator",
      "classes.modern_test.ClassFileSupport"
    ],
    "resourceClassNames": [],
    "javacFlags": [
      "-g",
      "-parameters"
    ],
    "releases": [
      25
    ],
    "cases": [
      {
        "id": "cf-legacy-jsr-models",
        "entryMethod": "caseJsrModels",
        "entryDescriptor": "()V",
        "trace": [
          "JSR/JSR_W=3/5;real-label-identity;parents=Instruction/DiscontinuedInstruction;bad-kind/null-op/null-target=IAE/NPE/NPE;artifact=none"
        ],
        "probes": [
          {
            "method": "caseJsrModels",
            "descriptor": "()V",
            "requiredOpcodes": [
              "invokestatic",
              "ldc",
              "invokedynamic",
              "invokeinterface",
              "pop",
              "getstatic",
              "astore_0",
              "astore_1",
              "aload_0",
              "if_acmpne",
              "iconst_3",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "aload_1",
              "iconst_5",
              "invokevirtual",
              "aaload",
              "ifeq",
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
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "factoryLabel",
                "descriptor": "Ljava/lang/classfile/Label;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/Label;)Ljava/lang/classfile/instruction/DiscontinuedInstruction$JsrInstruction;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "JSR_W",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Label;)Ljava/lang/classfile/instruction/DiscontinuedInstruction$JsrInstruction;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "JSR",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "sizeInBytes",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "target",
                "descriptor": "()Ljava/lang/classfile/Label;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Class",
                "name": "getInterfaces",
                "descriptor": "()[Ljava/lang/Class;"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.classfile.Instruction"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "failure",
                "descriptor": "(Lclasses/modern_test/ClassFileLegacyFinal$Action;)Ljava/lang/String;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.String",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
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
        ],
        "callbackMethods": [
          {
            "method": "labels",
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_int",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.MethodTypeDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "failure",
            "descriptor": "(Lclasses/modern_test/ClassFileLegacyFinal$Action;)Ljava/lang/String;",
            "requiredOpcodes": [
              "aload_0",
              "invokeinterface",
              "new",
              "dup",
              "ldc",
              "invokespecial",
              "athrow",
              "astore_1",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "classes.modern_test.ClassFileLegacyFinal$Action",
                "name": "run",
                "descriptor": "()V"
              },
              {
                "opcode": "new",
                "tag": 7,
                "value": "java.lang.AssertionError"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "java.lang.AssertionError",
                "name": "<init>",
                "descriptor": "(Ljava/lang/Object;)V"
              }
            ]
          },
          {
            "method": "wrongJsr",
            "descriptor": "()V",
            "requiredOpcodes": [
              "getstatic",
              "aconst_null",
              "invokestatic",
              "pop",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "RET",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Label;)Ljava/lang/classfile/instruction/DiscontinuedInstruction$JsrInstruction;"
              }
            ]
          },
          {
            "method": "nullJsrOpcode",
            "descriptor": "()V",
            "requiredOpcodes": [
              "aconst_null",
              "invokestatic",
              "pop",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Label;)Ljava/lang/classfile/instruction/DiscontinuedInstruction$JsrInstruction;"
              }
            ]
          },
          {
            "method": "nullJsrTarget",
            "descriptor": "()V",
            "requiredOpcodes": [
              "aconst_null",
              "checkcast",
              "invokestatic",
              "pop",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.Label"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/Label;)Ljava/lang/classfile/instruction/DiscontinuedInstruction$JsrInstruction;"
              }
            ]
          }
        ],
        "artifacts": [],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-legacy-ret-models",
        "entryMethod": "caseRetModels",
        "entryDescriptor": "()V",
        "trace": [
          "slots=0/255:RET,256/65535:RET_W;explicit-RET_W1=size4;bad-slot/kind=IAE;null-op=NPE;artifact=none"
        ],
        "probes": [
          {
            "method": "caseRetModels",
            "descriptor": "()V",
            "requiredOpcodes": [
              "iconst_0",
              "invokestatic",
              "invokeinterface",
              "getstatic",
              "if_acmpne",
              "sipush",
              "iconst_1",
              "goto",
              "ldc",
              "if_icmpne",
              "iconst_4",
              "invokevirtual",
              "aaload",
              "invokedynamic",
              "ifeq",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "of",
                "descriptor": "(I)Ljava/lang/classfile/instruction/DiscontinuedInstruction$RetInstruction;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "RET",
                "descriptor": "Ljava/lang/classfile/Opcode;"
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
                "owner": "java.lang.classfile.Opcode",
                "name": "RET_W",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "slot",
                "descriptor": "()I"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/Opcode;I)Ljava/lang/classfile/instruction/DiscontinuedInstruction$RetInstruction;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "sizeInBytes",
                "descriptor": "()I"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Class",
                "name": "getInterfaces",
                "descriptor": "()[Ljava/lang/Class;"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "failure",
                "descriptor": "(Lclasses/modern_test/ClassFileLegacyFinal$Action;)Ljava/lang/String;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.String",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
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
        ],
        "callbackMethods": [
          {
            "method": "failure",
            "descriptor": "(Lclasses/modern_test/ClassFileLegacyFinal$Action;)Ljava/lang/String;",
            "requiredOpcodes": [
              "aload_0",
              "invokeinterface",
              "new",
              "dup",
              "ldc",
              "invokespecial",
              "athrow",
              "astore_1",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "classes.modern_test.ClassFileLegacyFinal$Action",
                "name": "run",
                "descriptor": "()V"
              },
              {
                "opcode": "new",
                "tag": 7,
                "value": "java.lang.AssertionError"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "java.lang.AssertionError",
                "name": "<init>",
                "descriptor": "(Ljava/lang/Object;)V"
              }
            ]
          },
          {
            "method": "negativeRet",
            "descriptor": "()V",
            "requiredOpcodes": [
              "iconst_m1",
              "invokestatic",
              "pop",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "of",
                "descriptor": "(I)Ljava/lang/classfile/instruction/DiscontinuedInstruction$RetInstruction;"
              }
            ]
          },
          {
            "method": "overflowRet",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc",
              "invokestatic",
              "pop",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "of",
                "descriptor": "(I)Ljava/lang/classfile/instruction/DiscontinuedInstruction$RetInstruction;"
              }
            ]
          },
          {
            "method": "shortRetOverflow",
            "descriptor": "()V",
            "requiredOpcodes": [
              "getstatic",
              "sipush",
              "invokestatic",
              "pop",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "RET",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/Opcode;I)Ljava/lang/classfile/instruction/DiscontinuedInstruction$RetInstruction;"
              }
            ]
          },
          {
            "method": "wrongRet",
            "descriptor": "()V",
            "requiredOpcodes": [
              "getstatic",
              "iconst_0",
              "invokestatic",
              "pop",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "JSR",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/Opcode;I)Ljava/lang/classfile/instruction/DiscontinuedInstruction$RetInstruction;"
              }
            ]
          },
          {
            "method": "nullRet",
            "descriptor": "()V",
            "requiredOpcodes": [
              "aconst_null",
              "iconst_0",
              "invokestatic",
              "pop",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/Opcode;I)Ljava/lang/classfile/instruction/DiscontinuedInstruction$RetInstruction;"
              }
            ]
          }
        ],
        "artifacts": [],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-legacy-jsr-ret",
        "entryMethod": "caseShort",
        "entryDescriptor": "()V",
        "trace": [
          "major49;JSR/RET=typed;maxStack/Locals=2/2;verify=inference-unsupported;value=42;defined/invoked=same-bytes"
        ],
        "probes": [
          {
            "method": "caseShort",
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
              "getstatic",
              "iconst_1",
              "new",
              "dup",
              "invokespecial",
              "invokevirtual",
              "astore_2",
              "aload_2",
              "bipush",
              "if_icmpne",
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
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "code",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "JSR",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "RET",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/attribute/CodeAttribute;Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Opcode;I)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "inference",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "artifact",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "new",
                "tag": 7,
                "value": "classes.modern_test.ClassFileLegacyFinal$Loader"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal$Loader",
                "name": "<init>",
                "descriptor": "()V"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal$Loader",
                "name": "define",
                "descriptor": "([B)Ljava/lang/Class;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "invoke",
                "descriptor": "(Ljava/lang/Class;)I"
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
                "name": "emit",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
              }
            ]
          }
        ],
        "callbackMethods": [
          {
            "method": "classShort",
            "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
            "requiredOpcodes": [
              "aload_0",
              "bipush",
              "invokeinterface",
              "iconst_0",
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
                "name": "withVersion",
                "descriptor": "(II)Ljava/lang/classfile/ClassBuilder;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_int",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.MethodTypeDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "code",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "aload_2",
              "bipush",
              "if_icmpeq",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "checkcast",
              "invokevirtual",
              "areturn"
            ],
            "symbolicOperands": [
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
                "name": "majorVersion",
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
                "owner": "java.lang.classfile.ClassModel",
                "name": "methods",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.CodeAttribute"
              }
            ]
          },
          {
            "method": "inference",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "aload_2",
              "iconst_1",
              "if_icmpne",
              "iconst_0",
              "checkcast",
              "invokevirtual",
              "ldc_w",
              "ifeq",
              "goto",
              "invokestatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "size",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.VerifyError",
                "name": "getMessage",
                "descriptor": "()Ljava/lang/String;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.String",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/attribute/CodeAttribute;Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Opcode;I)V",
            "requiredOpcodes": [
              "iconst_0",
              "istore",
              "aload_0",
              "invokeinterface",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "instanceof",
              "aload_1",
              "if_acmpne",
              "ifle",
              "iconst_1",
              "goto",
              "invokestatic",
              "iinc",
              "aload_2",
              "iload_3",
              "if_icmpne",
              "iload",
              "iadd",
              "iconst_2",
              "invokevirtual",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "elementList",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "target",
                "descriptor": "()Ljava/lang/classfile/Label;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "labelToBci",
                "descriptor": "(Ljava/lang/classfile/Label;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "slot",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "maxLocals",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "maxStack",
                "descriptor": "()I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.classfile.Attributes",
                "name": "stackMapTable",
                "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "findAttribute",
                "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "isEmpty",
                "descriptor": "()Z"
              }
            ]
          },
          {
            "method": "invoke",
            "descriptor": "(Ljava/lang/Class;)I",
            "requiredOpcodes": [
              "invokestatic",
              "aload_0",
              "ldc",
              "getstatic",
              "invokevirtual",
              "astore_1",
              "aload_1",
              "ireturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandles",
                "name": "lookup",
                "descriptor": "()Ljava/lang/invoke/MethodHandles$Lookup;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.Integer",
                "name": "TYPE",
                "descriptor": "Ljava/lang/Class;"
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
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "legacy-jsr-ret",
            "className": "classes.modern_test.C7d5JsrRet",
            "major": 49,
            "definition": "define-and-invoke",
            "verification": "inference-unsupported-bytes"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-legacy-jsrw-ret",
        "entryMethod": "caseWideJump",
        "entryDescriptor": "()V",
        "trace": [
          "major49;JSR_W/RET=typed;maxStack/Locals=2/2;signed32-target;verify=inference-unsupported;value=42;defined/invoked=same-bytes"
        ],
        "probes": [
          {
            "method": "caseWideJump",
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
              "getstatic",
              "iconst_1",
              "new",
              "dup",
              "invokespecial",
              "invokevirtual",
              "astore_2",
              "aload_2",
              "bipush",
              "if_icmpne",
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
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "code",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "JSR_W",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "RET",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/attribute/CodeAttribute;Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Opcode;I)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "inference",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "artifact",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "new",
                "tag": 7,
                "value": "classes.modern_test.ClassFileLegacyFinal$Loader"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal$Loader",
                "name": "<init>",
                "descriptor": "()V"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal$Loader",
                "name": "define",
                "descriptor": "([B)Ljava/lang/Class;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "invoke",
                "descriptor": "(Ljava/lang/Class;)I"
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
                "name": "emit",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
              }
            ]
          }
        ],
        "callbackMethods": [
          {
            "method": "classWideJump",
            "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
            "requiredOpcodes": [
              "aload_0",
              "bipush",
              "invokeinterface",
              "iconst_0",
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
                "name": "withVersion",
                "descriptor": "(II)Ljava/lang/classfile/ClassBuilder;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_int",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.MethodTypeDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "code",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "aload_2",
              "bipush",
              "if_icmpeq",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "checkcast",
              "invokevirtual",
              "areturn"
            ],
            "symbolicOperands": [
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
                "name": "majorVersion",
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
                "owner": "java.lang.classfile.ClassModel",
                "name": "methods",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.CodeAttribute"
              }
            ]
          },
          {
            "method": "inference",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "aload_2",
              "iconst_1",
              "if_icmpne",
              "iconst_0",
              "checkcast",
              "invokevirtual",
              "ldc_w",
              "ifeq",
              "goto",
              "invokestatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "size",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.VerifyError",
                "name": "getMessage",
                "descriptor": "()Ljava/lang/String;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.String",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/attribute/CodeAttribute;Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Opcode;I)V",
            "requiredOpcodes": [
              "iconst_0",
              "istore",
              "aload_0",
              "invokeinterface",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "instanceof",
              "aload_1",
              "if_acmpne",
              "ifle",
              "iconst_1",
              "goto",
              "invokestatic",
              "iinc",
              "aload_2",
              "iload_3",
              "if_icmpne",
              "iload",
              "iadd",
              "iconst_2",
              "invokevirtual",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "elementList",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "target",
                "descriptor": "()Ljava/lang/classfile/Label;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "labelToBci",
                "descriptor": "(Ljava/lang/classfile/Label;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "slot",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "maxLocals",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "maxStack",
                "descriptor": "()I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.classfile.Attributes",
                "name": "stackMapTable",
                "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "findAttribute",
                "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "isEmpty",
                "descriptor": "()Z"
              }
            ]
          },
          {
            "method": "invoke",
            "descriptor": "(Ljava/lang/Class;)I",
            "requiredOpcodes": [
              "invokestatic",
              "aload_0",
              "ldc",
              "getstatic",
              "invokevirtual",
              "astore_1",
              "aload_1",
              "ireturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandles",
                "name": "lookup",
                "descriptor": "()Ljava/lang/invoke/MethodHandles$Lookup;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.Integer",
                "name": "TYPE",
                "descriptor": "Ljava/lang/Class;"
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
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "legacy-jsrw-ret",
            "className": "classes.modern_test.C7d5JsrWideRet",
            "major": 49,
            "definition": "define-and-invoke",
            "verification": "inference-unsupported-bytes"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-legacy-jsr-retw",
        "entryMethod": "caseWideRet",
        "entryDescriptor": "()V",
        "trace": [
          "major49;JSR/RET_W=typed;maxStack/Locals=2/301;wide-ret-slot300;verify=inference-unsupported;value=42;defined/invoked=same-bytes"
        ],
        "probes": [
          {
            "method": "caseWideRet",
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
              "getstatic",
              "sipush",
              "new",
              "dup",
              "invokespecial",
              "invokevirtual",
              "astore_2",
              "aload_2",
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
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "code",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "JSR",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "RET_W",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/attribute/CodeAttribute;Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Opcode;I)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "inference",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "artifact",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "new",
                "tag": 7,
                "value": "classes.modern_test.ClassFileLegacyFinal$Loader"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal$Loader",
                "name": "<init>",
                "descriptor": "()V"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal$Loader",
                "name": "define",
                "descriptor": "([B)Ljava/lang/Class;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "invoke",
                "descriptor": "(Ljava/lang/Class;)I"
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
                "name": "emit",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
              }
            ]
          }
        ],
        "callbackMethods": [
          {
            "method": "classWideRet",
            "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
            "requiredOpcodes": [
              "aload_0",
              "bipush",
              "invokeinterface",
              "iconst_0",
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
                "name": "withVersion",
                "descriptor": "(II)Ljava/lang/classfile/ClassBuilder;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_int",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.MethodTypeDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "code",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "aload_2",
              "bipush",
              "if_icmpeq",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "checkcast",
              "invokevirtual",
              "areturn"
            ],
            "symbolicOperands": [
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
                "name": "majorVersion",
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
                "owner": "java.lang.classfile.ClassModel",
                "name": "methods",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.CodeAttribute"
              }
            ]
          },
          {
            "method": "inference",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "aload_2",
              "iconst_1",
              "if_icmpne",
              "iconst_0",
              "checkcast",
              "invokevirtual",
              "ldc_w",
              "ifeq",
              "goto",
              "invokestatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "size",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.VerifyError",
                "name": "getMessage",
                "descriptor": "()Ljava/lang/String;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.String",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/attribute/CodeAttribute;Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Opcode;I)V",
            "requiredOpcodes": [
              "iconst_0",
              "istore",
              "aload_0",
              "invokeinterface",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "instanceof",
              "aload_1",
              "if_acmpne",
              "ifle",
              "iconst_1",
              "goto",
              "invokestatic",
              "iinc",
              "aload_2",
              "iload_3",
              "if_icmpne",
              "iload",
              "iadd",
              "iconst_2",
              "invokevirtual",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "elementList",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "target",
                "descriptor": "()Ljava/lang/classfile/Label;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "labelToBci",
                "descriptor": "(Ljava/lang/classfile/Label;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "slot",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "maxLocals",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "maxStack",
                "descriptor": "()I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.classfile.Attributes",
                "name": "stackMapTable",
                "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "findAttribute",
                "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "isEmpty",
                "descriptor": "()Z"
              }
            ]
          },
          {
            "method": "invoke",
            "descriptor": "(Ljava/lang/Class;)I",
            "requiredOpcodes": [
              "invokestatic",
              "aload_0",
              "ldc",
              "getstatic",
              "invokevirtual",
              "astore_1",
              "aload_1",
              "ireturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandles",
                "name": "lookup",
                "descriptor": "()Ljava/lang/invoke/MethodHandles$Lookup;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.Integer",
                "name": "TYPE",
                "descriptor": "Ljava/lang/Class;"
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
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "legacy-jsr-retw",
            "className": "classes.modern_test.C7d5JsrRetWide",
            "major": 49,
            "definition": "define-and-invoke",
            "verification": "inference-unsupported-bytes"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-legacy-jsrw-retw",
        "entryMethod": "caseBothWide",
        "entryDescriptor": "()V",
        "trace": [
          "major49;JSR_W/RET_W=typed;maxStack/Locals=2/2;explicit-small-wide-ret;verify=inference-unsupported;value=42;defined/invoked=same-bytes"
        ],
        "probes": [
          {
            "method": "caseBothWide",
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
              "getstatic",
              "iconst_1",
              "new",
              "dup",
              "invokespecial",
              "invokevirtual",
              "astore_2",
              "aload_2",
              "bipush",
              "if_icmpne",
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
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "code",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "JSR_W",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "RET_W",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/attribute/CodeAttribute;Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Opcode;I)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "inference",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "artifact",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "new",
                "tag": 7,
                "value": "classes.modern_test.ClassFileLegacyFinal$Loader"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal$Loader",
                "name": "<init>",
                "descriptor": "()V"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal$Loader",
                "name": "define",
                "descriptor": "([B)Ljava/lang/Class;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "invoke",
                "descriptor": "(Ljava/lang/Class;)I"
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
                "name": "emit",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;)V"
              }
            ]
          }
        ],
        "callbackMethods": [
          {
            "method": "classBothWide",
            "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
            "requiredOpcodes": [
              "aload_0",
              "bipush",
              "invokeinterface",
              "iconst_0",
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
                "name": "withVersion",
                "descriptor": "(II)Ljava/lang/classfile/ClassBuilder;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_int",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.MethodTypeDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "code",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "aload_2",
              "bipush",
              "if_icmpeq",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "checkcast",
              "invokevirtual",
              "areturn"
            ],
            "symbolicOperands": [
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
                "name": "majorVersion",
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
                "owner": "java.lang.classfile.ClassModel",
                "name": "methods",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.CodeAttribute"
              }
            ]
          },
          {
            "method": "inference",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "aload_2",
              "iconst_1",
              "if_icmpne",
              "iconst_0",
              "checkcast",
              "invokevirtual",
              "ldc_w",
              "ifeq",
              "goto",
              "invokestatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "size",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.VerifyError",
                "name": "getMessage",
                "descriptor": "()Ljava/lang/String;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.String",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/attribute/CodeAttribute;Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Opcode;I)V",
            "requiredOpcodes": [
              "iconst_0",
              "istore",
              "aload_0",
              "invokeinterface",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "instanceof",
              "aload_1",
              "if_acmpne",
              "ifle",
              "iconst_1",
              "goto",
              "invokestatic",
              "iinc",
              "aload_2",
              "iload_3",
              "if_icmpne",
              "iload",
              "iadd",
              "iconst_2",
              "invokevirtual",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "elementList",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "target",
                "descriptor": "()Ljava/lang/classfile/Label;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "labelToBci",
                "descriptor": "(Ljava/lang/classfile/Label;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "slot",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "maxLocals",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "maxStack",
                "descriptor": "()I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.classfile.Attributes",
                "name": "stackMapTable",
                "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "findAttribute",
                "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "isEmpty",
                "descriptor": "()Z"
              }
            ]
          },
          {
            "method": "invoke",
            "descriptor": "(Ljava/lang/Class;)I",
            "requiredOpcodes": [
              "invokestatic",
              "aload_0",
              "ldc",
              "getstatic",
              "invokevirtual",
              "astore_1",
              "aload_1",
              "ireturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandles",
                "name": "lookup",
                "descriptor": "()Ljava/lang/invoke/MethodHandles$Lookup;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.Integer",
                "name": "TYPE",
                "descriptor": "Ljava/lang/Class;"
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
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "legacy-jsrw-retw",
            "className": "classes.modern_test.C7d5JsrWideRetWide",
            "major": 49,
            "definition": "define-and-invoke",
            "verification": "inference-unsupported-bytes"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-legacy-relocate-promote",
        "entryMethod": "caseRelocation",
        "entryDescriptor": "()V",
        "trace": [
          "major49;NEW_POOL;real-target/code-shift=33002;JSR-promoted-JSR_W;FAIL-short=IAE;verify=inference-unsupported;values=42/42;defined/invoked=each-same-bytes"
        ],
        "probes": [
          {
            "method": "caseRelocation",
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
              "iconst_1",
              "anewarray",
              "dup",
              "iconst_0",
              "getstatic",
              "aastore",
              "astore_3",
              "aload_3",
              "aload_2",
              "astore",
              "aload",
              "aconst_null",
              "ifeq",
              "checkcast",
              "instanceof",
              "goto",
              "isub",
              "if_icmpne",
              "new",
              "invokespecial",
              "invokevirtual",
              "bipush",
              "iconst_2",
              "pop",
              "athrow",
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
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
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
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.classfile.ClassFile$Option"
              },
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
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "code",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "JSR",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "RET",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/attribute/CodeAttribute;Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Opcode;I)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "JSR_W",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "elementList",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "target",
                "descriptor": "()Ljava/lang/classfile/Label;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "labelToBci",
                "descriptor": "(Ljava/lang/classfile/Label;)I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "codeLength",
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
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "inference",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "artifact",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "new",
                "tag": 7,
                "value": "classes.modern_test.ClassFileLegacyFinal$Loader"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal$Loader",
                "name": "<init>",
                "descriptor": "()V"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal$Loader",
                "name": "define",
                "descriptor": "([B)Ljava/lang/Class;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "invoke",
                "descriptor": "(Ljava/lang/Class;)I"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.ClassFile$ShortJumpsOption",
                "name": "FAIL_ON_SHORT_JUMPS",
                "descriptor": "Ljava/lang/classfile/ClassFile$ShortJumpsOption;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "transformClass",
                "descriptor": "(Ljava/lang/classfile/ClassModel;Ljava/lang/classfile/ClassTransform;)[B"
              },
              {
                "opcode": "new",
                "tag": 7,
                "value": "java.lang.AssertionError"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "java.lang.AssertionError",
                "name": "<init>",
                "descriptor": "(Ljava/lang/Object;)V"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.String",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
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
        ],
        "callbackMethods": [
          {
            "method": "classShort",
            "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
            "requiredOpcodes": [
              "aload_0",
              "bipush",
              "invokeinterface",
              "iconst_0",
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
                "name": "withVersion",
                "descriptor": "(II)Ljava/lang/classfile/ClassBuilder;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_int",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.MethodTypeDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "code",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "aload_2",
              "bipush",
              "if_icmpeq",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "checkcast",
              "invokevirtual",
              "areturn"
            ],
            "symbolicOperands": [
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
                "name": "majorVersion",
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
                "owner": "java.lang.classfile.ClassModel",
                "name": "methods",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.CodeAttribute"
              }
            ]
          },
          {
            "method": "inference",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "aload_2",
              "iconst_1",
              "if_icmpne",
              "iconst_0",
              "checkcast",
              "invokevirtual",
              "ldc_w",
              "ifeq",
              "goto",
              "invokestatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "size",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.VerifyError",
                "name": "getMessage",
                "descriptor": "()Ljava/lang/String;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.String",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/attribute/CodeAttribute;Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Opcode;I)V",
            "requiredOpcodes": [
              "iconst_0",
              "istore",
              "aload_0",
              "invokeinterface",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "instanceof",
              "aload_1",
              "if_acmpne",
              "ifle",
              "iconst_1",
              "goto",
              "invokestatic",
              "iinc",
              "aload_2",
              "iload_3",
              "if_icmpne",
              "iload",
              "iadd",
              "iconst_2",
              "invokevirtual",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "elementList",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "target",
                "descriptor": "()Ljava/lang/classfile/Label;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "labelToBci",
                "descriptor": "(Ljava/lang/classfile/Label;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "slot",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "maxLocals",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "maxStack",
                "descriptor": "()I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.classfile.Attributes",
                "name": "stackMapTable",
                "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "findAttribute",
                "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "isEmpty",
                "descriptor": "()Z"
              }
            ]
          },
          {
            "method": "invoke",
            "descriptor": "(Ljava/lang/Class;)I",
            "requiredOpcodes": [
              "invokestatic",
              "aload_0",
              "ldc",
              "getstatic",
              "invokevirtual",
              "astore_1",
              "aload_1",
              "ireturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandles",
                "name": "lookup",
                "descriptor": "()Ljava/lang/invoke/MethodHandles$Lookup;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.Integer",
                "name": "TYPE",
                "descriptor": "Ljava/lang/Class;"
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
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "legacy-relocation-source",
            "className": "classes.modern_test.C7d5LegacySource",
            "major": 49,
            "definition": "define-and-invoke",
            "verification": "inference-unsupported-bytes"
          },
          {
            "id": "legacy-relocation-output",
            "className": "classes.modern_test.C7d5LegacyRelocated",
            "major": 49,
            "definition": "define-and-invoke",
            "verification": "inference-unsupported-bytes"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-legacy-version-policy",
        "entryMethod": "caseVersionPolicy",
        "entryDescriptor": "()V",
        "trace": [
          "major50=fallback/inference-unsupported;GENERATE-major49/default-major51=IAE;DROP-major51=encodable/verify-errors;all-policy-packets=never-defined"
        ],
        "probes": [
          {
            "method": "caseVersionPolicy",
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
              "getstatic",
              "iconst_1",
              "ldc",
              "invokevirtual",
              "ifeq",
              "goto",
              "iconst_0",
              "anewarray",
              "dup",
              "aastore",
              "astore_2",
              "aload_2",
              "astore_3",
              "aload_3",
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
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "inference",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "code",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "JSR",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "RET",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/attribute/CodeAttribute;Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Opcode;I)V"
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
                "owner": "classes.modern_test.ClassFileLegacyFinal",
                "name": "failure",
                "descriptor": "(Lclasses/modern_test/ClassFileLegacyFinal$Action;)Ljava/lang/String;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.String",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.classfile.ClassFile$Option"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.ClassFile$StackMapsOption",
                "name": "DROP_STACK_MAPS",
                "descriptor": "Ljava/lang/classfile/ClassFile$StackMapsOption;"
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
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
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
        ],
        "callbackMethods": [
          {
            "method": "failure",
            "descriptor": "(Lclasses/modern_test/ClassFileLegacyFinal$Action;)Ljava/lang/String;",
            "requiredOpcodes": [
              "aload_0",
              "invokeinterface",
              "new",
              "dup",
              "ldc",
              "invokespecial",
              "athrow",
              "astore_1",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "classes.modern_test.ClassFileLegacyFinal$Action",
                "name": "run",
                "descriptor": "()V"
              },
              {
                "opcode": "new",
                "tag": 7,
                "value": "java.lang.AssertionError"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "java.lang.AssertionError",
                "name": "<init>",
                "descriptor": "(Ljava/lang/Object;)V"
              }
            ]
          },
          {
            "method": "code",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "aload_2",
              "bipush",
              "if_icmpeq",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "checkcast",
              "invokevirtual",
              "areturn"
            ],
            "symbolicOperands": [
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
                "name": "majorVersion",
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
                "owner": "java.lang.classfile.ClassModel",
                "name": "methods",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.CodeAttribute"
              }
            ]
          },
          {
            "method": "inference",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "aload_2",
              "iconst_1",
              "if_icmpne",
              "iconst_0",
              "checkcast",
              "invokevirtual",
              "ldc_w",
              "ifeq",
              "goto",
              "invokestatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "size",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.VerifyError",
                "name": "getMessage",
                "descriptor": "()Ljava/lang/String;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.String",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/attribute/CodeAttribute;Ljava/lang/classfile/Opcode;Ljava/lang/classfile/Opcode;I)V",
            "requiredOpcodes": [
              "iconst_0",
              "istore",
              "aload_0",
              "invokeinterface",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "instanceof",
              "aload_1",
              "if_acmpne",
              "ifle",
              "iconst_1",
              "goto",
              "invokestatic",
              "iinc",
              "aload_2",
              "iload_3",
              "if_icmpne",
              "iload",
              "iadd",
              "iconst_2",
              "invokevirtual",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "elementList",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$JsrInstruction",
                "name": "target",
                "descriptor": "()Ljava/lang/classfile/Label;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "labelToBci",
                "descriptor": "(Ljava/lang/classfile/Label;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.DiscontinuedInstruction$RetInstruction",
                "name": "slot",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "maxLocals",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "maxStack",
                "descriptor": "()I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.classfile.Attributes",
                "name": "stackMapTable",
                "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "findAttribute",
                "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "isEmpty",
                "descriptor": "()Z"
              }
            ]
          },
          {
            "method": "classFifty",
            "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
            "requiredOpcodes": [
              "aload_0",
              "bipush",
              "invokeinterface",
              "iconst_0",
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
                "name": "withVersion",
                "descriptor": "(II)Ljava/lang/classfile/ClassBuilder;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_int",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.MethodTypeDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "classFiftyOne",
            "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
            "requiredOpcodes": [
              "aload_0",
              "bipush",
              "invokeinterface",
              "iconst_0",
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
                "name": "withVersion",
                "descriptor": "(II)Ljava/lang/classfile/ClassBuilder;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_int",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.MethodTypeDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/constant/ClassDesc;)Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "generateOld",
            "descriptor": "()V",
            "requiredOpcodes": [
              "iconst_1",
              "anewarray",
              "dup",
              "iconst_0",
              "getstatic",
              "aastore",
              "invokestatic",
              "ldc_w",
              "invokedynamic",
              "invokeinterface",
              "pop",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.classfile.ClassFile$Option"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.ClassFile$StackMapsOption",
                "name": "GENERATE_STACK_MAPS",
                "descriptor": "Ljava/lang/classfile/ClassFile$StackMapsOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "([Ljava/lang/classfile/ClassFile$Option;)Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              }
            ]
          },
          {
            "method": "buildNew",
            "descriptor": "()V",
            "requiredOpcodes": [
              "invokestatic",
              "ldc_w",
              "invokedynamic",
              "invokeinterface",
              "pop",
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
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "legacy-major50-metadata",
            "className": "classes.modern_test.C7d5LegacyFifty",
            "major": 50,
            "definition": "never-define",
            "verification": "inference-unsupported-bytes"
          },
          {
            "id": "legacy-major51-invalid",
            "className": "classes.modern_test.C7d5LegacyInvalid51",
            "major": 51,
            "definition": "never-define",
            "verification": "nonempty-bytes"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      }
    ]
  },
  {
    "id": "classfile-structural-special",
    "source": "classes/modern_fixture/ClassFileSpecialInvokeFinal.java",
    "mainClass": "classes.modern_test.ClassFileSpecialInvokeFinal",
    "completionMarker": "CLASSFILE_SPECIAL_INVOKE_OK",
    "additionalSources": [
      "classes/modern_fixture/classfile/ClassFileSupport.java"
    ],
    "driverClassNames": [
      "classes.modern_test.ClassFileSpecialInvokeFinal",
      "classes.modern_test.ClassFileSpecialInvokeFinal$BaseApi",
      "classes.modern_test.ClassFileSpecialInvokeFinal$ChildApi",
      "classes.modern_test.ClassFileSpecialInvokeFinal$Grandparent",
      "classes.modern_test.ClassFileSpecialInvokeFinal$Parent",
      "classes.modern_test.ClassFileSupport"
    ],
    "resourceClassNames": [],
    "javacFlags": [
      "-g",
      "-parameters"
    ],
    "releases": [
      25
    ],
    "cases": [
      {
        "id": "cf-special-current-private",
        "entryMethod": "casePrivate",
        "entryDescriptor": "()V",
        "trace": [
          "owner=current;receiver=current;CP10;value=17;verify=empty;defined/invoked=same-bytes"
        ],
        "probes": [
          {
            "method": "casePrivate",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "invokestatic",
              "putstatic",
              "getstatic",
              "astore_0",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "astore_1",
              "aload_1",
              "bipush",
              "astore_2",
              "aload_2",
              "invokevirtual",
              "astore_3",
              "aload_3",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_Object",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "api",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "valid",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V"
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
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "invoke",
                "descriptor": "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/Class;I)V"
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
        ],
        "callbackMethods": [
          {
            "method": "api",
            "descriptor": "()Ljava/lang/classfile/ClassFile;",
            "requiredOpcodes": [
              "new",
              "dup",
              "invokespecial",
              "astore_0",
              "aload_0",
              "getstatic",
              "invokeinterface",
              "pop",
              "invokestatic",
              "astore_1",
              "iconst_2",
              "anewarray",
              "iconst_0",
              "aastore",
              "iconst_1",
              "aload_1",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "new",
                "tag": 7,
                "value": "java.util.HashMap"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "java.util.HashMap",
                "name": "<init>",
                "descriptor": "()V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Map",
                "name": "put",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "PARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "GRANDPARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_Object",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "BASE_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "CHILD_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.util.List",
                "name": "of",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/util/List;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "of",
                "descriptor": "(Ljava/util/Collection;Ljava/util/Map;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "defaultResolver",
                "descriptor": "()Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "orElse",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.classfile.ClassFile$Option"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.ClassFile$StackMapsOption",
                "name": "DROP_STACK_MAPS",
                "descriptor": "Ljava/lang/classfile/ClassFile$StackMapsOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile$ClassHierarchyResolverOption",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassFile$ClassHierarchyResolverOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "([Ljava/lang/classfile/ClassFile$Option;)Ljava/lang/classfile/ClassFile;"
              }
            ]
          },
          {
            "method": "buildPrivate",
            "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
            "requiredOpcodes": [
              "aload_0",
              "invokestatic",
              "ldc",
              "getstatic",
              "iconst_2",
              "invokedynamic",
              "invokeinterface",
              "pop",
              "iconst_1",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "flags",
                "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "constructors",
                "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "INT",
                "descriptor": "Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore",
              "aload",
              "getstatic",
              "invokestatic",
              "invokevirtual",
              "checkcast",
              "iconst_0",
              "istore",
              "ifeq",
              "ldc",
              "instanceof",
              "if_acmpne",
              "iconst_1",
              "goto",
              "iload_3",
              "if_icmpne",
              "aload_2",
              "iinc",
              "iload",
              "return"
            ],
            "symbolicOperands": [
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
                "name": "thisClass",
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
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
                "name": "superclass",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.constantpool.ClassEntry"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
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
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
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
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.CodeModel",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "INVOKESPECIAL",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "method",
                "descriptor": "()Ljava/lang/classfile/constantpool/MemberRefEntry;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "tag",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "owner",
                "descriptor": "()Ljava/lang/classfile/constantpool/ClassEntry;"
              }
            ]
          },
          {
            "method": "valid",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "ifeq",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "invoke",
            "descriptor": "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/Class;I)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "ldc",
              "invokestatic",
              "invokevirtual",
              "astore_3",
              "getstatic",
              "astore",
              "aload_3",
              "aload",
              "iload_2",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.Object"
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.Integer",
                "name": "TYPE",
                "descriptor": "Ljava/lang/Class;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandles$Lookup",
                "name": "findVirtual",
                "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
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
                "owner": "java.lang.invoke.MethodHandle",
                "name": "asType",
                "descriptor": "(Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandle",
                "name": "invokeExact",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandle",
                "name": "invokeExact",
                "descriptor": "(Ljava/lang/Object;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "special-private",
            "className": "classes.modern_test.C7d5SpecialPrivate",
            "major": 69,
            "definition": "define-and-invoke",
            "verification": "empty-byte-model"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-special-direct-super",
        "entryMethod": "caseParent",
        "entryDescriptor": "()V",
        "trace": [
          "owner=direct-super;receiver=current;CP10;value=23;verify=empty;defined/invoked=same-bytes"
        ],
        "probes": [
          {
            "method": "caseParent",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "invokestatic",
              "putstatic",
              "getstatic",
              "astore_0",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "astore_1",
              "aload_1",
              "bipush",
              "astore_2",
              "aload_2",
              "invokevirtual",
              "astore_3",
              "aload_3",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "PARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "api",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "valid",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V"
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
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "invoke",
                "descriptor": "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/Class;I)V"
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
        ],
        "callbackMethods": [
          {
            "method": "api",
            "descriptor": "()Ljava/lang/classfile/ClassFile;",
            "requiredOpcodes": [
              "new",
              "dup",
              "invokespecial",
              "astore_0",
              "aload_0",
              "getstatic",
              "invokeinterface",
              "pop",
              "invokestatic",
              "astore_1",
              "iconst_2",
              "anewarray",
              "iconst_0",
              "aastore",
              "iconst_1",
              "aload_1",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "new",
                "tag": 7,
                "value": "java.util.HashMap"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "java.util.HashMap",
                "name": "<init>",
                "descriptor": "()V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Map",
                "name": "put",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "PARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "GRANDPARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_Object",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "BASE_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "CHILD_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.util.List",
                "name": "of",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/util/List;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "of",
                "descriptor": "(Ljava/util/Collection;Ljava/util/Map;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "defaultResolver",
                "descriptor": "()Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "orElse",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.classfile.ClassFile$Option"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.ClassFile$StackMapsOption",
                "name": "DROP_STACK_MAPS",
                "descriptor": "Ljava/lang/classfile/ClassFile$StackMapsOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile$ClassHierarchyResolverOption",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassFile$ClassHierarchyResolverOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "([Ljava/lang/classfile/ClassFile$Option;)Ljava/lang/classfile/ClassFile;"
              }
            ]
          },
          {
            "method": "buildParent",
            "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
            "requiredOpcodes": [
              "aload_0",
              "invokestatic",
              "ldc",
              "getstatic",
              "iconst_1",
              "invokedynamic",
              "invokeinterface",
              "pop",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "flags",
                "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "constructors",
                "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "INT",
                "descriptor": "Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore",
              "aload",
              "getstatic",
              "invokestatic",
              "invokevirtual",
              "checkcast",
              "iconst_0",
              "istore",
              "ifeq",
              "ldc",
              "instanceof",
              "if_acmpne",
              "iconst_1",
              "goto",
              "iload_3",
              "if_icmpne",
              "aload_2",
              "iinc",
              "iload",
              "return"
            ],
            "symbolicOperands": [
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
                "name": "thisClass",
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
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
                "name": "superclass",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.constantpool.ClassEntry"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
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
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
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
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.CodeModel",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "INVOKESPECIAL",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "method",
                "descriptor": "()Ljava/lang/classfile/constantpool/MemberRefEntry;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "tag",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "owner",
                "descriptor": "()Ljava/lang/classfile/constantpool/ClassEntry;"
              }
            ]
          },
          {
            "method": "valid",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "ifeq",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "invoke",
            "descriptor": "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/Class;I)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "ldc",
              "invokestatic",
              "invokevirtual",
              "astore_3",
              "getstatic",
              "astore",
              "aload_3",
              "aload",
              "iload_2",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.Object"
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.Integer",
                "name": "TYPE",
                "descriptor": "Ljava/lang/Class;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandles$Lookup",
                "name": "findVirtual",
                "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
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
                "owner": "java.lang.invoke.MethodHandle",
                "name": "asType",
                "descriptor": "(Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandle",
                "name": "invokeExact",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandle",
                "name": "invokeExact",
                "descriptor": "(Ljava/lang/Object;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "special-parent",
            "className": "classes.modern_test.C7d5SpecialParent",
            "major": 69,
            "definition": "define-and-invoke",
            "verification": "empty-byte-model"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-special-class-ancestor",
        "entryMethod": "caseAncestor",
        "entryDescriptor": "()V",
        "trace": [
          "owner=class-ancestor;receiver=current;CP10;value=31;verify=empty;defined/invoked=same-bytes"
        ],
        "probes": [
          {
            "method": "caseAncestor",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "invokestatic",
              "putstatic",
              "getstatic",
              "astore_0",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "astore_1",
              "aload_1",
              "bipush",
              "astore_2",
              "aload_2",
              "invokevirtual",
              "astore_3",
              "aload_3",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "PARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "api",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "valid",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "GRANDPARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V"
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
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "invoke",
                "descriptor": "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/Class;I)V"
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
        ],
        "callbackMethods": [
          {
            "method": "api",
            "descriptor": "()Ljava/lang/classfile/ClassFile;",
            "requiredOpcodes": [
              "new",
              "dup",
              "invokespecial",
              "astore_0",
              "aload_0",
              "getstatic",
              "invokeinterface",
              "pop",
              "invokestatic",
              "astore_1",
              "iconst_2",
              "anewarray",
              "iconst_0",
              "aastore",
              "iconst_1",
              "aload_1",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "new",
                "tag": 7,
                "value": "java.util.HashMap"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "java.util.HashMap",
                "name": "<init>",
                "descriptor": "()V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Map",
                "name": "put",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "PARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "GRANDPARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_Object",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "BASE_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "CHILD_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.util.List",
                "name": "of",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/util/List;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "of",
                "descriptor": "(Ljava/util/Collection;Ljava/util/Map;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "defaultResolver",
                "descriptor": "()Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "orElse",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.classfile.ClassFile$Option"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.ClassFile$StackMapsOption",
                "name": "DROP_STACK_MAPS",
                "descriptor": "Ljava/lang/classfile/ClassFile$StackMapsOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile$ClassHierarchyResolverOption",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassFile$ClassHierarchyResolverOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "([Ljava/lang/classfile/ClassFile$Option;)Ljava/lang/classfile/ClassFile;"
              }
            ]
          },
          {
            "method": "buildAncestor",
            "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
            "requiredOpcodes": [
              "aload_0",
              "invokestatic",
              "ldc",
              "getstatic",
              "iconst_1",
              "invokedynamic",
              "invokeinterface",
              "pop",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "flags",
                "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "constructors",
                "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "INT",
                "descriptor": "Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore",
              "aload",
              "getstatic",
              "invokestatic",
              "invokevirtual",
              "checkcast",
              "iconst_0",
              "istore",
              "ifeq",
              "ldc",
              "instanceof",
              "if_acmpne",
              "iconst_1",
              "goto",
              "iload_3",
              "if_icmpne",
              "aload_2",
              "iinc",
              "iload",
              "return"
            ],
            "symbolicOperands": [
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
                "name": "thisClass",
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
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
                "name": "superclass",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.constantpool.ClassEntry"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
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
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
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
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.CodeModel",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "INVOKESPECIAL",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "method",
                "descriptor": "()Ljava/lang/classfile/constantpool/MemberRefEntry;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "tag",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "owner",
                "descriptor": "()Ljava/lang/classfile/constantpool/ClassEntry;"
              }
            ]
          },
          {
            "method": "valid",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "ifeq",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "invoke",
            "descriptor": "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/Class;I)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "ldc",
              "invokestatic",
              "invokevirtual",
              "astore_3",
              "getstatic",
              "astore",
              "aload_3",
              "aload",
              "iload_2",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.Object"
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.Integer",
                "name": "TYPE",
                "descriptor": "Ljava/lang/Class;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandles$Lookup",
                "name": "findVirtual",
                "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
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
                "owner": "java.lang.invoke.MethodHandle",
                "name": "asType",
                "descriptor": "(Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandle",
                "name": "invokeExact",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandle",
                "name": "invokeExact",
                "descriptor": "(Ljava/lang/Object;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "special-ancestor",
            "className": "classes.modern_test.C7d5SpecialAncestor",
            "major": 69,
            "definition": "define-and-invoke",
            "verification": "empty-byte-model"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-special-direct-interface",
        "entryMethod": "caseDirect",
        "entryDescriptor": "()V",
        "trace": [
          "owner=direct-interface;receiver=current;CP11;value=41;verify=empty;defined/invoked=same-bytes"
        ],
        "probes": [
          {
            "method": "caseDirect",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "invokestatic",
              "putstatic",
              "getstatic",
              "astore_0",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "astore_1",
              "aload_1",
              "bipush",
              "astore_2",
              "aload_2",
              "invokevirtual",
              "astore_3",
              "aload_3",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_Object",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "api",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "valid",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "BASE_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V"
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
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "invoke",
                "descriptor": "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/Class;I)V"
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
        ],
        "callbackMethods": [
          {
            "method": "api",
            "descriptor": "()Ljava/lang/classfile/ClassFile;",
            "requiredOpcodes": [
              "new",
              "dup",
              "invokespecial",
              "astore_0",
              "aload_0",
              "getstatic",
              "invokeinterface",
              "pop",
              "invokestatic",
              "astore_1",
              "iconst_2",
              "anewarray",
              "iconst_0",
              "aastore",
              "iconst_1",
              "aload_1",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "new",
                "tag": 7,
                "value": "java.util.HashMap"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "java.util.HashMap",
                "name": "<init>",
                "descriptor": "()V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Map",
                "name": "put",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "PARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "GRANDPARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_Object",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "BASE_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "CHILD_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.util.List",
                "name": "of",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/util/List;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "of",
                "descriptor": "(Ljava/util/Collection;Ljava/util/Map;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "defaultResolver",
                "descriptor": "()Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "orElse",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.classfile.ClassFile$Option"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.ClassFile$StackMapsOption",
                "name": "DROP_STACK_MAPS",
                "descriptor": "Ljava/lang/classfile/ClassFile$StackMapsOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile$ClassHierarchyResolverOption",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassFile$ClassHierarchyResolverOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "([Ljava/lang/classfile/ClassFile$Option;)Ljava/lang/classfile/ClassFile;"
              }
            ]
          },
          {
            "method": "buildDirect",
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
              "pop",
              "ldc",
              "invokedynamic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "flags",
                "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.constant.ClassDesc"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "BASE_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassBuilder",
                "name": "withInterfaceSymbols",
                "descriptor": "([Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/ClassBuilder;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "constructors",
                "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "INT",
                "descriptor": "Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore",
              "aload",
              "getstatic",
              "invokestatic",
              "invokevirtual",
              "checkcast",
              "iconst_0",
              "istore",
              "ifeq",
              "ldc",
              "instanceof",
              "if_acmpne",
              "iconst_1",
              "goto",
              "iload_3",
              "if_icmpne",
              "aload_2",
              "iinc",
              "iload",
              "return"
            ],
            "symbolicOperands": [
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
                "name": "thisClass",
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
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
                "name": "superclass",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.constantpool.ClassEntry"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
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
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
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
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.CodeModel",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "INVOKESPECIAL",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "method",
                "descriptor": "()Ljava/lang/classfile/constantpool/MemberRefEntry;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "tag",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "owner",
                "descriptor": "()Ljava/lang/classfile/constantpool/ClassEntry;"
              }
            ]
          },
          {
            "method": "valid",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "ifeq",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "invoke",
            "descriptor": "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/Class;I)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "ldc",
              "invokestatic",
              "invokevirtual",
              "astore_3",
              "getstatic",
              "astore",
              "aload_3",
              "aload",
              "iload_2",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.Object"
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.Integer",
                "name": "TYPE",
                "descriptor": "Ljava/lang/Class;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandles$Lookup",
                "name": "findVirtual",
                "descriptor": "(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
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
                "owner": "java.lang.invoke.MethodHandle",
                "name": "asType",
                "descriptor": "(Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandle",
                "name": "invokeExact",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandle",
                "name": "invokeExact",
                "descriptor": "(Ljava/lang/Object;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "special-direct",
            "className": "classes.modern_test.C7d5SpecialDirect",
            "major": 69,
            "definition": "define-and-invoke",
            "verification": "empty-byte-model"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-special-indirect-interface",
        "entryMethod": "caseIndirect",
        "entryDescriptor": "()V",
        "trace": [
          "owner=indirect-interface;receiver=current;CP11;verify=nonempty/VerifyError;never-defined"
        ],
        "probes": [
          {
            "method": "caseIndirect",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "invokestatic",
              "putstatic",
              "getstatic",
              "astore_0",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "astore_1",
              "aload_1",
              "bipush",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_Object",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "api",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "invalid",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "BASE_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V"
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
        ],
        "callbackMethods": [
          {
            "method": "api",
            "descriptor": "()Ljava/lang/classfile/ClassFile;",
            "requiredOpcodes": [
              "new",
              "dup",
              "invokespecial",
              "astore_0",
              "aload_0",
              "getstatic",
              "invokeinterface",
              "pop",
              "invokestatic",
              "astore_1",
              "iconst_2",
              "anewarray",
              "iconst_0",
              "aastore",
              "iconst_1",
              "aload_1",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "new",
                "tag": 7,
                "value": "java.util.HashMap"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "java.util.HashMap",
                "name": "<init>",
                "descriptor": "()V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Map",
                "name": "put",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "PARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "GRANDPARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_Object",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "BASE_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "CHILD_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.util.List",
                "name": "of",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/util/List;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "of",
                "descriptor": "(Ljava/util/Collection;Ljava/util/Map;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "defaultResolver",
                "descriptor": "()Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "orElse",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.classfile.ClassFile$Option"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.ClassFile$StackMapsOption",
                "name": "DROP_STACK_MAPS",
                "descriptor": "Ljava/lang/classfile/ClassFile$StackMapsOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile$ClassHierarchyResolverOption",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassFile$ClassHierarchyResolverOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "([Ljava/lang/classfile/ClassFile$Option;)Ljava/lang/classfile/ClassFile;"
              }
            ]
          },
          {
            "method": "buildIndirect",
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
              "pop",
              "ldc",
              "invokedynamic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "flags",
                "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.constant.ClassDesc"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "CHILD_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassBuilder",
                "name": "withInterfaceSymbols",
                "descriptor": "([Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/ClassBuilder;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "INT",
                "descriptor": "Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore",
              "aload",
              "getstatic",
              "invokestatic",
              "invokevirtual",
              "checkcast",
              "iconst_0",
              "istore",
              "ifeq",
              "ldc",
              "instanceof",
              "if_acmpne",
              "iconst_1",
              "goto",
              "iload_3",
              "if_icmpne",
              "aload_2",
              "iinc",
              "iload",
              "return"
            ],
            "symbolicOperands": [
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
                "name": "thisClass",
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
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
                "name": "superclass",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.constantpool.ClassEntry"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
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
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
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
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.CodeModel",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "INVOKESPECIAL",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "method",
                "descriptor": "()Ljava/lang/classfile/constantpool/MemberRefEntry;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "tag",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "owner",
                "descriptor": "()Ljava/lang/classfile/constantpool/ClassEntry;"
              }
            ]
          },
          {
            "method": "invalid",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "astore_3",
              "aload_2",
              "ifne",
              "aload_3",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "invokevirtual",
              "ldc_w",
              "if_acmpne",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
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
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Object",
                "name": "getClass",
                "descriptor": "()Ljava/lang/Class;"
              },
              {
                "opcode": "ldc_w",
                "tag": 7,
                "value": "java.lang.VerifyError"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "special-indirect",
            "className": "classes.modern_test.C7d5SpecialIndirect",
            "major": 69,
            "definition": "never-define",
            "verification": "nonempty-byte-model"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-special-unrelated-owner",
        "entryMethod": "caseUnrelated",
        "entryDescriptor": "()V",
        "trace": [
          "owner=unrelated-class;receiver=referenced-String;CP10;verify=nonempty/VerifyError;never-defined"
        ],
        "probes": [
          {
            "method": "caseUnrelated",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "invokestatic",
              "putstatic",
              "getstatic",
              "astore_0",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "astore_1",
              "aload_1",
              "bipush",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_Object",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "api",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "invalid",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_String",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V"
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
        ],
        "callbackMethods": [
          {
            "method": "api",
            "descriptor": "()Ljava/lang/classfile/ClassFile;",
            "requiredOpcodes": [
              "new",
              "dup",
              "invokespecial",
              "astore_0",
              "aload_0",
              "getstatic",
              "invokeinterface",
              "pop",
              "invokestatic",
              "astore_1",
              "iconst_2",
              "anewarray",
              "iconst_0",
              "aastore",
              "iconst_1",
              "aload_1",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "new",
                "tag": 7,
                "value": "java.util.HashMap"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "java.util.HashMap",
                "name": "<init>",
                "descriptor": "()V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Map",
                "name": "put",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "PARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "GRANDPARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_Object",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "BASE_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "CHILD_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.util.List",
                "name": "of",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/util/List;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "of",
                "descriptor": "(Ljava/util/Collection;Ljava/util/Map;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "defaultResolver",
                "descriptor": "()Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "orElse",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.classfile.ClassFile$Option"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.ClassFile$StackMapsOption",
                "name": "DROP_STACK_MAPS",
                "descriptor": "Ljava/lang/classfile/ClassFile$StackMapsOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile$ClassHierarchyResolverOption",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassFile$ClassHierarchyResolverOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "([Ljava/lang/classfile/ClassFile$Option;)Ljava/lang/classfile/ClassFile;"
              }
            ]
          },
          {
            "method": "buildUnrelated",
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
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "flags",
                "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_int",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.constant.ClassDesc"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_String",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.MethodTypeDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/constant/ClassDesc;[Ljava/lang/constant/ClassDesc;)Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore",
              "aload",
              "getstatic",
              "invokestatic",
              "invokevirtual",
              "checkcast",
              "iconst_0",
              "istore",
              "ifeq",
              "ldc",
              "instanceof",
              "if_acmpne",
              "iconst_1",
              "goto",
              "iload_3",
              "if_icmpne",
              "aload_2",
              "iinc",
              "iload",
              "return"
            ],
            "symbolicOperands": [
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
                "name": "thisClass",
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
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
                "name": "superclass",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.constantpool.ClassEntry"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
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
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
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
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.CodeModel",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "INVOKESPECIAL",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "method",
                "descriptor": "()Ljava/lang/classfile/constantpool/MemberRefEntry;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "tag",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "owner",
                "descriptor": "()Ljava/lang/classfile/constantpool/ClassEntry;"
              }
            ]
          },
          {
            "method": "invalid",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "astore_3",
              "aload_2",
              "ifne",
              "aload_3",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "invokevirtual",
              "ldc_w",
              "if_acmpne",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
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
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Object",
                "name": "getClass",
                "descriptor": "()Ljava/lang/Class;"
              },
              {
                "opcode": "ldc_w",
                "tag": 7,
                "value": "java.lang.VerifyError"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "special-unrelated",
            "className": "classes.modern_test.C7d5SpecialUnrelated",
            "major": 69,
            "definition": "never-define",
            "verification": "nonempty-byte-model"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-special-wrong-current-receiver",
        "entryMethod": "caseWrongReceiver",
        "entryDescriptor": "()V",
        "trace": [
          "owner=direct-super;receiver=super-not-current;CP10;verify=nonempty/VerifyError;never-defined"
        ],
        "probes": [
          {
            "method": "caseWrongReceiver",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "invokestatic",
              "putstatic",
              "getstatic",
              "astore_0",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "astore_1",
              "aload_1",
              "bipush",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "PARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "api",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "invalid",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V"
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
        ],
        "callbackMethods": [
          {
            "method": "api",
            "descriptor": "()Ljava/lang/classfile/ClassFile;",
            "requiredOpcodes": [
              "new",
              "dup",
              "invokespecial",
              "astore_0",
              "aload_0",
              "getstatic",
              "invokeinterface",
              "pop",
              "invokestatic",
              "astore_1",
              "iconst_2",
              "anewarray",
              "iconst_0",
              "aastore",
              "iconst_1",
              "aload_1",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "new",
                "tag": 7,
                "value": "java.util.HashMap"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "java.util.HashMap",
                "name": "<init>",
                "descriptor": "()V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Map",
                "name": "put",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "PARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "GRANDPARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_Object",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "BASE_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "CHILD_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.util.List",
                "name": "of",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/util/List;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "of",
                "descriptor": "(Ljava/util/Collection;Ljava/util/Map;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "defaultResolver",
                "descriptor": "()Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "orElse",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.classfile.ClassFile$Option"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.ClassFile$StackMapsOption",
                "name": "DROP_STACK_MAPS",
                "descriptor": "Ljava/lang/classfile/ClassFile$StackMapsOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile$ClassHierarchyResolverOption",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassFile$ClassHierarchyResolverOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "([Ljava/lang/classfile/ClassFile$Option;)Ljava/lang/classfile/ClassFile;"
              }
            ]
          },
          {
            "method": "buildWrongReceiver",
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
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "flags",
                "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_int",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.constant.ClassDesc"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "PARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.MethodTypeDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/constant/ClassDesc;[Ljava/lang/constant/ClassDesc;)Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore",
              "aload",
              "getstatic",
              "invokestatic",
              "invokevirtual",
              "checkcast",
              "iconst_0",
              "istore",
              "ifeq",
              "ldc",
              "instanceof",
              "if_acmpne",
              "iconst_1",
              "goto",
              "iload_3",
              "if_icmpne",
              "aload_2",
              "iinc",
              "iload",
              "return"
            ],
            "symbolicOperands": [
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
                "name": "thisClass",
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
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
                "name": "superclass",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.constantpool.ClassEntry"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
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
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
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
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.CodeModel",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "INVOKESPECIAL",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "method",
                "descriptor": "()Ljava/lang/classfile/constantpool/MemberRefEntry;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "tag",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "owner",
                "descriptor": "()Ljava/lang/classfile/constantpool/ClassEntry;"
              }
            ]
          },
          {
            "method": "invalid",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "astore_3",
              "aload_2",
              "ifne",
              "aload_3",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "invokevirtual",
              "ldc_w",
              "if_acmpne",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
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
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Object",
                "name": "getClass",
                "descriptor": "()Ljava/lang/Class;"
              },
              {
                "opcode": "ldc_w",
                "tag": 7,
                "value": "java.lang.VerifyError"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "special-receiver",
            "className": "classes.modern_test.C7d5SpecialReceiver",
            "major": 69,
            "definition": "never-define",
            "verification": "nonempty-byte-model"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-special-interface-major51",
        "entryMethod": "caseMajor51",
        "entryDescriptor": "()V",
        "trace": [
          "major=51;owner=direct-interface;CP11;verify=nonempty/VerifyError;never-defined"
        ],
        "probes": [
          {
            "method": "caseMajor51",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "invokestatic",
              "putstatic",
              "getstatic",
              "astore_0",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "astore_1",
              "aload_1",
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
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_Object",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "api",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "invalid",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "BASE_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "typed",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V"
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
                "name": "majorVersion",
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
        ],
        "callbackMethods": [
          {
            "method": "api",
            "descriptor": "()Ljava/lang/classfile/ClassFile;",
            "requiredOpcodes": [
              "new",
              "dup",
              "invokespecial",
              "astore_0",
              "aload_0",
              "getstatic",
              "invokeinterface",
              "pop",
              "invokestatic",
              "astore_1",
              "iconst_2",
              "anewarray",
              "iconst_0",
              "aastore",
              "iconst_1",
              "aload_1",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "new",
                "tag": 7,
                "value": "java.util.HashMap"
              },
              {
                "opcode": "invokespecial",
                "tag": 10,
                "owner": "java.util.HashMap",
                "name": "<init>",
                "descriptor": "()V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Map",
                "name": "put",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "PARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "GRANDPARENT",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_Object",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "BASE_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "CHILD_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.util.List",
                "name": "of",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/util/List;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "of",
                "descriptor": "(Ljava/util/Collection;Ljava/util/Map;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "defaultResolver",
                "descriptor": "()Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassHierarchyResolver",
                "name": "orElse",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassHierarchyResolver;"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.classfile.ClassFile$Option"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.ClassFile$StackMapsOption",
                "name": "DROP_STACK_MAPS",
                "descriptor": "Ljava/lang/classfile/ClassFile$StackMapsOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile$ClassHierarchyResolverOption",
                "name": "of",
                "descriptor": "(Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/lang/classfile/ClassFile$ClassHierarchyResolverOption;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "([Ljava/lang/classfile/ClassFile$Option;)Ljava/lang/classfile/ClassFile;"
              }
            ]
          },
          {
            "method": "buildMajor51",
            "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V",
            "requiredOpcodes": [
              "aload_0",
              "invokestatic",
              "bipush",
              "iconst_0",
              "invokeinterface",
              "iconst_1",
              "anewarray",
              "dup",
              "getstatic",
              "aastore",
              "pop",
              "ldc",
              "invokedynamic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "flags",
                "descriptor": "(Ljava/lang/classfile/ClassBuilder;)V"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassBuilder",
                "name": "withVersion",
                "descriptor": "(II)Ljava/lang/classfile/ClassBuilder;"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.constant.ClassDesc"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "BASE_API",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassBuilder",
                "name": "withInterfaceSymbols",
                "descriptor": "([Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/ClassBuilder;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "INT",
                "descriptor": "Ljava/lang/constant/MethodTypeDesc;"
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
          {
            "method": "typed",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[BLjava/lang/constant/ClassDesc;I)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore",
              "aload",
              "getstatic",
              "invokestatic",
              "invokevirtual",
              "checkcast",
              "iconst_0",
              "istore",
              "ifeq",
              "ldc",
              "instanceof",
              "if_acmpne",
              "iconst_1",
              "goto",
              "iload_3",
              "if_icmpne",
              "aload_2",
              "iinc",
              "iload",
              "return"
            ],
            "symbolicOperands": [
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
                "name": "thisClass",
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "owner",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
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
                "name": "superclass",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.constantpool.ClassEntry"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileSpecialInvokeFinal",
                "name": "parent",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
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
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
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
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.CodeModel",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.InvokeInstruction"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "opcode",
                "descriptor": "()Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.classfile.Opcode",
                "name": "INVOKESPECIAL",
                "descriptor": "Ljava/lang/classfile/Opcode;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.InvokeInstruction",
                "name": "method",
                "descriptor": "()Ljava/lang/classfile/constantpool/MemberRefEntry;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "tag",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.constantpool.MemberRefEntry",
                "name": "owner",
                "descriptor": "()Ljava/lang/classfile/constantpool/ClassEntry;"
              }
            ]
          },
          {
            "method": "invalid",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "astore_2",
              "astore_3",
              "aload_2",
              "ifne",
              "aload_3",
              "iconst_1",
              "goto",
              "iconst_0",
              "invokestatic",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "invokevirtual",
              "ldc_w",
              "if_acmpne",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
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
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Object",
                "name": "getClass",
                "descriptor": "()Ljava/lang/Class;"
              },
              {
                "opcode": "ldc_w",
                "tag": 7,
                "value": "java.lang.VerifyError"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "special-major51",
            "className": "classes.modern_test.C7d5SpecialMajor51",
            "major": 51,
            "definition": "never-define",
            "verification": "nonempty-byte-model"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      }
    ]
  },
  {
    "id": "classfile-structural-debug",
    "source": "classes/modern_fixture/ClassFileStructuralDebugFinal.java",
    "mainClass": "classes.modern_test.ClassFileStructuralDebugFinal",
    "completionMarker": "CLASSFILE_STRUCTURAL_DEBUG_OK|92|artifacts=21",
    "additionalSources": [
      "classes/modern_fixture/classfile/ClassFileSupport.java"
    ],
    "driverClassNames": [
      "classes.modern_test.ClassFileStructuralDebugFinal",
      "classes.modern_test.ClassFileSupport"
    ],
    "resourceClassNames": [],
    "javacFlags": [
      "-g",
      "-parameters"
    ],
    "releases": [
      25
    ],
    "cases": [
      {
        "id": "cf-struct-debug-valid",
        "entryMethod": "caseValid",
        "entryDescriptor": "()V",
        "trace": [
          "LVT/LVTT/CRT/LNT=raw-typed;zero-length-at-instruction=valid;labels=own-only;value=1241;defined/invoked=same-two-arrays"
        ],
        "probes": [
          {
            "method": "caseValid",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "astore_0",
              "iconst_0",
              "invokestatic",
              "astore_1",
              "bipush",
              "astore_2",
              "aload_1",
              "astore_3",
              "aload_2",
              "astore",
              "aload_3",
              "invokeinterface",
              "if_icmpne",
              "iconst_2",
              "iconst_1",
              "goto",
              "invokevirtual",
              "checkcast",
              "aload",
              "ifne",
              "getstatic",
              "ifeq",
              "iconst_4",
              "aconst_null",
              "instanceof",
              "ifnull",
              "istore",
              "pop",
              "iload",
              "aload_0",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "build",
                "descriptor": "(Ljava/lang/String;I)[B"
              },
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
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "code",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "codeLength",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "maxLocals",
                "descriptor": "()I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.classfile.Attributes",
                "name": "localVariableTable",
                "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "findAttribute",
                "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.LocalVariableTableAttribute"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableTableAttribute",
                "name": "localVariables",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.LocalVariableInfo"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableInfo",
                "name": "startPc",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableInfo",
                "name": "length",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableInfo",
                "name": "slot",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableInfo",
                "name": "typeSymbol",
                "descriptor": "()Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_int",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.LocalVariable"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.LocalVariable"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.LocalVariable",
                "name": "startScope",
                "descriptor": "()Ljava/lang/classfile/Label;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "labelToBci",
                "descriptor": "(Ljava/lang/classfile/Label;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "verify",
                "descriptor": "([BZZZ)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "output",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "invoke",
                "descriptor": "([B)V"
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
        ],
        "callbackMethods": [
          {
            "method": "check",
            "descriptor": "(Z)V",
            "requiredOpcodes": [
              "iload_0",
              "invokestatic",
              "getstatic",
              "iconst_1",
              "iadd",
              "putstatic",
              "return"
            ],
            "symbolicOperands": [
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
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "checks",
                "descriptor": "I"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "checks",
                "descriptor": "I"
              }
            ]
          },
          {
            "method": "build",
            "descriptor": "(Ljava/lang/String;I)[B",
            "requiredOpcodes": [
              "iload_1",
              "putstatic",
              "invokestatic",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "recipe",
                "descriptor": "I"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              }
            ]
          },
          {
            "method": "code",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "iconst_0",
              "checkcast",
              "invokevirtual",
              "areturn"
            ],
            "symbolicOperands": [
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
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.CodeAttribute"
              }
            ]
          },
          {
            "method": "verify",
            "descriptor": "([BZZZ)V",
            "requiredOpcodes": [
              "iload_1",
              "iload_2",
              "invokestatic",
              "astore",
              "aload",
              "aload_0",
              "invokeinterface",
              "iload_3",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "ifeq",
              "checkcast",
              "invokevirtual",
              "ldc",
              "if_acmpne",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "context",
                "descriptor": "(ZZ)Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Object",
                "name": "getClass",
                "descriptor": "()Ljava/lang/Class;"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.VerifyError"
              }
            ]
          },
          {
            "method": "output",
            "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "aload_2",
              "invokestatic",
              "getstatic",
              "iconst_1",
              "iadd",
              "putstatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "artifact",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              }
            ]
          },
          {
            "method": "invoke",
            "descriptor": "([B)V",
            "requiredOpcodes": [
              "invokestatic",
              "astore_1",
              "aload_1",
              "aload_0",
              "invokevirtual",
              "astore_2",
              "aload_2",
              "ldc",
              "getstatic",
              "iconst_1",
              "anewarray",
              "dup",
              "iconst_0",
              "aastore",
              "astore_3",
              "ldc_w",
              "astore",
              "aload_3",
              "bipush",
              "aload",
              "sipush",
              "if_icmpne",
              "goto",
              "return"
            ],
            "symbolicOperands": [
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.Integer",
                "name": "TYPE",
                "descriptor": "Ljava/lang/Class;"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.Class"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.util.List"
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
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.util.List",
                "name": "of",
                "descriptor": "(Ljava/lang/Object;)Ljava/util/List;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandle",
                "name": "invokeExact",
                "descriptor": "(ILjava/util/List;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "struct-debug-valid",
            "className": "classes.modern_test.C7dStructuralDebugValid",
            "major": 69,
            "definition": "define-and-invoke",
            "verification": "empty-byte-model"
          },
          {
            "id": "struct-debug-zero",
            "className": "classes.modern_test.C7dStructuralDebugZero",
            "major": 69,
            "definition": "define-and-invoke",
            "verification": "empty-byte-model"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-struct-debug-lvt-start",
        "entryMethod": "caseStart",
        "entryDescriptor": "()V",
        "trace": [
          "first-LVT-start=operand/terminal;verify(bytes/model)=nonempty-PASS-and-DROP_DEBUG;malformed-never-defined"
        ],
        "probes": [
          {
            "method": "caseStart",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "astore_0",
              "iconst_0",
              "invokestatic",
              "astore_1",
              "aload_1",
              "iconst_2",
              "astore_2",
              "bipush",
              "astore_3",
              "aload_2",
              "aload_3",
              "invokeinterface",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "iconst_1",
              "goto",
              "aload_0",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "build",
                "descriptor": "(Ljava/lang/String;I)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "mutate",
                "descriptor": "([BLjava/lang/String;III)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.util.List",
                "name": "of",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "verify",
                "descriptor": "([BZZZ)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "output",
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
        ],
        "callbackMethods": [
          {
            "method": "build",
            "descriptor": "(Ljava/lang/String;I)[B",
            "requiredOpcodes": [
              "iload_1",
              "putstatic",
              "invokestatic",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "recipe",
                "descriptor": "I"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              }
            ]
          },
          {
            "method": "verify",
            "descriptor": "([BZZZ)V",
            "requiredOpcodes": [
              "iload_1",
              "iload_2",
              "invokestatic",
              "astore",
              "aload",
              "aload_0",
              "invokeinterface",
              "iload_3",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "ifeq",
              "checkcast",
              "invokevirtual",
              "ldc",
              "if_acmpne",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "context",
                "descriptor": "(ZZ)Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Object",
                "name": "getClass",
                "descriptor": "()Ljava/lang/Class;"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.VerifyError"
              }
            ]
          },
          {
            "method": "output",
            "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "aload_2",
              "invokestatic",
              "getstatic",
              "iconst_1",
              "iadd",
              "putstatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "artifact",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              }
            ]
          },
          {
            "method": "mutate",
            "descriptor": "([BLjava/lang/String;III)[B",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokestatic",
              "iload_2",
              "iadd",
              "istore",
              "iconst_2",
              "if_icmplt",
              "iconst_1",
              "iand",
              "ifne",
              "iload",
              "iload_3",
              "if_icmpne",
              "iflt",
              "ldc",
              "if_icmpgt",
              "if_icmpeq",
              "goto",
              "iconst_0",
              "invokevirtual",
              "checkcast",
              "astore",
              "aload",
              "bipush",
              "iushr",
              "i2b",
              "bastore",
              "arraylength",
              "if_icmpge",
              "baload",
              "iinc",
              "ifeq",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "payload",
                "descriptor": "([BLjava/lang/String;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "u2",
                "descriptor": "([BI)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "require",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "[B",
                "name": "clone",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.util.Arrays",
                "name": "equals",
                "descriptor": "([B[B)Z"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "struct-debug-lvt-start-operand",
            "className": "classes.modern_test.C7dStructuralDebugStart",
            "major": 69,
            "definition": "never-define",
            "verification": "nonempty-even-DROP_DEBUG"
          },
          {
            "id": "struct-debug-lvt-start-terminal",
            "className": "classes.modern_test.C7dStructuralDebugStart",
            "major": 69,
            "definition": "never-define",
            "verification": "nonempty-even-DROP_DEBUG"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-struct-debug-lvt-end",
        "entryMethod": "caseEnd",
        "entryDescriptor": "()V",
        "trace": [
          "first-LVT-end=operand/past-rejected;instruction-boundary=valid;value=1241;only-valid-boundary-array-defined"
        ],
        "probes": [
          {
            "method": "caseEnd",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "astore_0",
              "iconst_0",
              "invokestatic",
              "astore_1",
              "aload_1",
              "iconst_4",
              "bipush",
              "iconst_2",
              "astore_2",
              "astore_3",
              "astore",
              "aload_2",
              "iconst_1",
              "aload_3",
              "aload",
              "aload_0",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "build",
                "descriptor": "(Ljava/lang/String;I)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "mutate",
                "descriptor": "([BLjava/lang/String;III)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "verify",
                "descriptor": "([BZZZ)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "output",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "invoke",
                "descriptor": "([B)V"
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
        ],
        "callbackMethods": [
          {
            "method": "build",
            "descriptor": "(Ljava/lang/String;I)[B",
            "requiredOpcodes": [
              "iload_1",
              "putstatic",
              "invokestatic",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "recipe",
                "descriptor": "I"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              }
            ]
          },
          {
            "method": "verify",
            "descriptor": "([BZZZ)V",
            "requiredOpcodes": [
              "iload_1",
              "iload_2",
              "invokestatic",
              "astore",
              "aload",
              "aload_0",
              "invokeinterface",
              "iload_3",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "ifeq",
              "checkcast",
              "invokevirtual",
              "ldc",
              "if_acmpne",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "context",
                "descriptor": "(ZZ)Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Object",
                "name": "getClass",
                "descriptor": "()Ljava/lang/Class;"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.VerifyError"
              }
            ]
          },
          {
            "method": "output",
            "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "aload_2",
              "invokestatic",
              "getstatic",
              "iconst_1",
              "iadd",
              "putstatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "artifact",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              }
            ]
          },
          {
            "method": "invoke",
            "descriptor": "([B)V",
            "requiredOpcodes": [
              "invokestatic",
              "astore_1",
              "aload_1",
              "aload_0",
              "invokevirtual",
              "astore_2",
              "aload_2",
              "ldc",
              "getstatic",
              "iconst_1",
              "anewarray",
              "dup",
              "iconst_0",
              "aastore",
              "astore_3",
              "ldc_w",
              "astore",
              "aload_3",
              "bipush",
              "aload",
              "sipush",
              "if_icmpne",
              "goto",
              "return"
            ],
            "symbolicOperands": [
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
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.Integer",
                "name": "TYPE",
                "descriptor": "Ljava/lang/Class;"
              },
              {
                "opcode": "anewarray",
                "tag": 7,
                "value": "java.lang.Class"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.util.List"
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
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.util.List",
                "name": "of",
                "descriptor": "(Ljava/lang/Object;)Ljava/util/List;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.invoke.MethodHandle",
                "name": "invokeExact",
                "descriptor": "(ILjava/util/List;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "mutate",
            "descriptor": "([BLjava/lang/String;III)[B",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokestatic",
              "iload_2",
              "iadd",
              "istore",
              "iconst_2",
              "if_icmplt",
              "iconst_1",
              "iand",
              "ifne",
              "iload",
              "iload_3",
              "if_icmpne",
              "iflt",
              "ldc",
              "if_icmpgt",
              "if_icmpeq",
              "goto",
              "iconst_0",
              "invokevirtual",
              "checkcast",
              "astore",
              "aload",
              "bipush",
              "iushr",
              "i2b",
              "bastore",
              "arraylength",
              "if_icmpge",
              "baload",
              "iinc",
              "ifeq",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "payload",
                "descriptor": "([BLjava/lang/String;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "u2",
                "descriptor": "([BI)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "require",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "[B",
                "name": "clone",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.util.Arrays",
                "name": "equals",
                "descriptor": "([B[B)Z"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "struct-debug-lvt-end-operand",
            "className": "classes.modern_test.C7dStructuralDebugEnd",
            "major": 69,
            "definition": "never-define",
            "verification": "nonempty-even-DROP_DEBUG"
          },
          {
            "id": "struct-debug-lvt-end-past",
            "className": "classes.modern_test.C7dStructuralDebugEnd",
            "major": 69,
            "definition": "never-define",
            "verification": "nonempty-even-DROP_DEBUG"
          },
          {
            "id": "struct-debug-lvt-end-boundary",
            "className": "classes.modern_test.C7dStructuralDebugEnd",
            "major": 69,
            "definition": "define-and-invoke",
            "verification": "empty-byte-model"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-struct-debug-lvt-reversed",
        "entryMethod": "caseReversed",
        "entryDescriptor": "()V",
        "trace": [
          "builder-reversed=4+65532-wide-end65536;terminal-zero=6+0;verify=nonempty-even-DROP_DEBUG;malformed-never-defined"
        ],
        "probes": [
          {
            "method": "caseReversed",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "astore_0",
              "iconst_1",
              "invokestatic",
              "astore_1",
              "iconst_2",
              "astore_2",
              "aload_1",
              "invokeinterface",
              "invokevirtual",
              "checkcast",
              "iconst_0",
              "astore_3",
              "aload_2",
              "astore",
              "aload_3",
              "iconst_4",
              "if_icmpne",
              "iadd",
              "ldc",
              "goto",
              "aload",
              "bipush",
              "ifne",
              "ifeq",
              "aload_0",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "build",
                "descriptor": "(Ljava/lang/String;I)[B"
              },
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
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "code",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.classfile.Attributes",
                "name": "localVariableTable",
                "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "findAttribute",
                "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.LocalVariableTableAttribute"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableTableAttribute",
                "name": "localVariables",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.LocalVariableInfo"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableInfo",
                "name": "startPc",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableInfo",
                "name": "length",
                "descriptor": "()I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.util.List",
                "name": "of",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "verify",
                "descriptor": "([BZZZ)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "traversal",
                "descriptor": "([BZZZ)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "output",
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
        ],
        "callbackMethods": [
          {
            "method": "check",
            "descriptor": "(Z)V",
            "requiredOpcodes": [
              "iload_0",
              "invokestatic",
              "getstatic",
              "iconst_1",
              "iadd",
              "putstatic",
              "return"
            ],
            "symbolicOperands": [
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
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "checks",
                "descriptor": "I"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "checks",
                "descriptor": "I"
              }
            ]
          },
          {
            "method": "build",
            "descriptor": "(Ljava/lang/String;I)[B",
            "requiredOpcodes": [
              "iload_1",
              "putstatic",
              "invokestatic",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "recipe",
                "descriptor": "I"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              }
            ]
          },
          {
            "method": "code",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "iconst_0",
              "checkcast",
              "invokevirtual",
              "areturn"
            ],
            "symbolicOperands": [
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
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.CodeAttribute"
              }
            ]
          },
          {
            "method": "verify",
            "descriptor": "([BZZZ)V",
            "requiredOpcodes": [
              "iload_1",
              "iload_2",
              "invokestatic",
              "astore",
              "aload",
              "aload_0",
              "invokeinterface",
              "iload_3",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "ifeq",
              "checkcast",
              "invokevirtual",
              "ldc",
              "if_acmpne",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "context",
                "descriptor": "(ZZ)Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Object",
                "name": "getClass",
                "descriptor": "()Ljava/lang/Class;"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.VerifyError"
              }
            ]
          },
          {
            "method": "traversal",
            "descriptor": "([BZZZ)V",
            "requiredOpcodes": [
              "iconst_0",
              "istore",
              "iload_1",
              "iload_2",
              "invokestatic",
              "aload_0",
              "invokeinterface",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "goto",
              "iconst_1",
              "iload",
              "iload_3",
              "if_icmpeq",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "context",
                "descriptor": "(ZZ)Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "code",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "output",
            "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "aload_2",
              "invokestatic",
              "getstatic",
              "iconst_1",
              "iadd",
              "putstatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "artifact",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "struct-debug-lvt-reversed",
            "className": "classes.modern_test.C7dStructuralDebugReversed",
            "major": 69,
            "definition": "never-define",
            "verification": "nonempty-even-DROP_DEBUG"
          },
          {
            "id": "struct-debug-lvt-terminal-zero",
            "className": "classes.modern_test.C7dStructuralDebugTerminal",
            "major": 69,
            "definition": "never-define",
            "verification": "nonempty-even-DROP_DEBUG"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-struct-debug-slots",
        "entryMethod": "caseSlots",
        "entryDescriptor": "()V",
        "trace": [
          "factory=-1/65536-rejected;raw-slot65535-and-J-at-last-slot=retained;selected-library-verify=empty;unsafe-metadata-never-defined"
        ],
        "probes": [
          {
            "method": "caseSlots",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "astore_0",
              "iconst_3",
              "invokestatic",
              "astore_1",
              "iconst_4",
              "astore_2",
              "aload_1",
              "invokeinterface",
              "invokevirtual",
              "checkcast",
              "iconst_0",
              "astore_3",
              "aload_2",
              "astore",
              "aload_3",
              "ldc",
              "if_icmpne",
              "aload",
              "iconst_1",
              "getstatic",
              "ifeq",
              "goto",
              "aload_0",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "build",
                "descriptor": "(Ljava/lang/String;I)[B"
              },
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
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "code",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.classfile.Attributes",
                "name": "localVariableTable",
                "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "findAttribute",
                "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.LocalVariableTableAttribute"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableTableAttribute",
                "name": "localVariables",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.LocalVariableInfo"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableInfo",
                "name": "slot",
                "descriptor": "()I"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableInfo",
                "name": "typeSymbol",
                "descriptor": "()Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "java.lang.constant.ConstantDescs",
                "name": "CD_long",
                "descriptor": "Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "equals",
                "descriptor": "(Ljava/lang/Object;)Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "verify",
                "descriptor": "([BZZZ)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "output",
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
        ],
        "callbackMethods": [
          {
            "method": "check",
            "descriptor": "(Z)V",
            "requiredOpcodes": [
              "iload_0",
              "invokestatic",
              "getstatic",
              "iconst_1",
              "iadd",
              "putstatic",
              "return"
            ],
            "symbolicOperands": [
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
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "checks",
                "descriptor": "I"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "checks",
                "descriptor": "I"
              }
            ]
          },
          {
            "method": "build",
            "descriptor": "(Ljava/lang/String;I)[B",
            "requiredOpcodes": [
              "iload_1",
              "putstatic",
              "invokestatic",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "recipe",
                "descriptor": "I"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              }
            ]
          },
          {
            "method": "code",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "iconst_0",
              "checkcast",
              "invokevirtual",
              "areturn"
            ],
            "symbolicOperands": [
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
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.CodeAttribute"
              }
            ]
          },
          {
            "method": "verify",
            "descriptor": "([BZZZ)V",
            "requiredOpcodes": [
              "iload_1",
              "iload_2",
              "invokestatic",
              "astore",
              "aload",
              "aload_0",
              "invokeinterface",
              "iload_3",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "ifeq",
              "checkcast",
              "invokevirtual",
              "ldc",
              "if_acmpne",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "context",
                "descriptor": "(ZZ)Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Object",
                "name": "getClass",
                "descriptor": "()Ljava/lang/Class;"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.VerifyError"
              }
            ]
          },
          {
            "method": "output",
            "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "aload_2",
              "invokestatic",
              "getstatic",
              "iconst_1",
              "iadd",
              "putstatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "artifact",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "struct-debug-slot65535",
            "className": "classes.modern_test.C7dStructuralDebugSlots",
            "major": 69,
            "definition": "never-define",
            "verification": "empty-byte-model"
          },
          {
            "id": "struct-debug-wide-last-slot",
            "className": "classes.modern_test.C7dStructuralDebugWideSlot",
            "major": 69,
            "definition": "never-define",
            "verification": "empty-byte-model"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-struct-debug-type-text",
        "entryMethod": "caseTypeText",
        "entryDescriptor": "()V",
        "trace": [
          "raw-LVT=(I)I;raw-LVTT=!;selected-library-verify=empty;explicit-symbol-access=IAE;unsafe-metadata-never-defined"
        ],
        "probes": [
          {
            "method": "caseTypeText",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "astore_0",
              "iconst_5",
              "invokestatic",
              "astore_1",
              "aload_1",
              "astore_2",
              "aload_2",
              "invokeinterface",
              "invokevirtual",
              "checkcast",
              "iconst_0",
              "astore_3",
              "aload_3",
              "ldc",
              "ifeq",
              "iconst_1",
              "goto",
              "istore",
              "pop",
              "astore",
              "aload",
              "instanceof",
              "iload",
              "aload_0",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "build",
                "descriptor": "(Ljava/lang/String;I)[B"
              },
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
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "code",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.lang.classfile.Attributes",
                "name": "localVariableTable",
                "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "findAttribute",
                "descriptor": "(Ljava/lang/classfile/AttributeMapper;)Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.LocalVariableTableAttribute"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableTableAttribute",
                "name": "localVariables",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.LocalVariableInfo"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableInfo",
                "name": "type",
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
                "name": "localVariableTypeTable",
                "descriptor": "()Ljava/lang/classfile/AttributeMapper;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.LocalVariableTypeTableAttribute"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableTypeTableAttribute",
                "name": "localVariableTypes",
                "descriptor": "()Ljava/util/List;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.LocalVariableTypeInfo"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableTypeInfo",
                "name": "signature",
                "descriptor": "()Ljava/lang/classfile/constantpool/Utf8Entry;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "verify",
                "descriptor": "([BZZZ)V"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.LocalVariableInfo",
                "name": "typeSymbol",
                "descriptor": "()Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "instanceof",
                "tag": 7,
                "value": "java.lang.classfile.instruction.LocalVariableType"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.instruction.LocalVariableType"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.instruction.LocalVariableType",
                "name": "signatureSymbol",
                "descriptor": "()Ljava/lang/classfile/Signature;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "output",
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
        ],
        "callbackMethods": [
          {
            "method": "check",
            "descriptor": "(Z)V",
            "requiredOpcodes": [
              "iload_0",
              "invokestatic",
              "getstatic",
              "iconst_1",
              "iadd",
              "putstatic",
              "return"
            ],
            "symbolicOperands": [
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
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "checks",
                "descriptor": "I"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "checks",
                "descriptor": "I"
              }
            ]
          },
          {
            "method": "build",
            "descriptor": "(Ljava/lang/String;I)[B",
            "requiredOpcodes": [
              "iload_1",
              "putstatic",
              "invokestatic",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "recipe",
                "descriptor": "I"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              }
            ]
          },
          {
            "method": "code",
            "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokeinterface",
              "iconst_0",
              "checkcast",
              "invokevirtual",
              "areturn"
            ],
            "symbolicOperands": [
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
                "owner": "java.util.List",
                "name": "get",
                "descriptor": "(I)Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.MethodModel"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.MethodModel",
                "name": "code",
                "descriptor": "()Ljava/util/Optional;"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.util.Optional",
                "name": "get",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.attribute.CodeAttribute"
              }
            ]
          },
          {
            "method": "verify",
            "descriptor": "([BZZZ)V",
            "requiredOpcodes": [
              "iload_1",
              "iload_2",
              "invokestatic",
              "astore",
              "aload",
              "aload_0",
              "invokeinterface",
              "iload_3",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "ifeq",
              "checkcast",
              "invokevirtual",
              "ldc",
              "if_acmpne",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "context",
                "descriptor": "(ZZ)Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Object",
                "name": "getClass",
                "descriptor": "()Ljava/lang/Class;"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.VerifyError"
              }
            ]
          },
          {
            "method": "output",
            "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "aload_2",
              "invokestatic",
              "getstatic",
              "iconst_1",
              "iadd",
              "putstatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "artifact",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "struct-debug-type-text",
            "className": "classes.modern_test.C7dStructuralDebugTypeText",
            "major": 69,
            "definition": "never-define",
            "verification": "empty-byte-model"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-struct-debug-local-type-ranges",
        "entryMethod": "caseLocalTypeRanges",
        "entryDescriptor": "()V",
        "trace": [
          "LVTT/CRT-out-of-range=PASS-reject/DROP-accept-raw-retained;LVTT-operand/CRT-reversed-in-range=library-accepted;unsafe-metadata-never-defined"
        ],
        "probes": [
          {
            "method": "caseLocalTypeRanges",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "astore_0",
              "iconst_0",
              "invokestatic",
              "astore_1",
              "aload_1",
              "iconst_2",
              "bipush",
              "astore_2",
              "iconst_4",
              "astore_3",
              "astore",
              "iconst_5",
              "aload_2",
              "aload_3",
              "aload",
              "invokeinterface",
              "ifeq",
              "checkcast",
              "iconst_1",
              "goto",
              "aload_0",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "build",
                "descriptor": "(Ljava/lang/String;I)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "mutate",
                "descriptor": "([BLjava/lang/String;III)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.util.List",
                "name": "of",
                "descriptor": "(Ljava/lang/Object;Ljava/lang/Object;Ljava/lang/Object;Ljava/lang/Object;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "verify",
                "descriptor": "([BZZZ)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "traversal",
                "descriptor": "([BZZZ)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "output",
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
        ],
        "callbackMethods": [
          {
            "method": "build",
            "descriptor": "(Ljava/lang/String;I)[B",
            "requiredOpcodes": [
              "iload_1",
              "putstatic",
              "invokestatic",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "recipe",
                "descriptor": "I"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              }
            ]
          },
          {
            "method": "verify",
            "descriptor": "([BZZZ)V",
            "requiredOpcodes": [
              "iload_1",
              "iload_2",
              "invokestatic",
              "astore",
              "aload",
              "aload_0",
              "invokeinterface",
              "iload_3",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "ifeq",
              "checkcast",
              "invokevirtual",
              "ldc",
              "if_acmpne",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "context",
                "descriptor": "(ZZ)Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Object",
                "name": "getClass",
                "descriptor": "()Ljava/lang/Class;"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.VerifyError"
              }
            ]
          },
          {
            "method": "traversal",
            "descriptor": "([BZZZ)V",
            "requiredOpcodes": [
              "iconst_0",
              "istore",
              "iload_1",
              "iload_2",
              "invokestatic",
              "aload_0",
              "invokeinterface",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "goto",
              "iconst_1",
              "iload",
              "iload_3",
              "if_icmpeq",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "context",
                "descriptor": "(ZZ)Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "code",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "output",
            "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "aload_2",
              "invokestatic",
              "getstatic",
              "iconst_1",
              "iadd",
              "putstatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "artifact",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              }
            ]
          },
          {
            "method": "mutate",
            "descriptor": "([BLjava/lang/String;III)[B",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokestatic",
              "iload_2",
              "iadd",
              "istore",
              "iconst_2",
              "if_icmplt",
              "iconst_1",
              "iand",
              "ifne",
              "iload",
              "iload_3",
              "if_icmpne",
              "iflt",
              "ldc",
              "if_icmpgt",
              "if_icmpeq",
              "goto",
              "iconst_0",
              "invokevirtual",
              "checkcast",
              "astore",
              "aload",
              "bipush",
              "iushr",
              "i2b",
              "bastore",
              "arraylength",
              "if_icmpge",
              "baload",
              "iinc",
              "ifeq",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "payload",
                "descriptor": "([BLjava/lang/String;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "u2",
                "descriptor": "([BI)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "require",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "[B",
                "name": "clone",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.util.Arrays",
                "name": "equals",
                "descriptor": "([B[B)Z"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "struct-debug-lvtt-start-past",
            "className": "classes.modern_test.C7dStructuralDebugLocalRanges",
            "major": 69,
            "definition": "never-define",
            "verification": "PASS_DEBUG-nonempty-DROP_DEBUG-empty"
          },
          {
            "id": "struct-debug-lvtt-end-past",
            "className": "classes.modern_test.C7dStructuralDebugLocalRanges",
            "major": 69,
            "definition": "never-define",
            "verification": "PASS_DEBUG-nonempty-DROP_DEBUG-empty"
          },
          {
            "id": "struct-debug-lvtt-operand",
            "className": "classes.modern_test.C7dStructuralDebugLocalRanges",
            "major": 69,
            "definition": "never-define",
            "verification": "empty-byte-model"
          },
          {
            "id": "struct-debug-crt-start-past",
            "className": "classes.modern_test.C7dStructuralDebugLocalRanges",
            "major": 69,
            "definition": "never-define",
            "verification": "PASS_DEBUG-nonempty-DROP_DEBUG-empty"
          },
          {
            "id": "struct-debug-crt-end-past",
            "className": "classes.modern_test.C7dStructuralDebugLocalRanges",
            "major": 69,
            "definition": "never-define",
            "verification": "PASS_DEBUG-nonempty-DROP_DEBUG-empty"
          },
          {
            "id": "struct-debug-crt-reversed-in-range",
            "className": "classes.modern_test.C7dStructuralDebugLocalRanges",
            "major": 69,
            "definition": "never-define",
            "verification": "empty-byte-model"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      },
      {
        "id": "cf-struct-debug-line-ranges",
        "entryMethod": "caseLines",
        "entryDescriptor": "()V",
        "trace": [
          "LNT-operand/terminal=library-accepted;past=PASS-reject/DROP-accept-raw-retained;unsafe-metadata-never-defined"
        ],
        "probes": [
          {
            "method": "caseLines",
            "descriptor": "()V",
            "requiredOpcodes": [
              "ldc_w",
              "astore_0",
              "iconst_0",
              "invokestatic",
              "astore_1",
              "aload_1",
              "iconst_2",
              "astore_2",
              "bipush",
              "astore_3",
              "astore",
              "aload_2",
              "iconst_1",
              "aload_3",
              "aload",
              "aload_0",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "build",
                "descriptor": "(Ljava/lang/String;I)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "mutate",
                "descriptor": "([BLjava/lang/String;III)[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "verify",
                "descriptor": "([BZZZ)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "traversal",
                "descriptor": "([BZZZ)V"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "output",
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
        ],
        "callbackMethods": [
          {
            "method": "build",
            "descriptor": "(Ljava/lang/String;I)[B",
            "requiredOpcodes": [
              "iload_1",
              "putstatic",
              "invokestatic",
              "aload_0",
              "invokedynamic",
              "invokeinterface",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "recipe",
                "descriptor": "I"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "of",
                "descriptor": "()Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokestatic",
                "tag": 11,
                "owner": "java.lang.constant.ClassDesc",
                "name": "of",
                "descriptor": "(Ljava/lang/String;)Ljava/lang/constant/ClassDesc;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "build",
                "descriptor": "(Ljava/lang/constant/ClassDesc;Ljava/util/function/Consumer;)[B"
              }
            ]
          },
          {
            "method": "verify",
            "descriptor": "([BZZZ)V",
            "requiredOpcodes": [
              "iload_1",
              "iload_2",
              "invokestatic",
              "astore",
              "aload",
              "aload_0",
              "invokeinterface",
              "iload_3",
              "if_icmpne",
              "iconst_1",
              "goto",
              "iconst_0",
              "ifeq",
              "checkcast",
              "invokevirtual",
              "ldc",
              "if_acmpne",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "context",
                "descriptor": "(ZZ)Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.ClassFile",
                "name": "verify",
                "descriptor": "([B)Ljava/util/List;"
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
                "descriptor": "(Ljava/lang/classfile/ClassModel;)Ljava/util/List;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "isEmpty",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.List",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.VerifyError"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "java.lang.Object",
                "name": "getClass",
                "descriptor": "()Ljava/lang/Class;"
              },
              {
                "opcode": "ldc",
                "tag": 7,
                "value": "java.lang.VerifyError"
              }
            ]
          },
          {
            "method": "traversal",
            "descriptor": "([BZZZ)V",
            "requiredOpcodes": [
              "iconst_0",
              "istore",
              "iload_1",
              "iload_2",
              "invokestatic",
              "aload_0",
              "invokeinterface",
              "astore",
              "aload",
              "ifeq",
              "checkcast",
              "goto",
              "iconst_1",
              "iload",
              "iload_3",
              "if_icmpeq",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "context",
                "descriptor": "(ZZ)Ljava/lang/classfile/ClassFile;"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "code",
                "descriptor": "(Ljava/lang/classfile/ClassFile;[B)Ljava/lang/classfile/attribute/CodeAttribute;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.lang.classfile.attribute.CodeAttribute",
                "name": "iterator",
                "descriptor": "()Ljava/util/Iterator;"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "hasNext",
                "descriptor": "()Z"
              },
              {
                "opcode": "invokeinterface",
                "tag": 11,
                "owner": "java.util.Iterator",
                "name": "next",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "java.lang.classfile.CodeElement"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "check",
                "descriptor": "(Z)V"
              }
            ]
          },
          {
            "method": "output",
            "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "aload_2",
              "invokestatic",
              "getstatic",
              "iconst_1",
              "iadd",
              "putstatic",
              "return"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileSupport",
                "name": "artifact",
                "descriptor": "(Ljava/lang/String;Ljava/lang/String;[B)V"
              },
              {
                "opcode": "getstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              },
              {
                "opcode": "putstatic",
                "tag": 9,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "artifacts",
                "descriptor": "I"
              }
            ]
          },
          {
            "method": "mutate",
            "descriptor": "([BLjava/lang/String;III)[B",
            "requiredOpcodes": [
              "aload_0",
              "aload_1",
              "invokestatic",
              "iload_2",
              "iadd",
              "istore",
              "iconst_2",
              "if_icmplt",
              "iconst_1",
              "iand",
              "ifne",
              "iload",
              "iload_3",
              "if_icmpne",
              "iflt",
              "ldc",
              "if_icmpgt",
              "if_icmpeq",
              "goto",
              "iconst_0",
              "invokevirtual",
              "checkcast",
              "astore",
              "aload",
              "bipush",
              "iushr",
              "i2b",
              "bastore",
              "arraylength",
              "if_icmpge",
              "baload",
              "iinc",
              "ifeq",
              "areturn"
            ],
            "symbolicOperands": [
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "payload",
                "descriptor": "([BLjava/lang/String;)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "u2",
                "descriptor": "([BI)I"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "classes.modern_test.ClassFileStructuralDebugFinal",
                "name": "require",
                "descriptor": "(Z)V"
              },
              {
                "opcode": "invokevirtual",
                "tag": 10,
                "owner": "[B",
                "name": "clone",
                "descriptor": "()Ljava/lang/Object;"
              },
              {
                "opcode": "checkcast",
                "tag": 7,
                "value": "[B"
              },
              {
                "opcode": "invokestatic",
                "tag": 10,
                "owner": "java.util.Arrays",
                "name": "equals",
                "descriptor": "([B[B)Z"
              }
            ]
          }
        ],
        "artifacts": [
          {
            "id": "struct-debug-lnt-operand",
            "className": "classes.modern_test.C7dStructuralDebugLines",
            "major": 69,
            "definition": "never-define",
            "verification": "empty-byte-model"
          },
          {
            "id": "struct-debug-lnt-terminal",
            "className": "classes.modern_test.C7dStructuralDebugLines",
            "major": 69,
            "definition": "never-define",
            "verification": "empty-byte-model"
          },
          {
            "id": "struct-debug-lnt-past",
            "className": "classes.modern_test.C7dStructuralDebugLines",
            "major": 69,
            "definition": "never-define",
            "verification": "PASS_LINES-nonempty-DROP_LINES-empty"
          }
        ],
        "oracleKind": "pinned-native-regression",
        "anchors": {
          "JVMS": [
            "4.7.3",
            "4.7.12",
            "4.7.13",
            "4.7.14",
            "4.9.2"
          ]
        },
        "primarySources": [
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/ClassFile.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/CodeModel.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/instruction/DiscontinuedInstruction.html",
          "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/attribute/LocalVariableTableAttribute.html"
        ],
        "limitations": [
          "Finite selected Java25 public structural verifier profile, not full verifier/version/opcode/API conformance.",
          "Genuine unchanged stockjavac25 original inputs are naturalmajor69; selected old-major outputs are public-builder recipes, never rewritten compiler headers.",
          "Each eligible output is defined and invoked from its own bytes on the same producing host; malformed and unsafe metadata arrays are never defined, even when selected library verification accepts.",
          "Major49/50 inference verification is explicitly unsupported by the selected native library; JVM execution is a separate verdict.",
          "Exact named helper and own-array static bindings are finite evidence, not general interprocedural dataflow, branch coverage or byte-for-byte native parity.",
          "All220 nominal ABI contracts and195 native sealing topology are independent; target9 facades do not prove sealing or named-module runtime."
        ]
      }
    ]
  }
]);

